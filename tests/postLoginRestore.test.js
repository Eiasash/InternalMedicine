/**
 * tests/postLoginRestore.test.js
 *
 * Pins the decision logic for the auto-restore-on-login prompt added in
 * v1.18.0 (`src/features/post-login-restore.js`). Mirrors ward-helper's
 * `_suppressKey` + `shouldPromptRestore` test pattern.
 *
 * What this locks:
 *   1. The suppress-key format — sibling PWAs share the same convention
 *      (`<app>.restore-prompted.<username>`) so a future migration can sweep
 *      across them in one pass.
 *   2. Fresh-state heuristic — the prompt MUST NOT fire if the user has any
 *      local progress, even one answered question. This is the safety net
 *      that prevents an inadvertent overwrite of guest work.
 *   3. Username validation — defensive against junk in localStorage.
 *   4. localStorage-error-implies-skip — if we can't read the marker, we
 *      can't honour a future "don't show again", so we skip the prompt.
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';

// localStorage shim (no jsdom in this repo's devDeps).
const _lsStore = new Map();
globalThis.localStorage = {
  getItem: (k) => (_lsStore.has(k) ? _lsStore.get(k) : null),
  setItem: (k, v) => _lsStore.set(k, String(v)),
  removeItem: (k) => _lsStore.delete(k),
  clear: () => _lsStore.clear(),
};
globalThis.window = globalThis;

// post-login-restore.js transitively imports cloud.js → track-view.js →
// spaced-repetition.js → fsrs-bridge.js. Stub the offending boundaries.
vi.mock('../src/ui/track-view.js', () => ({ calcEstScore: vi.fn() }));
vi.mock('../src/ai/client.js', () => ({ callAI: vi.fn() }));
vi.mock('../src/sr/spaced-repetition.js', () => ({
  getTopicStats: vi.fn(() => ({})),
  getDueQuestions: vi.fn(() => []),
}));
vi.mock('../src/core/globals.js', () => ({
  default: { S: { qOk: 0, qNo: 0, sr: {} }, save: vi.fn(), render: vi.fn() },
}));

beforeEach(() => {
  _lsStore.clear();
});

describe('post-login-restore — _suppressKey', () => {
  test('uses the pnimit. namespace shared with sibling PWAs', async () => {
    const { _suppressKey } = await import('../src/features/post-login-restore.js');
    expect(_suppressKey('alice')).toBe('pnimit.restore-prompted.alice');
  });
});

describe('post-login-restore — _isFreshState', () => {
  test('returns true for default empty state', async () => {
    const { _isFreshState } = await import('../src/features/post-login-restore.js');
    expect(_isFreshState({ qOk: 0, qNo: 0, sr: {} })).toBe(true);
  });

  test('returns false when any question has been answered correctly', async () => {
    const { _isFreshState } = await import('../src/features/post-login-restore.js');
    expect(_isFreshState({ qOk: 1, qNo: 0, sr: {} })).toBe(false);
  });

  test('returns false when any question has been answered incorrectly', async () => {
    const { _isFreshState } = await import('../src/features/post-login-restore.js');
    expect(_isFreshState({ qOk: 0, qNo: 1, sr: {} })).toBe(false);
  });

  test('returns false when SR data exists even with zero qOk/qNo', async () => {
    const { _isFreshState } = await import('../src/features/post-login-restore.js');
    expect(_isFreshState({ qOk: 0, qNo: 0, sr: { 42: { ef: 2.5, n: 1 } } })).toBe(false);
  });

  test('returns false on null/undefined state (defensive)', async () => {
    const { _isFreshState } = await import('../src/features/post-login-restore.js');
    expect(_isFreshState(null)).toBe(false);
    expect(_isFreshState(undefined)).toBe(false);
  });

  test('treats non-numeric qOk/qNo as zero', async () => {
    const { _isFreshState } = await import('../src/features/post-login-restore.js');
    expect(_isFreshState({ qOk: 'broken', qNo: undefined, sr: {} })).toBe(true);
  });
});

describe('post-login-restore — shouldPromptRestore', () => {
  const FRESH = { qOk: 0, qNo: 0, sr: {} };
  const POPULATED = { qOk: 5, qNo: 3, sr: {} };

  test('returns true on fresh state with valid username and no marker', async () => {
    const { shouldPromptRestore } = await import('../src/features/post-login-restore.js');
    expect(await shouldPromptRestore('alice', FRESH)).toBe(true);
  });

  test('returns false when prior prompt marker exists', async () => {
    const { shouldPromptRestore, _suppressKey } = await import('../src/features/post-login-restore.js');
    localStorage.setItem(_suppressKey('alice'), '1234');
    expect(await shouldPromptRestore('alice', FRESH)).toBe(false);
  });

  test('returns false when local state is populated', async () => {
    const { shouldPromptRestore } = await import('../src/features/post-login-restore.js');
    expect(await shouldPromptRestore('alice', POPULATED)).toBe(false);
  });

  test('returns false on empty/missing username', async () => {
    const { shouldPromptRestore } = await import('../src/features/post-login-restore.js');
    expect(await shouldPromptRestore('', FRESH)).toBe(false);
    expect(await shouldPromptRestore(null, FRESH)).toBe(false);
    expect(await shouldPromptRestore(undefined, FRESH)).toBe(false);
  });

  test('returns false on malformed username (does not match auth regex)', async () => {
    const { shouldPromptRestore } = await import('../src/features/post-login-restore.js');
    // app_users regex: ^[a-z0-9][a-z0-9_-]{2,31}$
    expect(await shouldPromptRestore('AB', FRESH)).toBe(false); // uppercase + too short
    expect(await shouldPromptRestore('-alice', FRESH)).toBe(false); // leading hyphen
    expect(await shouldPromptRestore('alice@bob', FRESH)).toBe(false); // illegal char
  });

  test('localStorage read error is treated as "skip prompt"', async () => {
    const { shouldPromptRestore } = await import('../src/features/post-login-restore.js');
    const spy = vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('quota exceeded or private mode');
    });
    expect(await shouldPromptRestore('alice', FRESH)).toBe(false);
    spy.mockRestore();
  });
});

describe('post-login-restore — auth event subscription', () => {
  test('subscribeAuthEvents is exported from auth.js with stable contract', async () => {
    const { subscribeAuthEvents } = await import('../src/features/auth.js');
    expect(typeof subscribeAuthEvents).toBe('function');
    const fn = vi.fn();
    const unsub = subscribeAuthEvents(fn);
    expect(typeof unsub).toBe('function');
    unsub();
  });
});
