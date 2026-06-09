/**
 * Guards the v10.4.45 #353 fix (sibling of Geri v10.64.160): API-key account
 * sync at save time.
 *
 * Background: the v10.4.44 security fix removed _apikey from the cloud backup
 * payload, which also severed the only WRITE path into app_users.api_key (the
 * sync_api_key_from_backup trigger fed off backup writes). A key saved or
 * rotated after .44 stayed localStorage-only and auth_login_user restored a
 * stale/null key on the next device (Codex P2 on #167).
 *
 * The fix routes settings-save-api-key / settings-remove-api-key through
 * syncApiKeyToAccount (auth.js), which saves locally FIRST and then offers
 * account sync via the auth_set_api_key RPC (re-auth required).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const auth = readFileSync(
  resolve(import.meta.dirname, '..', 'src', 'features', 'auth.js'),
  'utf-8',
);
const overlay = readFileSync(
  resolve(import.meta.dirname, '..', 'src', 'ui', 'settings-overlay.js'),
  'utf-8',
);
const cloud = readFileSync(
  resolve(import.meta.dirname, '..', 'src', 'features', 'cloud.js'),
  'utf-8',
);

describe('#353 — API-key account sync (IM port)', () => {
  it('auth.js exports authSetApiKey calling the RPC with the live arg names', () => {
    expect(auth).toContain('export async function authSetApiKey');
    expect(auth).toMatch(/_rpc\('auth_set_api_key',\s*\{\s*p_username:/);
    expect(auth).toContain('p_api_key:');
  });

  it('syncApiKeyToAccount requires a session and treats prompt-cancel as device-only', () => {
    expect(auth).toContain('export async function syncApiKeyToAccount');
    expect(auth).toContain("return { ok: false, error: 'not_logged_in' };");
    expect(auth).toContain("return { ok: false, error: 'cancelled' };");
  });

  it('settings save handler saves locally BEFORE the sync attempt', () => {
    const start = overlay.indexOf("if (action === 'settings-save-api-key')");
    const block = overlay.slice(
      start,
      overlay.indexOf("if (action === 'settings-export-progress')"),
    );
    const localSave = block.indexOf('setApiKey(v)');
    const sync = block.indexOf('syncApiKeyToAccount(v)');
    expect(localSave).toBeGreaterThan(-1);
    expect(sync).toBeGreaterThan(-1);
    expect(localSave).toBeLessThan(sync);
  });

  it('settings remove handler clears locally first, then offers to clear the account copy', () => {
    const start = overlay.indexOf("if (action === 'settings-remove-api-key')");
    const block = overlay.slice(
      start,
      overlay.indexOf("if (action === 'settings-export-progress')"),
    );
    const localClear = block.indexOf("setApiKey('')");
    const sync = block.indexOf("syncApiKeyToAccount('')");
    expect(localClear).toBeGreaterThan(-1);
    expect(sync).toBeGreaterThan(-1);
    expect(localClear).toBeLessThan(sync);
  });

  it('guest behavior unchanged: not_logged_in falls back to the plain save toast', () => {
    expect(overlay).toContain(
      "else if (r.error === 'not_logged_in') toast('API key נשמר', 'success');",
    );
  });

  it('v10.4.44 regression locks stay intact (no _apikey back in the backup payload)', () => {
    expect(cloud).not.toMatch(/_bundled\s*=\s*\{[^}]*_apikey[^}]*\}/);
    expect(cloud).toContain("if (typeof rowData._apikey === 'string') setApiKey(rowData._apikey);");
    expect(auth).toContain("if (typeof r.api_key === 'string') setApiKey(r.api_key);");
  });
});
