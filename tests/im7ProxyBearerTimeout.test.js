/**
 * IM-7 (2026-07-18): getProxyBearer() must not be able to hang callAI past the
 * request timeout.
 *
 * callAI's AbortController/30s signal only covers the anthropic fetch, NOT
 * getProxyBearer() (getSession()/signInAnonymously() + a dynamic https CDN
 * import of supabase-js). A hang there previously hung the whole call. The fix
 * races the mint against an 8s reject so a stuck sign-in/import is treated as a
 * proxy failure and callAI falls through to the personal-key/direct path.
 *
 * These tests pin:
 *   1. a getProxyBearer that NEVER resolves -> callAI falls through to the
 *      direct path within the 8s race (does not hang to the 30s request timeout),
 *   2. the happy path (proxy 200) is unchanged.
 *
 * Harness mirrors aiClientErrorSpecificity.test.js (real utils + localStorage
 * shim), but stubs getProxyBearer as a configurable vi.fn so we can drive its
 * timing per test.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../src/services/supabaseAuth.js', () => ({
  getProxyBearer: vi.fn(),
}));

import { callAI } from '../src/ai/client.js';
import { getProxyBearer } from '../src/services/supabaseAuth.js';
import { setApiKey } from '../src/core/utils.js';

function installLocalStorageShim() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
  return store;
}

beforeEach(() => {
  installLocalStorageShim();
  getProxyBearer.mockReset();
  setApiKey('sk-ant-fallback'); // personal key present so the direct path can run
});

afterEach(() => {
  vi.useRealTimers();
  delete globalThis.fetch;
});

describe('IM-7 — getProxyBearer timeout race in callAI', () => {
  it('falls through to the direct path within the 8s race when getProxyBearer never resolves (no hang)', async () => {
    vi.useFakeTimers();
    // Stuck sign-in / stuck CDN import: the mint never settles.
    getProxyBearer.mockImplementation(() => new Promise(() => {}));
    // The direct api.anthropic.com fallback succeeds; the proxy fetch must never
    // be reached because we bail on the bearer race BEFORE issuing it.
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('api.anthropic.com')) {
        return { ok: true, status: 200, json: async () => ({ content: [{ text: 'DIRECT_FALLBACK_OK' }] }) };
      }
      throw new Error('proxy fetch should not be reached: ' + url);
    });
    globalThis.fetch = fetchMock;

    const p = callAI([{ role: 'user', content: 'hi' }]);
    // Advance ONLY to the 8s bearer-timeout — NOT the 30s request timeout. If the
    // fix works, the call resolves here; if getProxyBearer could hang the call,
    // this would never settle.
    await vi.advanceTimersByTimeAsync(8000);
    const out = await p;

    expect(out).toBe('DIRECT_FALLBACK_OK');
    // Exactly one fetch — the direct API. The proxy fetch was skipped.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('api.anthropic.com');
  });

  it('does not settle before the 8s race elapses (proves the bound is what releases it)', async () => {
    vi.useFakeTimers();
    getProxyBearer.mockImplementation(() => new Promise(() => {}));
    globalThis.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ content: [{ text: 'DIRECT_FALLBACK_OK' }] }) }));

    let settled = false;
    const p = callAI([{ role: 'user', content: 'hi' }]).then((v) => { settled = true; return v; });
    await vi.advanceTimersByTimeAsync(7000); // just under the 8s bound
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1000); // cross the 8s bound
    await expect(p).resolves.toBe('DIRECT_FALLBACK_OK');
    expect(settled).toBe(true);
  });

  it('happy path unchanged: a proxy 200 returns proxy content and never touches the direct API', async () => {
    getProxyBearer.mockResolvedValue('Bearer good-jwt');
    const fetchMock = vi.fn(async (url) => {
      if (String(url).includes('api.anthropic.com')) throw new Error('direct API must not be reached on the happy path');
      return { ok: true, status: 200, json: async () => ({ content: [{ text: 'PROXY_OK' }] }) };
    });
    globalThis.fetch = fetchMock;

    const out = await callAI([{ role: 'user', content: 'hi' }]);

    expect(out).toBe('PROXY_OK');
    expect(getProxyBearer).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/claude'); // AI_PROXY
  });
});
