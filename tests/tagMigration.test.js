/**
 * Tests for the exam-year tag migration IIFE in `src/core/state.js`.
 *
 * v9.52 renamed past-exam tags from `Jun22`/`May24`/etc. to canonical
 * `2022-Jun`/`2024-May`. The state module runs a one-time migration on
 * load: walks persisted localStorage, renames matching string values,
 * marks `__tagMigrationV1` to avoid rerunning.
 *
 * A regression here would either:
 *  - re-run the migration and corrupt already-migrated state, or
 *  - miss a nested field and leave old tags in filter selections.
 *
 * Each test uses `vi.resetModules()` + dynamic import so the IIFE
 * re-runs against freshly-seeded localStorage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

function installLocalStorageShim() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

const LS = 'pnimit_mega';

beforeEach(() => {
  installLocalStorageShim();
  vi.resetModules();
});

async function loadState() {
  await import('../src/core/state.js');
}

describe('migrateExamYearTags — string rewrites', () => {
  it('renames old tags in a top-level string array', async () => {
    localStorage.setItem(
      LS,
      JSON.stringify({ years: ['Jun22', 'Oct24', 'Jun25'] })
    );
    await loadState();
    const stored = JSON.parse(localStorage.getItem(LS));
    expect(stored.years).toEqual(['2022-Jun', '2024-Oct', '2025-Jun']);
  });

  it('renames old tags nested inside an object', async () => {
    localStorage.setItem(
      LS,
      JSON.stringify({ filters: { year: 'May24' }, sr: {} })
    );
    await loadState();
    const stored = JSON.parse(localStorage.getItem(LS));
    expect(stored.filters.year).toBe('2024-May');
  });

  it('leaves unrelated strings unchanged', async () => {
    localStorage.setItem(
      LS,
      JSON.stringify({ note: 'Jun22 is the best', misc: 42 })
    );
    await loadState();
    const stored = JSON.parse(localStorage.getItem(LS));
    expect(stored.note).toBe('Jun22 is the best'); // substring, not exact match
    expect(stored.misc).toBe(42);
  });

  it('does NOT rename object keys (value-only migration)', async () => {
    // If someone used exam tags as map keys, those stay.
    localStorage.setItem(
      LS,
      JSON.stringify({ byYear: { Jun22: 'data', May24: 'x' } })
    );
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
    // Seed with sentinel AND a raw old tag that should NOT be touched.
    localStorage.setItem(
      LS,
      JSON.stringify({ __tagMigrationV1: true, years: ['Jun22'] })
    );
    await loadState();
    const stored = JSON.parse(localStorage.getItem(LS));
    // Migration was skipped; old tag survives unchanged.
    expect(stored.years).toEqual(['Jun22']);
  });
});

describe('migrateExamYearTags — defensive paths', () => {
  it('tolerates corrupt JSON in localStorage', async () => {
    localStorage.setItem(LS, '{this is not json');
    // Must not throw during module load.
    await expect(loadState()).resolves.not.toThrow();
  });

  it('is a no-op when localStorage has no entry', async () => {
    expect(localStorage.getItem(LS)).toBeNull();
    await loadState();
    expect(localStorage.getItem(LS)).not.toBeNull();
    // state.js initialises G.S and (via setTimeout) later persists it,
    // but the migration IIFE itself returns early when raw is null.
  });
});
