/**
 * Tests for v10.4.14 → v10.4.17 api-key cloud sync flow.
 *
 * v10.4.14 — _apikey added to cloudBackup payload (sibling-paired with Geri/FM)
 * v10.4.15 — startTimedQ G-binding fix (engine.js → G.startTimedQ)
 * v10.4.16 — pre-emptive (field||'').toLowerCase() defensive guards
 * v10.4.17 — _handleLogin reads r.api_key from auth_login_user response and
 *            calls setApiKey directly (Supabase migration 2026-05-06 added
 *            api_key column to app_users).
 *
 * Pinning these so a refactor doesn't silently regress the cross-device
 * api-key recovery (the proxy-fallback path is on flaky 4G — losing the
 * one-round-trip optimization would mean users have to re-enter keys).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const rootDir = resolve(import.meta.dirname, '..');
const cloudJs = readFileSync(resolve(rootDir, 'src/features/cloud.js'), 'utf-8');
const authJs = readFileSync(resolve(rootDir, 'src/features/auth.js'), 'utf-8');
const utilsJs = readFileSync(resolve(rootDir, 'src/core/utils.js'), 'utf-8');
const engineJs = readFileSync(resolve(rootDir, 'src/quiz/engine.js'), 'utf-8');
const appJs = readFileSync(resolve(rootDir, 'src/ui/app.js'), 'utf-8');

describe('IM _apikey cloud-sync (v10.4.44 security fix supersedes v10.4.14)', () => {
  // v10.4.14 synced _apikey in the backup payload; v10.4.44 removed it because
  // backup_get/set are SECURITY DEFINER with no identity check, so the synced key
  // was username-guess-readable on the anon key. See tests/apikeyExposureGuard.test.js.
  // v10.4.45 (#353 round-2): getApiKey is imported again — but ONLY as the
  // fill-only guard on the legacy restore (never to build the backup payload;
  // the payload lock below is the real invariant). v10.4.57 round-2 (Codex P2 on
  // #191) adds an isMarkedBadApiKey gate so a restore of a just-revoked key is
  // skipped rather than re-arming the stale-key loop.
  it('cloud.js imports setApiKey (restore path); getApiKey + bad-key marker guard the fill-only restore', () => {
    expect(cloudJs).toMatch(/import\s+\{[^}]*setApiKey[^}]*\}\s+from\s+['"]\.\.\/core\/utils\.js['"]/);
    expect(cloudJs).toMatch(/import\s+\{[^}]*isMarkedBadApiKey[^}]*\}\s+from\s+['"]\.\.\/core\/utils\.js['"]/);
    expect(cloudJs).toContain("if (typeof rowData._apikey === 'string' && !getApiKey() && !isMarkedBadApiKey(rowData._apikey)) setApiKey(rowData._apikey);");
  });

  it('cloudBackup bundle does NOT include _apikey (key no longer synced)', () => {
    expect(cloudJs).not.toMatch(/_apikey\s*=\s*getApiKey\(\)/);
    expect(cloudJs).not.toMatch(/_bundled\s*=\s*\{[^}]*_apikey[^}]*\}/);
  });

  it('applyRestorePayload restores rowData._apikey via setApiKey', () => {
    expect(cloudJs).toContain('rowData._apikey');
    expect(cloudJs).toContain('setApiKey');
  });

  it("backwards-compat: typeof check on _apikey before calling setApiKey", () => {
    // Legacy backups without _apikey should be ignored, not throw.
    expect(cloudJs).toMatch(/typeof\s+rowData\._apikey\s*===\s*['"]string['"]/);
  });
});

describe('IM v10.4.15 — startTimedQ ReferenceError fix', () => {
  it('app.js binds startTimedQ on G after import', () => {
    expect(appJs).toContain('G.startTimedQ = startTimedQ');
  });

  it('engine.js uses G.startTimedQ via setTimeout closure (no bare reference)', () => {
    // Old buggy form: setTimeout(startTimedQ, 100)  ← ReferenceError, engine.js
    // didn't import startTimedQ
    // New form: setTimeout(()=>G.startTimedQ&&G.startTimedQ(), 100)
    expect(engineJs).toMatch(/setTimeout\(\(\)=>G\.startTimedQ/);
    // No bare references should remain.
    expect(engineJs).not.toMatch(/setTimeout\(startTimedQ\b/);
  });
});

describe('IM v10.4.16 — defensive toLowerCase pre-emptive guards', () => {
  it('more-view.js search uses (field||\'\').toLowerCase() pattern', () => {
    const moreView = readFileSync(resolve(rootDir, 'src/ui/more-view.js'), 'utf-8');
    // The fork-shared FM regression pattern: item.q.toLowerCase() crashes
    // if any record has missing field. v10.4.16 wrapped the search calls.
    expect(moreView).toMatch(/\(item\.q\|\|''\)\.toLowerCase\(\)/);
    expect(moreView).toMatch(/\(n\.topic\|\|''\)\.toLowerCase\(\)/);
    expect(moreView).toMatch(/\(d\.name\|\|''\)\.toLowerCase\(\)/);
  });

  it('learn-view.js notes filter uses (field||\'\').toLowerCase()', () => {
    const learnView = readFileSync(resolve(rootDir, 'src/ui/learn-view.js'), 'utf-8');
    expect(learnView).toMatch(/\(n\.topic\|\|''\)\.toLowerCase\(\)/);
    expect(learnView).toMatch(/\(n\.notes\|\|''\)\.toLowerCase\(\)/);
  });
});

describe('IM v10.4.17 — _handleLogin restores api_key from response', () => {
  it('auth.js imports setApiKey from utils', () => {
    expect(authJs).toMatch(/import\s+\{[^}]*setApiKey[^}]*\}\s+from\s+['"]\.\.\/core\/utils\.js['"]/);
  });

  it('_handleLogin calls setApiKey(r.api_key) on success', () => {
    // typeof check for backwards-compat with older auth_login_user RPC versions.
    expect(authJs).toMatch(/typeof\s+r\.api_key\s*===\s*['"]string['"]/);
    expect(authJs).toContain('setApiKey(r.api_key)');
  });

  it('the call happens AFTER setAuthSession (so the user is logged in first)', () => {
    const sessionIdx = authJs.indexOf('setAuthSession(r.username');
    const apiKeyIdx = authJs.indexOf('setApiKey(r.api_key)');
    expect(sessionIdx).toBeGreaterThan(-1);
    expect(apiKeyIdx).toBeGreaterThan(-1);
    expect(apiKeyIdx, 'setApiKey must run AFTER setAuthSession').toBeGreaterThan(sessionIdx);
  });
});

describe('IM utils.js exports — sibling parity', () => {
  it('utils.js exports getApiKey + setApiKey using pnimit_apikey localStorage key', () => {
    expect(utilsJs).toMatch(/export\s+function\s+getApiKey\(\)/);
    expect(utilsJs).toMatch(/export\s+function\s+setApiKey\(/);
    expect(utilsJs).toContain('pnimit_apikey');
  });
});
