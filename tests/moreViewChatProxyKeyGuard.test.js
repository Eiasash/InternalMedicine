/**
 * sendChat proxy-error key-preservation guard (src/ui/more-view.js).
 *
 * sendChat() talks ONLY to the shared proxy (AI_PROXY + x-api-secret), never
 * the user's stored key — see the comment at its fetch call. So a proxy 401/403
 * is a service/secret failure and must NOT wipe the user's pnimit_apikey.
 * Before v10.4.57 the error branch did `localStorage.removeItem('pnimit_apikey')`
 * on 401/403, punishing the user for a server-side problem (the same class of
 * bug Codex flagged on the direct-call path; client.js never clears on proxy).
 * This pins the corrected behavior: the user key survives a proxy 401/403, and
 * the chat surfaces a service-unavailable error instead.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// more-view.js transitively imports modes (navigator) + cloud (fetch) + ai/client;
// none are exercised by sendChat's proxy path. Mock to keep the import light.
vi.mock('../src/quiz/modes.js', () => ({ startVoiceParser: vi.fn() }));
vi.mock('../src/features/cloud.js', () => ({ submitFeedbackForm: vi.fn() }));
vi.mock('../src/ai/client.js', () => ({ callAI: vi.fn() }));
// P0 cutover: sendChat now mints an anon-Supabase proxy Bearer via
// getProxyBearer(). Stub it so the test doesn't hit real GoTrue / the https CDN
// import of supabase-js (which Node's ESM loader rejects).
vi.mock('../src/services/supabaseAuth.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getProxyBearer: async () => 'Bearer test-jwt' };
});

import G from '../src/core/globals.js';
import { sendChat } from '../src/ui/more-view.js';

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

function installDomShim() {
  vi.stubGlobal('document', {
    getElementById: (id) =>
      id === 'chat-input'
        ? { value: 'בדיקה' }
        : { scrollTop: 0, scrollHeight: 0 },
  });
  // navigator is a getter-only global in node — stub via vitest.
  vi.stubGlobal('navigator', { onLine: true });
}

describe('sendChat — proxy 401/403 must not clear the user key', () => {
  let store;
  beforeEach(() => {
    store = installLocalStorageShim();
    installDomShim();
    store.set('pnimit_apikey', 'user-key-abc123');
    G.S = { chat: [] };
    G.chatLoading = false;
    G.save = () => {};
    G.render = () => {};
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete globalThis.fetch;
  });

  for (const status of [401, 403]) {
    it(`keeps pnimit_apikey on a proxy ${status} and surfaces a service error`, async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: async () => ({}),
      });
      await sendChat();
      // The user's key is NOT cleared by a proxy/secret failure.
      expect(store.get('pnimit_apikey')).toBe('user-key-abc123');
      const last = G.S.chat[G.S.chat.length - 1];
      expect(last.role).toBe('error');
      expect(last.text).toContain(String(status));
    });
  }
});
