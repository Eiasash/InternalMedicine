/**
 * Tests for src/ui/wrong-review.js — recordResult / wrongCount /
 * buildWrongPool ordering. localStorage is mocked; IDB is absent in the
 * test env so the LS fallback is exercised throughout.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

globalThis.window = globalThis;

// In-memory localStorage shim — vitest's node env has no real one.
function installLS() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i) => Array.from(store.keys())[i] || null,
  };
}

let G, recordResult, wrongCount, buildWrongPool, _resetForTests, loadWrongSet, EXAM_FREQ;

beforeAll(async () => {
  installLS();
  G = (await import('../src/core/globals.js')).default;
  const mod = await import('../src/ui/wrong-review.js');
  recordResult = mod.recordResult;
  wrongCount = mod.wrongCount;
  buildWrongPool = mod.buildWrongPool;
  _resetForTests = mod._resetForTests;
  loadWrongSet = mod.loadWrongSet;
  ({ EXAM_FREQ } = await import('../src/core/constants.js'));
});

beforeEach(() => {
  _resetForTests();
  G.QZ = [
    { ti: 0 }, // index 0
    { ti: 1 }, // index 1
    { ti: 2 }, // index 2
    { ti: 5 }, // index 3 — high freq
  ];
});

describe('recordResult', () => {
  it('adds a question to the wrong set on incorrect', () => {
    recordResult(0, false);
    expect(wrongCount()).toBe(1);
    expect(G.wrongSet.has(0)).toBe(true);
    expect(G.wrongSet.get(0).streak).toBe(0);
  });
  it('correct on a question NOT in the set is a no-op', () => {
    recordResult(0, true);
    expect(wrongCount()).toBe(0);
  });
  it('correct on a question IN the set increments streak', () => {
    recordResult(0, false);
    recordResult(0, true);
    expect(G.wrongSet.get(0).streak).toBe(1);
    expect(wrongCount()).toBe(1);
  });
  it('removes after 2 consecutive correct', () => {
    recordResult(0, false);
    recordResult(0, true);
    recordResult(0, true);
    expect(wrongCount()).toBe(0);
    expect(G.wrongSet.has(0)).toBe(false);
  });
  it('streak resets when re-answered wrong', () => {
    recordResult(0, false);
    recordResult(0, true);
    expect(G.wrongSet.get(0).streak).toBe(1);
    recordResult(0, false); // wrong again
    expect(G.wrongSet.get(0).streak).toBe(0);
    expect(wrongCount()).toBe(1);
  });
  it('non-finite indices are ignored', () => {
    recordResult(NaN, false);
    recordResult(undefined, false);
    expect(wrongCount()).toBe(0);
  });
});

describe('buildWrongPool', () => {
  it('returns empty array on empty set', () => {
    const out = buildWrongPool(G.QZ, new Map(), EXAM_FREQ);
    expect(out).toEqual([]);
  });
  it('preserves only known question indices', () => {
    const m = new Map();
    m.set(0, { ts: Date.now(), streak: 0 });
    m.set(999, { ts: Date.now(), streak: 0 });
    const out = buildWrongPool(G.QZ, m, EXAM_FREQ);
    expect(out).toContain(0);
    expect(out).not.toContain(999);
  });
  it('orders newer entries before older entries (recency dominates)', () => {
    const now = 1_700_000_000_000;
    const m = new Map();
    // Older index 0, newer index 1, even older index 2 — same topic weight
    m.set(0, { ts: now - 10 * 86400000, streak: 0 });
    m.set(1, { ts: now - 1 * 86400000, streak: 0 });
    m.set(2, { ts: now - 30 * 86400000, streak: 0 });
    G.QZ = [{ ti: 0 }, { ti: 0 }, { ti: 0 }];
    const weights = [10];
    const out = buildWrongPool(G.QZ, m, weights, now);
    expect(out).toEqual([1, 0, 2]);
  });
  it('higher-weight topic outranks lower-weight when recency is equal', () => {
    const now = 1_700_000_000_000;
    const m = new Map();
    m.set(0, { ts: now, streak: 0 });
    m.set(1, { ts: now, streak: 0 });
    G.QZ = [{ ti: 0 }, { ti: 1 }];
    const weights = [1, 100]; // topic 1 dominates
    const out = buildWrongPool(G.QZ, m, weights, now);
    expect(out[0]).toBe(1);
    expect(out[1]).toBe(0);
  });
});

describe('persistence (localStorage fallback)', () => {
  it('saves to localStorage and reloads via loadWrongSet', async () => {
    recordResult(0, false);
    recordResult(2, false);
    // wait for debounced save (150ms)
    await new Promise((r) => setTimeout(r, 200));
    const raw = localStorage.getItem('pnimit_wrong_review_v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(Object.keys(parsed)).toEqual(expect.arrayContaining(['0', '2']));

    // Wipe in-memory state and reload from storage
    G.wrongSet = undefined;
    await loadWrongSet();
    expect(wrongCount()).toBe(2);
    expect(G.wrongSet.has(0)).toBe(true);
    expect(G.wrongSet.has(2)).toBe(true);
  });
});
