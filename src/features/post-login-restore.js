/**
 * post-login-restore.js — fresh-device discoverability for cloud restore.
 *
 * Mirrors ward-helper v1.32.0's PostLoginRestorePrompt (`src/ui/components/
 * PostLoginRestorePrompt.tsx`), adapted for the modular Vite study PWAs.
 *
 * Why this exists:
 *   When a user logs in on a brand-new phone, their G.S is empty. Their
 *   cloud backup row (`pnimit_backups` keyed on `user_<username>`) has
 *   their full progress, but the user has to walk to More → Settings →
 *   Backup section → tap Restore. Discoverability is poor — users assume
 *   logging in is enough.
 *
 *   This module surfaces a one-tap "Restore from cloud?" modal automatically
 *   when:
 *     1. An auth `login` event fires (NOT `register` — fresh accounts have
 *        no cloud data to pull).
 *     2. Local state is empty (G.S.qOk + G.S.qNo === 0 AND no SR data).
 *        Heuristic match for "fresh device" — never disturb a populated
 *        device.
 *     3. The user hasn't been prompted before for this username on this
 *        device (suppress marker `pnimit.restore-prompted.<username>`).
 *     4. A cloud backup row actually exists.
 *
 * What this module does NOT do:
 *   - It never auto-applies a restore. The user must tap to confirm. Auto-
 *     applying would silently overwrite a guest's local-only progress if a
 *     login on a "shared" device collided with their guest data.
 *   - It never fires on `register` (fresh account = no data to pull).
 *   - It never re-prompts after dismissal (suppress marker is permanent for
 *     the (device, username) pair). The user can always restore manually
 *     from Settings.
 */

import G from '../core/globals.js';
import { sanitize } from '../core/utils.js';
import { getCurrentUser, subscribeAuthEvents } from './auth.js';
import { peekCloudBackup, applyRestorePayload } from './cloud.js';

const SUPPRESS_KEY_PREFIX = 'pnimit.restore-prompted.';

/** Exported for tests so they can clear marker state between cases. */
export function _suppressKey(username) {
  return SUPPRESS_KEY_PREFIX + username;
}

/**
 * "Is this device empty?" heuristic. Returns true only when there's NO local
 * progress to clobber — every populated state path returns false. Defensive:
 * unknown shapes (G.S undefined, sr not an object) are treated as populated
 * so we never surface the prompt over uncertain state.
 */
export function _isFreshState(state) {
  if (!state || typeof state !== 'object') return false;
  const qOk = Number(state.qOk) || 0;
  const qNo = Number(state.qNo) || 0;
  if (qOk + qNo > 0) return false;
  const sr = state.sr;
  if (sr && typeof sr === 'object' && Object.keys(sr).length > 0) return false;
  return true;
}

/**
 * Pure decision function. Returns true iff the prompt should be surfaced for
 * this user on this device given the current local state and suppress marker.
 *
 * Defensive on every read: any localStorage / state error is treated as a
 * reason to NOT prompt (we'd rather miss a prompt than show one we can't
 * later honour the "don't show again" for).
 */
export async function shouldPromptRestore(username, state) {
  if (!username || typeof username !== 'string') return false;
  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(username)) return false;
  try {
    if (localStorage.getItem(_suppressKey(username))) return false;
  } catch (_) {
    return false;
  }
  if (!_isFreshState(state)) return false;
  return true;
}

/** Mark the prompt as handled for this username on this device. */
function _markPrompted(username) {
  try { localStorage.setItem(_suppressKey(username), String(Date.now())); }
  catch (_) { /* worst case we re-prompt next login, which is mild */ }
}

/**
 * Surface the modal. Returns a Promise that resolves when the user closes
 * it (Restore-and-applied OR Not-now). The modal styling matches the
 * existing `cloudRestore()` confirm modal so the visual language is
 * consistent.
 */
function _showPrompt(username) {
  return new Promise((resolve) => {
    const msg =
      'מצאנו גיבוי בענן עבור ' + username + '.\n' +
      'זה כנראה מכשיר חדש — לשחזר את ההתקדמות עכשיו?';
    const html =
      '<div id="postLoginRstModal" style="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:10002;padding:16px">' +
      '<div style="background:#fff;border-radius:14px;max-width:360px;margin:20vh auto;padding:20px;font-family:Heebo,Inter,sans-serif;text-align:center;direction:rtl">' +
      '<div style="font-size:32px;margin-bottom:6px">☁️</div>' +
      '<div style="font-size:14px;font-weight:700;margin-bottom:8px;color:#0c4a6e">לשחזר מהענן?</div>' +
      '<div style="font-size:12px;line-height:1.6;margin-bottom:16px;white-space:pre-wrap;color:#475569">' + sanitize(msg) + '</div>' +
      '<div style="display:flex;gap:8px"><button id="postLoginRstYes" style="flex:1;padding:10px;background:#0ea5e9;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer">שחזר</button>' +
      '<button id="postLoginRstNo" style="flex:1;padding:10px;background:#f1f5f9;color:#475569;border:none;border-radius:10px;font-weight:700;cursor:pointer">לא עכשיו</button></div>' +
      '</div></div>';
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstChild);
    const cleanup = () => {
      const m = document.getElementById('postLoginRstModal');
      if (m) m.remove();
    };
    document.getElementById('postLoginRstYes').addEventListener('click', () => {
      cleanup(); resolve(true);
    });
    document.getElementById('postLoginRstNo').addEventListener('click', () => {
      cleanup(); resolve(false);
    });
  });
}

async function _onLogin() {
  const user = getCurrentUser();
  if (!user) return;
  // Cheap predicate first (state + marker) before paying for the network call.
  if (!(await shouldPromptRestore(user.username, G.S))) return;
  // Peek the cloud — if there's nothing there, no point prompting.
  let peek;
  try { peek = await peekCloudBackup(); } catch (_) { return; }
  if (!peek || !peek.exists) {
    // No cloud row yet (typical for users whose first login is on the device
    // they registered on). Mark prompted so we don't re-check on every login.
    _markPrompted(user.username);
    return;
  }
  // Race-check the local state again — if the user has since started
  // answering questions in the brief async window, suppress the prompt to
  // avoid clobbering their work.
  if (!_isFreshState(G.S)) {
    _markPrompted(user.username);
    return;
  }
  const accepted = await _showPrompt(user.username);
  _markPrompted(user.username);
  if (accepted) {
    try {
      applyRestorePayload(peek.data);
      // Soft success toast through G.toast if available — we keep this
      // module decoupled from utils.toast to avoid circular imports in
      // testing.
      if (typeof window !== 'undefined' && window.toast) {
        window.toast('✅ ההתקדמות שוחזרה מהענן', 'success');
      }
    } catch (e) {
      console.error('post-login-restore apply failed', e);
    }
  }
}

/**
 * Idempotent — safe to call multiple times. Subscribes to auth login events
 * and surfaces the restore prompt when conditions are met. Should be called
 * exactly once at app boot, after IDB migration completes.
 */
let _initialized = false;
export function initPostLoginRestore() {
  if (_initialized) return;
  _initialized = true;
  subscribeAuthEvents((action) => {
    if (action !== 'login') return;
    // Defer to next tick so the auth UI's own render() pass finishes first.
    setTimeout(() => { _onLogin().catch(() => {}); }, 0);
  });
}
