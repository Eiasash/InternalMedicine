// Settings overlay — modal opened via the ⚙️ gear button in the header.
// Lives outside #ct (in <div id="settings-overlay"> in pnimit-mega.html) so
// it survives G.render() innerHTML resets. Holds: Account, Theme, API key,
// Data, Feedback, About — the items that previously lived in More→Settings.
//
// PR #68 of the v9.95→10.0 overhaul. Future PRs (#69 Drug/Calc removal, #70
// Library merge) reduce the More tab to nothing once these items live here.
import G from '../core/globals.js';
import { sanitize, getApiKey, setApiKey, toast } from '../core/utils.js';
import { APP_VERSION, BUILD_HASH, LS, SUPA_URL, SUPA_ANON } from '../core/constants.js';
import { renderAuthSection, bindAuthEvents } from '../features/auth.js';
import { getCurrentUser } from '../features/auth.js';
import { renderStudyPlanSection, bindStudyPlanEvents } from '../features/study_plan/index.js';

let _escBound = false;
let _bodyBound = false;

// FSRS reminder support (moved from more-view.js in v10.3.0 consolidation).
// Module-level cache: Notification API support cannot change after page load.
const _notifSupported = typeof Notification !== 'undefined';

export function isSettingsOpen() {
  const overlay = document.getElementById('settings-overlay');
  return !!overlay && !overlay.hidden;
}

export function openSettings() {
  const overlay = document.getElementById('settings-overlay');
  if (!overlay) return;
  overlay.innerHTML = renderSettingsBody();
  overlay.hidden = false;
  document.body.classList.add('settings-open');
  // Focus the close button so ESC/keyboard users have a clear handle.
  const closeBtn = overlay.querySelector('[data-action="close-settings"]');
  if (closeBtn) closeBtn.focus();
  // Bind study-plan handlers (idempotent — doc-level click guarded by
  // window.__studyPlanBound; slider labels rebind per render via dataset flag).
  bindStudyPlanEvents();
}

export function closeSettings() {
  const overlay = document.getElementById('settings-overlay');
  if (!overlay) return;
  overlay.hidden = true;
  overlay.innerHTML = '';
  document.body.classList.remove('settings-open');
  // Return focus to the gear so screen-reader users don't lose context.
  const gear = document.querySelector('[data-action="open-settings"]');
  if (gear) gear.focus();
}

// Re-render in place (e.g. after login/logout, theme toggle, API key save).
export function refreshSettings() {
  if (!isSettingsOpen()) return;
  const overlay = document.getElementById('settings-overlay');
  overlay.innerHTML = renderSettingsBody();
  // Slider labels need rebinding because innerHTML wiped the prior listeners.
  bindStudyPlanEvents();
}

// Render the FSRS reminder card (state derivation + HTML). Logic moved
// verbatim from more-view.js:107-145 in v10.3.0 consolidation; toggleNotifOptIn
// below is the state-mutation half. Returns inner HTML — caller wraps in
// <section class="settings-section">.
function _renderNotifSection() {
  const optIn = !!G.S.notifOptIn;
  const browserPerm = _notifSupported ? Notification.permission : 'unsupported';
  const canToggle = _notifSupported && browserPerm !== 'denied';

  let permHint = '';
  if (!_notifSupported) {
    permHint = '<div style="font-size:10px;color:#94a3b8;margin-top:6px">הדפדפן לא תומך בהתראות.</div>';
  } else if (browserPerm === 'denied') {
    permHint = '<div style="font-size:10px;color:#dc2626;margin-top:6px">ההרשאה נחסמה בדפדפן. פתח הגדרות אתר כדי לאפשר מחדש.</div>';
  } else if (optIn && browserPerm === 'granted') {
    permHint = '<div style="font-size:10px;color:#059669;margin-top:6px">✓ תזכורת תישלח בשעה 07:00 כשיש שאלות לחזרה.</div>';
  } else if (optIn && browserPerm !== 'granted') {
    permHint = '<div style="font-size:10px;color:#b45309;margin-top:6px">ההרשאה טרם ניתנה — לחץ שוב כדי לבקש.</div>';
  }

  return `
      <div class="sec-t" style="font-size:13px">🔔 Reminders</div>
      <div class="sec-s" style="margin-bottom:10px">תזכורות יומיות לחזרה מרווחת (FSRS)</div>
      <div class="card" style="padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">🔔 תזכורות חזרה יומיות</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px;line-height:1.5">
            התראה יומית ב-07:00 אם יש שאלות מוכנות לחזרה.
          </div>
          ${permHint}
        </div>
        <button data-action="settings-toggle-notif-opt-in"
                ${canToggle ? '' : 'disabled'}
                aria-pressed="${optIn}"
                style="background:${optIn ? '#059669' : '#cbd5e1'};color:#fff;border:none;border-radius:999px;padding:6px 14px;font-size:11px;font-weight:700;cursor:${canToggle ? 'pointer' : 'not-allowed'};opacity:${canToggle ? '1' : '.5'}">
          ${optIn ? 'פעיל' : 'כבוי'}
        </button>
      </div>`;
}

function renderSettingsBody() {
  const isDark = document.body.classList.contains('dark');
  const storedKey = getApiKey();
  const buildDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return `
<div class="settings-backdrop" data-action="close-settings" aria-hidden="true"></div>
<div class="settings-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
  <div class="settings-header">
    <h2 id="settings-title">⚙️ Settings</h2>
    <button class="settings-close" data-action="close-settings" aria-label="סגור הגדרות">✕</button>
  </div>
  <div class="settings-body">

    <section class="settings-section">
      <div class="sec-t" style="font-size:13px">👤 חשבון לגיבוי לענן</div>
      <div class="sec-s" style="margin-bottom:6px">Account (for cloud backup)</div>
      ${renderAuthSection()}
    </section>

    <section class="settings-section">
      ${renderStudyPlanSection()}
    </section>

    <section class="settings-section">
      <div class="sec-t" style="font-size:13px">🎨 Theme</div>
      <div class="sec-s" style="margin-bottom:10px">בחירת ערכת נושא — light או dark</div>
      <div class="card" style="padding:14px;display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div style="flex:1">
          <div style="font-weight:700;font-size:13px">${isDark ? '🌙 Dark mode' : '☀️ Light mode'}</div>
          <div style="font-size:11px;color:#64748b;margin-top:4px">לחץ כדי להחליף</div>
        </div>
        <button class="btn btn-p" data-action="settings-toggle-dark" aria-pressed="${isDark}" style="font-size:11px;min-height:36px;min-width:80px">
          ${isDark ? '☀️ Light' : '🌙 Dark'}
        </button>
      </div>
    </section>

    <section class="settings-section">
      ${_renderNotifSection()}
    </section>

    <section class="settings-section">
      <div class="sec-t" style="font-size:13px">🔑 מפתח API ל-AI</div>
      <div class="sec-s" style="margin-bottom:6px">API Key (for AI features only — לא נדרש לגיבוי / not required for cloud backup)</div>
      <div class="sec-s" style="margin-bottom:10px">Anthropic API key — מאוחסן בדפדפן בלבד</div>
      <div class="card" style="padding:14px">
        ${storedKey
          ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
               <div style="flex:1;font-size:11px;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:8px;padding:6px 10px;color:#065f46">✅ API key מוגדר (sk-...${sanitize(storedKey.slice(-6))})</div>
               <button class="btn btn-o" style="font-size:11px;min-height:36px" data-action="settings-remove-api-key" aria-label="Remove API key">הסר</button>
             </div>`
          : `<div style="padding:8px 10px;background:#ecfdf5;border:1px solid #bbf7d0;border-radius:8px;font-size:10px;color:#065f46;margin-bottom:10px">✅ AI פועל דרך proxy — לא צריך מפתח אישי. אפשר להוסיף כגיבוי. <a href="https://console.anthropic.com/keys" target="_blank" style="color:#d97706;font-weight:700">קבל מפתח ↗</a></div>
             <div style="display:flex;gap:8px;margin-bottom:8px">
               <input id="settings-api-key-input" type="password" placeholder="sk-ant-..." class="calc-in" style="flex:1;margin:0;font-size:11px" aria-label="Claude API key">
               <button class="btn btn-p" style="font-size:11px;min-height:36px" data-action="settings-save-api-key" aria-label="Save API key">שמור</button>
             </div>`}
        <div style="font-size:9px;color:#94a3b8">API key נשמר ב-localStorage בלבד · לא נשלח לשרתים של האפליקציה</div>
      </div>
    </section>

    <section class="settings-section">
      <div class="sec-t" style="font-size:13px">💾 Data</div>
      <div class="sec-s" style="margin-bottom:10px">גיבוי, שחזור וייצוא של ההתקדמות</div>
      <div class="card" style="padding:14px">
        <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap">
          <button class="btn btn-p" data-action="settings-export-progress" aria-label="Export progress">📥 ייצא התקדמות</button>
          <button class="btn btn-g" data-action="settings-import-progress" aria-label="Import progress">📤 ייבא התקדמות</button>
          <button class="btn btn-o" data-action="settings-reset-all" aria-label="Reset all data">🗑️ איפוס</button>
        </div>
        <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap;margin-top:10px">
          <button class="btn" style="background:#e0f2fe;color:#0284c7" data-action="settings-cloud-backup" aria-label="Backup to cloud">☁️ גיבוי לענן</button>
          <button class="btn" style="background:#f0fdf4;color:#15803d" data-action="settings-cloud-restore" aria-label="Restore from cloud">☁️ שחזור מהענן</button>
        </div>
        <div style="font-size:9px;color:#94a3b8;text-align:center;margin-top:8px">ההתקדמות נשמרת אוטומטית בדפדפן · גיבוי ענן לפי device ID</div>
      </div>
    </section>

    <section class="settings-section">
      <div class="sec-t" style="font-size:13px">💡 Feedback</div>
      <div class="sec-s" style="margin-bottom:10px">דיווח באג / בקשת פיצ'ר / שיפור</div>
      <div class="card" style="padding:14px">
        <select id="settings-fb-type" style="width:100%;padding:8px;border:1px solid #e2e8f0;border-radius:8px;font-size:12px;margin-bottom:8px;background:#f8fafc">
          <option value="bug">🐛 דיווח באג</option>
          <option value="feature">✨ בקשת פיצ'ר</option>
          <option value="content">📝 תיקון תוכן</option>
          <option value="ux">🎨 שיפור UX</option>
          <option value="other">💬 אחר</option>
        </select>
        <textarea id="settings-fb-text" dir="auto" placeholder="תאר את ההצעה / הבאג / השאלה..." style="width:100%;min-height:80px;padding:10px;border:1px solid #e2e8f0;border-radius:10px;font-size:12px;font-family:inherit;resize:vertical;margin-bottom:8px"></textarea>
        <button class="btn btn-p" data-action="settings-submit-feedback" style="width:100%;min-height:38px;font-size:12px;font-weight:700">📤 שלח</button>
      </div>
    </section>

    <section class="settings-section">
      <div class="sec-t" style="font-size:13px">ℹ️ About</div>
      <div class="card" style="padding:14px;text-align:center">
        <div style="font-weight:700;font-size:13px;margin-bottom:6px">Pnimit Mega</div>
        <div style="font-size:11px;color:#64748b;line-height:1.8">
          <div>v${sanitize(APP_VERSION)} · build ${sanitize(BUILD_HASH)}</div>
          <div>Israeli Internal Medicine Board Prep · P0064-2025</div>
          <div>Harrison's 22e · ${G.QZ ? G.QZ.length : '—'} Questions</div>
          <div style="margin-top:8px">${buildDate}</div>
          <div style="margin-top:8px">صدقة جارية الى من نحب</div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
          <button data-action="settings-force-update" style="font-size:10px;padding:5px 14px;background:#4f46e5;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">🔄 Force Update</button>
          <a href="https://eiasash.github.io/Geriatrics/" target="_blank" rel="noopener" style="font-size:10px;padding:5px 14px;background:#0D7377;color:#fff;border:none;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">🩺 Geriatrics →</a>
        </div>
      </div>
    </section>

  </div>
</div>`;
}

// Wire ESC + click delegation. Idempotent: safe to call once at boot.
export function bindSettingsEvents() {
  if (_escBound) return;
  _escBound = true;

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isSettingsOpen()) {
      e.preventDefault();
      closeSettings();
    }
  });

  if (_bodyBound) return;
  _bodyBound = true;
  // Auth events are bound to #ct in more-view; the overlay lives outside #ct,
  // so we re-bind here at the document level. bindAuthEvents() is idempotent
  // (uses window.__authBound), but we want the doc-level listener regardless.
  bindAuthEvents();

  document.addEventListener('click', (e) => {
    const overlay = document.getElementById('settings-overlay');
    if (!overlay || overlay.hidden) return;
    const btn = e.target.closest('[data-action]');
    if (!btn || !overlay.contains(btn)) return;
    const action = btn.dataset.action;
    handleSettingsAction(action, btn);
  });
}

async function handleSettingsAction(action, btn) {
  if (action === 'close-settings') {
    closeSettings();
    return;
  }
  if (action === 'settings-toggle-dark') {
    if (typeof window.toggleDark === 'function') window.toggleDark();
    refreshSettings();
    return;
  }
  if (action === 'settings-toggle-notif-opt-in') {
    await toggleNotifOptIn();
    refreshSettings();
    return;
  }
  if (action === 'settings-save-api-key') {
    const v = document.getElementById('settings-api-key-input')?.value?.trim();
    if (v) { setApiKey(v); toast('API key נשמר', 'success'); refreshSettings(); }
    return;
  }
  if (action === 'settings-remove-api-key') {
    setApiKey('');
    refreshSettings();
    return;
  }
  if (action === 'settings-export-progress') { window.exportProgress?.(); return; }
  if (action === 'settings-import-progress') { window.importProgress?.(); return; }
  if (action === 'settings-cloud-backup')    { window.cloudBackup?.(); return; }
  if (action === 'settings-cloud-restore')   { window.cloudRestore?.(); return; }
  if (action === 'settings-reset-all') {
    if (confirm('Reset ALL data? This cannot be undone.')) {
      localStorage.removeItem(LS); location.reload();
    }
    return;
  }
  if (action === 'settings-force-update') { window.applyUpdate?.(); return; }
  if (action === 'settings-submit-feedback') {
    submitSettingsFeedback();
    return;
  }
}

async function submitSettingsFeedback() {
  const type = document.getElementById('settings-fb-type')?.value || 'other';
  const text = document.getElementById('settings-fb-text')?.value?.trim();
  if (!text) { toast('כתוב את הפידבק', 'info'); return; }
  const user = getCurrentUser();
  const uid = user?.username || ('guest-' + (localStorage.getItem('pnimit_guest_id') || ''));
  const entry = { type, text, ts: Date.now(), version: APP_VERSION, uid };
  let fb = [];
  try { fb = JSON.parse(localStorage.getItem('pnimit_fb_sent') || '[]'); } catch (e) {}
  fb.push(entry);
  localStorage.setItem('pnimit_fb_sent', JSON.stringify(fb));
  // v10.4.12 fix — bug 3 from 2026-05-03 mobile session: POST /pnimit_feedback returned 400
  // (schema/payload mismatch). The sibling FM table (`mishpacha_feedback`) ships {type,text,ts,version,uid};
  // the prior {message,app_version} shape may not match `pnimit_feedback`'s actual columns.
  // Send BOTH shapes so whichever set the table accepts gets through; if it still 400s, surface a toast.
  let _fbOk = true;
  try {
    const payload = {
      // Sibling-canonical column names (matches mishpacha_feedback schema):
      type, text, ts: entry.ts, version: APP_VERSION, uid,
      // Legacy column names previously sent by IM (kept for compat with any older schema):
      message: text, app_version: APP_VERSION,
    };
    const res = await fetch(SUPA_URL + '/rest/v1/pnimit_feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPA_ANON,
        'Authorization': 'Bearer ' + SUPA_ANON,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { _fbOk = false; }
  } catch (e) { _fbOk = false; }
  if (_fbOk) {
    toast('תודה — הפידבק נשמר', 'success');
  } else {
    toast('❌ שליחת המשוב נכשלה — נסה שוב מאוחר יותר\nFeedback submission failed — try again later', 'error');
  }
  const ta = document.getElementById('settings-fb-text');
  if (ta) ta.value = '';
}

// Toggle daily-review notifications. Moved verbatim from more-view.js:150-167
// in v10.3.0 consolidation. Asynchronously requests browser permission on
// first opt-in. Mutates G.S.notifOptIn — the daily-notification scheduler in
// app.js reads that flag. The export keyword stays so the regression-guard
// test in tests/regressionGuards.test.js can assert against this file.
export async function toggleNotifOptIn() {
  if (!_notifSupported) return;
  if (G.S.notifOptIn) {
    // Turning off — keep browser perm as-is; just stop scheduling.
    G.S.notifOptIn = false;
    G.save();
    G.render();
    return;
  }
  // Turning on — request permission if not yet granted.
  let perm = Notification.permission;
  if (perm === 'default') {
    try { perm = await Notification.requestPermission(); } catch (e) { perm = 'denied'; }
  }
  G.S.notifOptIn = perm === 'granted';
  G.save();
  G.render();
}
