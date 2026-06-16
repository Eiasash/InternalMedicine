/**
 * callAI error specificity + stale-key clearing (src/ai/client.js).
 *
 * Two behaviors pinned here (ported from Geriatrics' _aiErrFromStatus +
 * the existing more-view.js chat 401/403 key-clear precedent):
 *
 *   1. aiErrFromStatus maps an HTTP status to a specific Hebrew-hinted
 *      message instead of a bare "API NNN" — so the UI surfaces a concrete
 *      cause+code (key/auth, rate-limit, server) rather than a dead 'שגיאה'.
 *   2. When the DIRECT api.anthropic.com call (the path that uses the user's
 *      stored pnimit_apikey) returns 401, callAI clears the stored key so the
 *      user is re-prompted next time instead of silently looping on a dead key,
 *      and marks it bad so the account-restore path won't write it back. A
 *      direct 403 is permission_error (a VALID key lacking model/resource
 *      access) — the key is KEPT. A proxy 401/403 must NOT clear the key (the
 *      proxy uses the shared x-api-secret, not the user's key).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { aiErrFromStatus, callAI } from '../src/ai/client.js';
import { getApiKey, setApiKey, isMarkedBadApiKey, markBadApiKey } from '../src/core/utils.js';

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

// A proxy response that is not ok, so callAI falls through to the direct
// api.anthropic.com path where the user's stored key is exercised.
const PROXY_DOWN = { ok: false, status: 502, json: async () => ({}) };

describe('aiErrFromStatus mapping', () => {
  it('401 → invalid-key hint, preserving the code', () => {
    expect(aiErrFromStatus(401)).toBe('API 401 — מפתח API לא תקין');
  });

  it('403 → permission/access-denied hint (NOT invalid-key), preserving the code', () => {
    expect(aiErrFromStatus(403)).toBe('API 403 — אין הרשאה למשאב/מודל זה');
    // 403 is permission_error, not an auth failure — must not be the key message.
    expect(aiErrFromStatus(403)).not.toBe('API 403 — מפתח API לא תקין');
  });

  it('429 → rate-limit hint', () => {
    expect(aiErrFromStatus(429)).toMatch(/^API 429 — /);
    expect(aiErrFromStatus(429)).not.toBe('API 429');
  });

  it('5xx → service-unavailable hint', () => {
    expect(aiErrFromStatus(500)).toBe('API 500 — שירות לא זמין כרגע');
    expect(aiErrFromStatus(503)).toBe('API 503 — שירות לא זמין כרגע');
  });

  it('other codes fall back to bare "API NNN"', () => {
    expect(aiErrFromStatus(400)).toBe('API 400');
    expect(aiErrFromStatus(404)).toBe('API 404');
  });
});

describe('callAI direct-fetch error handling', () => {
  let store;
  beforeEach(() => {
    store = installLocalStorageShim();
    setApiKey('sk-ant-stalekey');
    vi.restoreAllMocks();
  });

  it('throws the SPECIFIC message (not bare code) on a direct-call 429', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(PROXY_DOWN) // proxy down → fall through
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) });
    await expect(callAI([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      'API 429 — חריגה ממכסה, נסה שוב בעוד רגע'
    );
    // 429 is not an auth failure — the key must survive.
    expect(getApiKey()).toBe('sk-ant-stalekey');
  });

  it('clears AND marks-bad the stored key on a direct-call 401', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(PROXY_DOWN)
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    await expect(callAI([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      'API 401 — מפתח API לא תקין'
    );
    expect(getApiKey()).toBe('');
    expect(store.has('pnimit_apikey')).toBe(false);
    // The dead key is marked so account-restore (auth.js) won't write it back.
    expect(isMarkedBadApiKey('sk-ant-stalekey')).toBe(true);
  });

  it('does NOT clear the key on a direct-call 403 (permission_error, valid key)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(PROXY_DOWN)
      .mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });
    await expect(callAI([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      'API 403 — אין הרשאה למשאב/מודל זה'
    );
    // 403 = permission/model-access problem, not a bad key — the key survives
    // and is NOT marked bad.
    expect(getApiKey()).toBe('sk-ant-stalekey');
    expect(isMarkedBadApiKey('sk-ant-stalekey')).toBe(false);
  });

  it('does NOT clear the key on a non-auth 5xx', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(PROXY_DOWN)
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    await expect(callAI([{ role: 'user', content: 'hi' }])).rejects.toThrow(
      'API 500 — שירות לא זמין כרגע'
    );
    expect(getApiKey()).toBe('sk-ant-stalekey');
  });

  it('does NOT clear the key when the PROXY 401s and the direct fallback then succeeds (proxy uses shared secret, not the user key)', async () => {
    // Real control flow: callAI hits the proxy FIRST. A proxy non-ok status
    // (here 401 — a shared-secret problem, NOT the user's key) is logged and
    // falls through to the direct api.anthropic.com call using the stored key.
    // The direct call succeeds, so the stored key must be untouched — proving a
    // proxy 401 never clears pnimit_apikey.
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) }) // proxy 401
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [{ text: 'ok from direct fallback' }] }),
      }); // direct success
    const out = await callAI([{ role: 'user', content: 'hi' }]);
    expect(out).toBe('ok from direct fallback');
    expect(globalThis.fetch).toHaveBeenCalledTimes(2); // proxy then direct
    expect(getApiKey()).toBe('sk-ant-stalekey'); // untouched by the proxy 401
  });
});

// Finding #4 (Codex P2): a direct 401 marks the key bad so the account-restore
// path (auth.js: `if (typeof r.api_key === 'string' && !isMarkedBadApiKey(...))`)
// won't write the same dead key back from app_users on the next login/device.
// The marker is dropped the moment a genuinely new key is saved or an AI call
// succeeds, so a later-corrected account key restores normally.
describe('bad-key marker lifecycle (account-restore guard)', () => {
  beforeEach(() => {
    installLocalStorageShim();
    setApiKey('sk-ant-stalekey');
    vi.restoreAllMocks();
  });

  it('a direct 401 marks the cleared key so login-restore would skip it', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(PROXY_DOWN)
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    await expect(callAI([{ role: 'user', content: 'hi' }])).rejects.toThrow();
    // This is exactly what auth.js:_handleLogin checks before setApiKey(r.api_key).
    expect(isMarkedBadApiKey('sk-ant-stalekey')).toBe(true);
  });

  it('saving a genuinely new key clears the marker (account copy can restore again)', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(PROXY_DOWN)
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    await expect(callAI([{ role: 'user', content: 'hi' }])).rejects.toThrow();
    expect(isMarkedBadApiKey('sk-ant-stalekey')).toBe(true);
    setApiKey('sk-ant-freshkey');
    expect(isMarkedBadApiKey('sk-ant-stalekey')).toBe(false);
  });

  it('a successful DIRECT AI call clears the marker (positive proof the key is good)', async () => {
    // First: a direct 401 marks the key bad.
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(PROXY_DOWN)
      .mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    await expect(callAI([{ role: 'user', content: 'hi' }])).rejects.toThrow();
    expect(isMarkedBadApiKey('sk-ant-stalekey')).toBe(true);
    // setApiKey itself clears the marker, so re-mark afterwards to isolate that
    // it is callAI's DIRECT-SUCCESS path that clears it (not the save).
    setApiKey('sk-ant-stalekey');
    markBadApiKey('sk-ant-stalekey');
    expect(isMarkedBadApiKey('sk-ant-stalekey')).toBe(true);
    // Proxy down → direct call (using the stored key) now succeeds, e.g. access
    // was restored on the account side. That is positive proof the key works.
    globalThis.fetch = vi.fn().mockResolvedValueOnce(PROXY_DOWN).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ text: 'works now' }] }),
    });
    const out = await callAI([{ role: 'user', content: 'hi' }]);
    expect(out).toBe('works now');
    expect(isMarkedBadApiKey('sk-ant-stalekey')).toBe(false);
  });
});
