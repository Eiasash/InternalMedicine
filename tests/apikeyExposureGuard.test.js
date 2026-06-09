/**
 * Guards the v10.4.44 security fix (sibling of Geri v10.64.158 / FM v1.26.1):
 * the Anthropic API key must NOT be included in the cloud-sync payload.
 * backup_get/backup_set are SECURITY DEFINER with no caller-identity check, so
 * a synced key was exfiltratable by username guess on the public anon key.
 * It is redundant — auth_login_user returns api_key on a password-checked login.
 * The restore-read path is kept for backward compatibility.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const cloud = readFileSync(
  resolve(import.meta.dirname, '..', 'src', 'features', 'cloud.js'),
  'utf-8'
);

describe('API key is not cloud-synced (security)', () => {
  it('the cloudBackup payload (_bundled) does not include _apikey', () => {
    // Any _bundled literal that carries _apikey reintroduces the exfiltration path.
    expect(cloud).not.toMatch(/_bundled\s*=\s*\{[^}]*_apikey[^}]*\}/);
  });

  it('does not call getApiKey() to build the backup payload', () => {
    expect(cloud).not.toContain('const _apikey=getApiKey()');
  });

  it('still restores _apikey from legacy backups (backward-compat read kept)', () => {
    expect(cloud).toContain("if (typeof rowData._apikey === 'string') setApiKey(rowData._apikey);");
  });
});
