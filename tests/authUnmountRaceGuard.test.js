/**
 * Pins the unmount-race contract: no `await` may appear between
 * `setAuthSession(...)` and the end of the auth handler body.
 *
 * Background — feedback_react_setauthsession_unmount_race.md (memory):
 *   "Chaining `await` after `setAuthSession` unmounts the calling
 *   component mid-handler; setStatus on the stale closure silently
 *   fails. Always do dependent RPCs BEFORE setAuthSession."
 *
 * Today both _handleLogin and _handleRegister are correctly shaped:
 *   await authLogin(u, p)               // dependent RPC — async
 *   if (!r.ok) { _setStatus(...); return; }
 *   setAuthSession(r.username, ...);    // commit — sync
 *   if (typeof r.api_key === 'string') setApiKey(r.api_key);  // sync
 *   _dispatchAuthEvent('login');        // sync
 *   toast(...);                         // sync
 *   window.G.render();                  // sync
 *
 * If a future refactor inserts `await someRpc()` after setAuthSession,
 * the handler will return mid-async, the auth-state-change re-render
 * will unmount the form component, and any setStatus() in the stale
 * closure becomes a no-op — exact ward-helper bug from 2026-05-02
 * before that team flipped the order.
 *
 * Sibling-paired with:
 *   - FamilyMedicine/tests/authUnmountRaceGuard.test.js
 *   - Geriatrics/tests/authUnmountRaceGuard.test.js
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const src = readFileSync(resolve(ROOT, 'src/features/auth.js'), 'utf-8');

/**
 * Extract the source slice from `setAuthSession(` to the end of the
 * named function body. The auth handlers are top-level async functions,
 * so the body terminator is the next `\nasync function ` declaration
 * (or end-of-file for the last handler).
 */
function bodyAfterSetAuthSession(fnName) {
  const startMarker = `async function ${fnName}(`;
  const startIdx = src.indexOf(startMarker);
  expect(startIdx, `${fnName} not found in src/features/auth.js`).toBeGreaterThan(-1);
  // Body extends up to next top-level async function (or EOF).
  const nextFnIdx = src.indexOf('\nasync function ', startIdx + 1);
  const body = nextFnIdx < 0 ? src.slice(startIdx) : src.slice(startIdx, nextFnIdx);
  const setAuthIdx = body.indexOf('setAuthSession(');
  expect(setAuthIdx, `setAuthSession() not called in ${fnName}`).toBeGreaterThan(-1);
  return body.slice(setAuthIdx);
}

describe('auth handler — no awaits after setAuthSession (unmount race guard)', () => {
  it('_handleLogin: setAuthSession() is followed only by sync ops', () => {
    const tail = bodyAfterSetAuthSession('_handleLogin');
    // \bawait\b matches the word as a token. Comments containing the
    // bare word "await" would false-positive — write comments without
    // it, or this test guarantees nothing.
    expect(tail).not.toMatch(/\bawait\b/);
  });

  it('_handleRegister: setAuthSession() is followed only by sync ops', () => {
    const tail = bodyAfterSetAuthSession('_handleRegister');
    expect(tail).not.toMatch(/\bawait\b/);
  });
});
