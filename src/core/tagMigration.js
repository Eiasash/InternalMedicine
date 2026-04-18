// Exam-year tag migration (Jun21 → 2021-Jun etc).
//
// Extracted from state.js so the walk + sentinel contract can be tested
// without pulling in localStorage/IndexedDB side effects. state.js calls
// migrateStoredTags() once on module load.
//
// Invariants (locked by tests/tagMigration.test.js):
//   1. Rename applies to MAP keys only; other strings untouched.
//   2. Walk reaches nested arrays and objects.
//   3. Sentinel `__tagMigrationV1=true` is set on the top-level plain-object
//      state so repeat runs are a no-op.
//   4. Already-migrated state (sentinel present) is returned unchanged.
//   5. Non-object input (null / primitive / array) is returned as-is and
//      the sentinel is NOT added.
//   6. Corrupt JSON in storage is swallowed by migrateStoredTags and the
//      key is left untouched; a bad parse never throws out of the IIFE.
//
// MAP must stay in sync with CHANGELOG entry for the year it was added —
// removing a row loses user filter selections on next load. Add rows,
// don't mutate or delete, and bump the sentinel if semantics change
// (e.g. __tagMigrationV2).

export const TAG_MIGRATION_MAP = Object.freeze({
  Jun21: '2021-Jun',
  Jun22: '2022-Jun',
  Jun23: '2023-Jun',
  May24: '2024-May',
  Oct24: '2024-Oct',
  Jun25: '2025-Jun',
});

export const TAG_MIGRATION_SENTINEL = '__tagMigrationV1';

function rename(v, map) {
  if (typeof v !== 'string') return v;
  return Object.prototype.hasOwnProperty.call(map, v) ? map[v] : v;
}

function walk(obj, map) {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const w = rename(obj[i], map);
      if (w !== obj[i]) obj[i] = w;
      else if (obj[i] && typeof obj[i] === 'object') walk(obj[i], map);
    }
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      const w = rename(v, map);
      if (w !== v) obj[k] = w;
      else if (v && typeof v === 'object') walk(v, map);
    }
  }
}

/**
 * Migrate tag strings inside a state tree.
 * Mutates the input; returns the same reference for chaining.
 * Idempotent — sentinel check short-circuits on already-migrated input.
 */
export function migrateTags(obj, map = TAG_MIGRATION_MAP) {
  if (!obj || typeof obj !== 'object') return obj;
  if (obj[TAG_MIGRATION_SENTINEL]) return obj;
  walk(obj, map);
  if (!Array.isArray(obj)) obj[TAG_MIGRATION_SENTINEL] = true;
  return obj;
}

/**
 * Side-effectful wrapper used at module load by state.js.
 * Reads `key` from localStorage, migrates, writes back. Never throws.
 */
export function migrateStoredTags(key, storage = globalThis.localStorage) {
  try {
    if (!storage) return;
    const raw = storage.getItem(key);
    if (!raw) return;
    const s = JSON.parse(raw);
    if (!s || s[TAG_MIGRATION_SENTINEL]) return;
    migrateTags(s);
    storage.setItem(key, JSON.stringify(s));
  } catch (_) {
    /* corrupt LS — first save will overwrite */
  }
}
