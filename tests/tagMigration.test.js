/**
 * Tests for the exam-year tag migration IIFE in `src/core/state.js`.
 *
 * v9.52 renamed past-exam tags from `Jun22`/`May24`/etc. to canonical
 * `2022-Jun`/`2024-May`. The state module runs a one-time migration on
 * load: walks persisted localStorage, renames matching string values,
 * marks `__tagMigrationV1` to avoid rerunning.
 *
 * Why the first attempt (reverted in #18) failed CI:
 *  - state.js's `updateStreak` IIFE calls `G.save()` which schedules a
 *    150 ms `setTimeout`. Without fake timers, that timer can fire
 *    during the NEXT test and clobber its localStorage. Using
 *    `vi.useFakeTimers()` keeps the timer queued so it never runs.
 *  - `localStorage` has to exist BEFORE state.js's module load (not just
 *    by the time `beforeEach` runs), so we shim at the top of this file.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function installLocalStorageShim() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}

// Install at module-top level so any module loaded via static import
// that touches localStorage during evaluation sees a valid shim.
installLocalStorageShim();

const LS = 'pnimit_mega';

beforeEach(() => {
  installLocalStorageShim();
  vi.resetModules();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function loadState() {
  await import('../src/core/state.js');
}

describe('migrateExamYearTags — string rewrites', () => {
  it('renames old tags in a top-level string array', async () => {
    localStorage.setItem(LS, JSON.stringify({ years: ['Jun22', 'Oct24', 'Jun25'] }));
    await loadState();
    const stored = JSON.parse(localStorage.getItem(LS));
    expect(stored.years).toEqual(['2022-Jun', '2024-Oct', '2025-Jun']);
  });

  it('renames old tags nested inside an object', async () => {
    localStorage.setItem(LS, JSON.stringify({ filters: { year: 'May24' }, sr: {} }));
    await loadState();
    const stored = JSON.parse(localStorage.getItem(LS));
    expect(stored.filters.year).toBe('2024-May');
  });

  it('leaves unrelated strings unchanged', async () => {
    localStorage.setItem(LS, JSON.stringify({ note: 'Jun22 is the best', misc: 42 }));
    await loadState();
    const stored = JSON.parse(localStorage.getItem(LS));
    expect(stored.note).toBe('Jun22 is the best'); // substring, not exact match
    expect(stored.misc).toBe(42);
  });

  it('does NOT rename object keys (value-only migration)', async () => {
    localStorage.setItem(LS, JSON.stringify({ byYear: { Jun22: 'data', May24: 'x' } }));
    await loadState();
    const stored = JSON.parse(localStorage.getItem(LS));
    expect(Object.keys(stored.byYear).sort()).toEqual(['Jun22', 'May24']);
  });
});

describe('migrateExamYearTags — sentinel & idempotency', () => {
  it('sets __tagMigrationV1 after running', async () => {
    localStorage.setItem(LS, JSON.stringify({ years: ['Jun23'] }));
    await loadState();
    const stored = JSON.parse(localStorage.getItem(LS));
    expect(stored.__tagMigrationV1).toBe(true);
  });

  it('does not re-run when sentinel is already set', async () => {
    localStorage.setItem(LS, JSON.stringify({ __tagMigrationV1: true, years: ['Jun22'] }));
    await loadState();
    const stored = JSON.parse(localStorage.getItem(LS));
    expect(stored.years).toEqual(['Jun22']);
  });
});

describe('migrateExamYearTags — defensive paths', () => {
  it('tolerates corrupt JSON in localStorage', async () => {
    localStorage.setItem(LS, '{this is not json');
    await expect(loadState()).resolves.not.toThrow();
  });

  it('handles empty localStorage without throwing', async () => {
    expect(localStorage.getItem(LS)).toBeNull();
    await expect(loadState()).resolves.not.toThrow();
  });
});
