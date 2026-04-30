// Lightweight username/password auth for the Mishpacha PWA.
// Backed by Supabase RPCs (auth_register_user / auth_login_user / auth_change_password)
// with bcrypt password hashing in pgcrypto. See db migration:
// `app_users_auth_lightweight` in shared Supabase project krmlzwwelqvlfslwltol.
//
// Design notes:
//   - The logged-in `username` IS the cloud uid (replaces random per-device IDs).
//     This means a user's leaderboard row + cloud backup follow them across phones.
//   - Existing random-uid users keep working as "guests" (zero migration).
//   - All RPCs take `apikey` + `Authorization: Bearer SUPA_ANON`.
//     SECURITY DEFINER + RLS-enabled-no-policies on app_users mean direct table access
//     is denied even with the publishable key; only the RPCs can read/write.
//   - Logout clears the auth profile and regenerates a fresh random guest uid so the
//     next session starts clean (does not bleed back into the previous account).

import { SUPA_URL, SUPA_ANON } from '../core/constants.js';
import { sanitize, toast } from '../core/utils.js';

const AUTH_LS_KEY = 'pnimit_authUser';
const UID_LS_KEY  = 'pnimit_uid';
const DEV_LS_KEY  = 'pnimit_devid';

// ───────────────────────────── state ─────────────────────────────

/** @returns {{username:string,displayName:string|null,loggedInAt:number}|null} */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_LS_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u || typeof u !== 'object' || typeof u.username !== 'string') return null;
    if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(u.username)) return null;
    return u;
  } catch (_) { return null; }
}

export function isLoggedIn() { return !!getCurrentUser(); }

/**
 * Unified user identifier. When logged in, returns the username; otherwise a
 * stable random per-device id (backward-compat with the legacy pnimit_uid).
 * Used by leaderboard submit + cloud backup id.
 */
export function getUserId() {
  const user = getCurrentUser();
  if (user) return user.username;
  let id = localStorage.getItem(UID_LS_KEY);
  if (!id) {
    id = 'u' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(UID_LS_KEY, id);
  }
  return id;
}

// ───────────────────────── RPC plumbing ─────────────────────────

async function _rpc(fn, body) {
  const res = await fetch(SUPA_URL + '/rest/v1/rpc/' + fn, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey':       SUPA_ANON,
      'Authorization': 'Bearer ' + SUPA_ANON,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    return { ok: false, error: 'http_' + res.status, message: txt.slice(0, 200) };
  }
  const data = await res.json().catch(() => null);
  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'bad_response' };
  }
  return data;
}

// ───────────────────── auth actions (programmatic) ─────────────────────

export async function authRegister(username, password, displayName) {
  return _rpc('auth_register_user', {
    p_username: username || '',
    p_password: password || '',
    p_display_name: displayName || null,
  });
}

export async function authLogin(username, password) {
  return _rpc('auth_login_user', {
    p_username: username || '',
    p_password: password || '',
  });
}

export async function authChangePassword(username, oldPwd, newPwd) {
  return _rpc('auth_change_password', {
    p_username: username || '',
    p_old_password: oldPwd || '',
    p_new_password: newPwd || '',
  });
}

// ───────────────────────── auth events ─────────────────────────
// Lightweight pub/sub so other modules (e.g. post-login-restore) can react to
// auth state transitions without coupling to the UI layer. Modeled on the
// ward-helper subscribeAuthChanges API for cross-PWA consistency. Emits a
// CustomEvent on `window` so consumers can also listen via the DOM if they
// don't want to import this module.
//
// Action vocabulary (must stay in lockstep with sibling PWAs):
//   'login'           — interactive login with existing account
//   'register'        — new account created (also auto-logs in)
//   'logout'          — explicit user logout
//   'change-password' — password rotation while signed in
//   'unknown'         — defensive fallback; consumers should ignore

const AUTH_EVENT_NAME = 'pnimit:auth';
const _authSubs = new Set();

/**
 * @typedef {'login'|'register'|'logout'|'change-password'|'unknown'} AuthChangeAction
 */

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 * Handler is called with the action string. Errors are swallowed so a
 * misbehaving subscriber can't break sibling subscribers.
 */
export function subscribeAuthEvents(handler) {
  if (typeof handler !== 'function') return () => {};
  _authSubs.add(handler);
  return () => { _authSubs.delete(handler); };
}

function _dispatchAuthEvent(action) {
  const a = (action === 'login' || action === 'register' ||
             action === 'logout' || action === 'change-password')
            ? action : 'unknown';
  // In-process subscribers first.
  for (const fn of Array.from(_authSubs)) {
    try { fn(a); } catch (_) { /* swallow */ }
  }
  // DOM consumers (post-login-restore wires this way to stay decoupled from
  // the auth module's import graph in test environments).
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, { detail: { action: a } }));
    }
  } catch (_) { /* CustomEvent may be undefined in node; tests use the fn API */ }
}

/**
 * Persist a successful auth result to localStorage.
 * Caller is responsible for invoking this only after `result.ok === true`.
 */
export function setAuthSession(username, displayName) {
  const profile = {
    username,
    displayName: displayName || null,
    loggedInAt: Date.now(),
  };
  localStorage.setItem(AUTH_LS_KEY, JSON.stringify(profile));
  // The logged-in username becomes the cloud uid; existing leaderboard/backup
  // queries that read pnimit_uid pick this up transparently.
  localStorage.setItem(UID_LS_KEY, username);
  // Refresh the header chip if it's mounted — happens before render() can fire.
  if (typeof window.updateAccountChip === 'function') window.updateAccountChip();
  return profile;
}

/**
 * Clear auth + regenerate a fresh random guest uid. The old guest uid is dropped
 * so no data is silently shared between accounts on the same device.
 */
export function logout() {
  localStorage.removeItem(AUTH_LS_KEY);
  // Generate a fresh random uid; do NOT reuse a prior guest uid.
  const id = 'u' + Math.random().toString(36).slice(2, 10);
  localStorage.setItem(UID_LS_KEY, id);
  // Same for device id used by cloud backup (so a logout doesn't accidentally write
  // user data to an old device row).
  localStorage.setItem(DEV_LS_KEY, 'dev_' + Math.random().toString(36).slice(2, 12));
  // Refresh the header chip — render() will follow but we don't want a stale
  // initial visible during the brief gap.
  if (typeof window.updateAccountChip === 'function') window.updateAccountChip();
}

// ───────────────────────────── UI ─────────────────────────────

/**
 * Renders the auth section embedded inside the Settings panel.
 * Logged-in: shows current account + logout + change password.
 * Logged-out: shows sign-in / register tabs.
 */
export function renderAuthSection() {
  const user = getCurrentUser();
  if (user) {
    return `
<div class="sec-t" style="font-size:13px;margin-top:18px">👤 חשבון</div>
<div style="padding:14px;background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;margin-bottom:12px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
    <div style="width:36px;height:36px;border-radius:50%;background:#0891b2;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${sanitize((user.displayName || user.username).slice(0,1).toUpperCase())}</div>
    <div style="flex:1;min-width:0">
      <div style="font-size:12px;font-weight:700;color:#0c4a6e;direction:ltr;text-align:left">${sanitize(user.displayName || user.username)}</div>
      <div style="font-size:10px;color:#64748b;direction:ltr;text-align:left">@${sanitize(user.username)}</div>
    </div>
  </div>
  <div style="display:flex;gap:6px;flex-wrap:wrap">
    <button class="btn" data-action="auth-change-pwd" style="flex:1;font-size:10px;background:#f0f9ff;color:#075985;border:1px solid #bae6fd;min-height:36px">🔑 שנה סיסמה</button>
    <button class="btn" data-action="auth-logout" style="flex:1;font-size:10px;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;min-height:36px">🚪 התנתק</button>
  </div>
  <div style="font-size:10px;color:#64748b;margin-top:8px;line-height:1.5">
    ההתקדמות שלך, הציון בלוח התוצאות והגיבוי בענן קשורים לחשבון הזה. אפשר להתחבר באותו שם משתמש מכל מכשיר.
  </div>
</div>`;
  }

  // Logged-out
  return `
<div class="sec-t" style="font-size:13px;margin-top:18px">👤 חשבון</div>
<div style="padding:14px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:12px">
  <div style="font-size:11px;color:#475569;margin-bottom:10px;line-height:1.6">
    התחבר כדי לסנכרן התקדמות בין מכשירים. <strong>אין חובה</strong> — אפשר להמשיך כאורח כרגיל.
  </div>
  <div style="display:flex;gap:0;background:#f1f5f9;padding:3px;border-radius:10px;margin-bottom:10px" id="auth-tabs">
    <button class="btn" data-action="auth-tab-login"    style="flex:1;font-size:11px;min-height:34px;background:#fff;color:#0f172a;border-radius:8px;font-weight:700">התחברות</button>
    <button class="btn" data-action="auth-tab-register" style="flex:1;font-size:11px;min-height:34px;background:transparent;color:#64748b;border:none;border-radius:8px">הרשמה</button>
  </div>
  <div id="auth-form-login">
    <input id="auth-li-user" placeholder="שם משתמש" autocomplete="username"
      style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;margin-bottom:6px;direction:ltr;text-align:left;font-family:inherit">
    <input id="auth-li-pwd" type="password" placeholder="סיסמה" autocomplete="current-password"
      style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;margin-bottom:8px;direction:ltr;text-align:left;font-family:inherit">
    <button class="btn btn-p" data-action="auth-do-login" style="width:100%;font-size:12px;min-height:42px;font-weight:700">🔓 התחבר</button>
  </div>
  <div id="auth-form-register" style="display:none">
    <input id="auth-rg-user" placeholder="שם משתמש (3-32 תווים, אנגלית קטנה+מספרים)" autocomplete="username"
      style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;margin-bottom:6px;direction:ltr;text-align:left;font-family:inherit">
    <input id="auth-rg-pwd" type="password" placeholder="סיסמה (לפחות 6 תווים)" autocomplete="new-password"
      style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;margin-bottom:6px;direction:ltr;text-align:left;font-family:inherit">
    <input id="auth-rg-name" placeholder="שם להצגה (אופציונלי)" autocomplete="name"
      style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;margin-bottom:8px;direction:rtl;text-align:right;font-family:inherit">
    <button class="btn btn-p" data-action="auth-do-register" style="width:100%;font-size:12px;min-height:42px;font-weight:700">✨ צור חשבון</button>
  </div>
  <div id="auth-status" style="font-size:11px;margin-top:10px;text-align:center;min-height:16px"></div>
</div>`;
}

// ───────────────────────── UI event handlers ─────────────────────────

function _setStatus(msg, tone) {
  const el = document.getElementById('auth-status');
  if (!el) return;
  el.textContent = msg || '';
  el.style.color = tone === 'error'   ? '#991b1b'
                  : tone === 'success' ? '#059669'
                  : '#64748b';
}

function _switchTab(which) {
  const tabs = document.getElementById('auth-tabs');
  if (!tabs) return;
  const isLogin = which === 'login';
  const li = document.getElementById('auth-form-login');
  const rg = document.getElementById('auth-form-register');
  if (li) li.style.display = isLogin ? '' : 'none';
  if (rg) rg.style.display = isLogin ? 'none' : '';
  // Also restyle tab buttons
  Array.from(tabs.querySelectorAll('button')).forEach((b) => {
    const target = b.dataset.action || '';
    const active = (target === 'auth-tab-login'    && isLogin) ||
                   (target === 'auth-tab-register' && !isLogin);
    b.style.background = active ? '#fff' : 'transparent';
    b.style.color      = active ? '#0f172a' : '#64748b';
    b.style.fontWeight = active ? '700' : '400';
  });
  _setStatus('');
}

async function _handleLogin() {
  const u = (document.getElementById('auth-li-user') || {}).value || '';
  const p = (document.getElementById('auth-li-pwd')  || {}).value || '';
  if (!u || !p) { _setStatus('נא למלא שם משתמש וסיסמה', 'error'); return; }
  _setStatus('מתחבר…');
  const r = await authLogin(u, p);
  if (!r.ok) {
    const map = {
      invalid_credentials: 'שם משתמש או סיסמה שגויים',
      locked: 'יותר מדי ניסיונות כושלים. נסה שוב בעוד 15 דקות.',
      bad_response: 'שגיאת רשת — נסה שוב',
    };
    _setStatus(map[r.error] || r.message || ('שגיאה: ' + r.error), 'error');
    return;
  }
  setAuthSession(r.username, r.display_name);
  _dispatchAuthEvent('login');
  toast('✅ התחברת בהצלחה: ' + (r.display_name || r.username), 'success');
  // Re-render so settings panel reflects logged-in state.
  if (window.G && typeof window.G.render === 'function') window.G.render();
}

async function _handleRegister() {
  const u = (document.getElementById('auth-rg-user') || {}).value || '';
  const p = (document.getElementById('auth-rg-pwd')  || {}).value || '';
  const n = (document.getElementById('auth-rg-name') || {}).value || '';
  if (!u || !p) { _setStatus('שם משתמש וסיסמה הם שדות חובה', 'error'); return; }
  _setStatus('יוצר חשבון…');
  const r = await authRegister(u, p, n);
  if (!r.ok) {
    const map = {
      invalid_username: 'שם משתמש לא חוקי (3-32 תווים, אותיות אנגלית קטנות, מספרים, מקף ותחתון)',
      weak_password: 'סיסמה צריכה להיות לפחות 6 תווים',
      username_taken: 'שם המשתמש כבר תפוס',
      bad_response: 'שגיאת רשת — נסה שוב',
    };
    _setStatus(map[r.error] || r.message || ('שגיאה: ' + r.error), 'error');
    return;
  }
  // Auto-login after register (the RPC already verifies password hash).
  setAuthSession(r.username, r.display_name);
  _dispatchAuthEvent('register');
  toast('✅ נוצר חשבון בהצלחה: ' + (r.display_name || r.username), 'success');
  if (window.G && typeof window.G.render === 'function') window.G.render();
}

async function _handleChangePassword() {
  const user = getCurrentUser();
  if (!user) return;
  const oldPwd = window.prompt('הקלד את הסיסמה הנוכחית:');
  if (!oldPwd) return;
  const newPwd = window.prompt('הקלד סיסמה חדשה (לפחות 6 תווים):');
  if (!newPwd) return;
  const r = await authChangePassword(user.username, oldPwd, newPwd);
  if (r.ok) {
    _dispatchAuthEvent('change-password');
    toast('✅ הסיסמה שונתה', 'success');
  } else {
    const map = {
      invalid_credentials: 'הסיסמה הנוכחית שגויה',
      weak_password: 'הסיסמה החדשה קצרה מדי',
    };
    toast('❌ ' + (map[r.error] || r.message || r.error), 'info');
  }
}

function _handleLogout() {
  if (!window.confirm('להתנתק? ההתקדמות שלך נשמרת בענן ותחזור בהתחברות הבאה.')) return;
  logout();
  _dispatchAuthEvent('logout');
  toast('הותנתקת', 'info');
  if (window.G && typeof window.G.render === 'function') window.G.render();
}

/**
 * Wires up all auth-related click handlers. Call from initMoreEvents()
 * after each render of the settings panel.
 */
export function bindAuthEvents() {
  // Single delegated handler so this is safe to call repeatedly without
  // accumulating listeners (we attach to document and short-circuit on data-action).
  if (window.__authBound) return;
  window.__authBound = true;
  document.addEventListener('click', (e) => {
    const t = e.target && e.target.closest && e.target.closest('[data-action]');
    if (!t) return;
    const a = t.dataset.action;
    switch (a) {
      case 'auth-tab-login':    _switchTab('login');    break;
      case 'auth-tab-register': _switchTab('register'); break;
      case 'auth-do-login':     _handleLogin();         break;
      case 'auth-do-register':  _handleRegister();      break;
      case 'auth-change-pwd':   _handleChangePassword();break;
      case 'auth-logout':       _handleLogout();        break;
      default: return;
    }
  });
}
