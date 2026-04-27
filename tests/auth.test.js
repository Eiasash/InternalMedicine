// tests/auth.test.js
// Verifies the client-side auth module logic without hitting the network.
// RPC behavior is covered by the SQL smoke tests in the migration; here we
// pin the localStorage state machine + uid resolution.

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// localStorage + window shim (no jsdom in this repo's devDeps).
const _lsStore = new Map();
globalThis.localStorage = {
  getItem: (k) => (_lsStore.has(k) ? _lsStore.get(k) : null),
  setItem: (k, v) => _lsStore.set(k, String(v)),
  removeItem: (k) => _lsStore.delete(k),
  clear: () => _lsStore.clear(),
};
globalThis.window = globalThis;

beforeEach(() => {
  _lsStore.clear();
  delete globalThis.__authBound;
});

afterEach(() => { vi.restoreAllMocks(); });

describe('auth — localStorage state machine', () => {
  test('getCurrentUser() returns null when no session', async () => {
    const { getCurrentUser, isLoggedIn } = await import('../src/features/auth.js');
    expect(getCurrentUser()).toBeNull();
    expect(isLoggedIn()).toBe(false);
  });

  test('setAuthSession() persists profile and binds uid to username', async () => {
    const { setAuthSession, getCurrentUser, getUserId, isLoggedIn } = await import('../src/features/auth.js');
    const profile = setAuthSession('danny', 'Danny');
    expect(profile.username).toBe('danny');
    expect(profile.displayName).toBe('Danny');
    expect(typeof profile.loggedInAt).toBe('number');
    expect(isLoggedIn()).toBe(true);
    expect(getCurrentUser()).toMatchObject({ username: 'danny', displayName: 'Danny' });
    expect(getUserId()).toBe('danny');                       // username IS the uid
    expect(localStorage.getItem('pnimit_uid')).toBe('danny');
  });

  test('getUserId() falls back to a stable random uid when not logged in', async () => {
    const { getUserId } = await import('../src/features/auth.js');
    const id1 = getUserId();
    const id2 = getUserId();
    expect(id1).toBe(id2);                                   // stable across calls
    expect(id1).toMatch(/^u[a-z0-9]{1,8}$/);                 // legacy format
    expect(localStorage.getItem('pnimit_uid')).toBe(id1);
  });

  test('logout() clears profile and rotates uid+devid', async () => {
    const { setAuthSession, logout, getCurrentUser, getUserId } = await import('../src/features/auth.js');
    setAuthSession('danny', 'Danny');
    localStorage.setItem('pnimit_devid', 'dev_old');
    expect(getCurrentUser()).not.toBeNull();
    logout();
    expect(getCurrentUser()).toBeNull();
    expect(localStorage.getItem('pnimit_uid')).not.toBe('danny');
    expect(getUserId()).toMatch(/^u[a-z0-9]{1,8}$/);
    expect(localStorage.getItem('pnimit_devid')).not.toBe('dev_old');
    expect(localStorage.getItem('pnimit_devid')).toMatch(/^dev_[a-z0-9]{1,10}$/);
  });

  test('getCurrentUser() rejects tampered profiles', async () => {
    const { getCurrentUser } = await import('../src/features/auth.js');
    // Garbage JSON
    localStorage.setItem('pnimit_authUser', 'not json');
    expect(getCurrentUser()).toBeNull();
    // Wrong shape
    localStorage.setItem('pnimit_authUser', JSON.stringify(null));
    expect(getCurrentUser()).toBeNull();
    localStorage.setItem('pnimit_authUser', JSON.stringify({ x: 1 }));
    expect(getCurrentUser()).toBeNull();
    // Invalid username
    localStorage.setItem('pnimit_authUser', JSON.stringify({ username: 'BadName!' }));
    expect(getCurrentUser()).toBeNull();
    // Valid
    localStorage.setItem('pnimit_authUser', JSON.stringify({ username: 'good_one', displayName: null, loggedInAt: 1 }));
    expect(getCurrentUser()).toMatchObject({ username: 'good_one' });
  });
});

describe('auth — RPC plumbing (mocked fetch)', () => {
  test('authRegister() POSTs to /rest/v1/rpc/auth_register_user with normalized body', async () => {
    const { authRegister } = await import('../src/features/auth.js');
    let captured;
    global.fetch = vi.fn(async (url, opts) => {
      captured = { url, opts };
      return { ok: true, json: async () => ({ ok: true, username: 'danny', display_name: 'Danny' }), text: async () => '' };
    });
    const r = await authRegister('danny', 'hello123', 'Danny');
    expect(r.ok).toBe(true);
    expect(captured.url).toContain('/rest/v1/rpc/auth_register_user');
    expect(captured.opts.method).toBe('POST');
    expect(captured.opts.headers['apikey']).toBeDefined();
    expect(captured.opts.headers['Authorization']).toMatch(/^Bearer /);
    const body = JSON.parse(captured.opts.body);
    expect(body).toEqual({ p_username: 'danny', p_password: 'hello123', p_display_name: 'Danny' });
  });

  test('authLogin() returns structured error on HTTP failure', async () => {
    const { authLogin } = await import('../src/features/auth.js');
    global.fetch = vi.fn(async () => ({ ok: false, status: 500, text: async () => 'oops' }));
    const r = await authLogin('x', 'y');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('http_500');
  });

  test('authLogin() returns bad_response on non-object body', async () => {
    const { authLogin } = await import('../src/features/auth.js');
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => null, text: async () => '' }));
    const r = await authLogin('x', 'y');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('bad_response');
  });
});
