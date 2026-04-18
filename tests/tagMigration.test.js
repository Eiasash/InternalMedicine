/**
 * Tests for src/core/tagMigration.js — the one-time exam-year tag rewrite
 * that runs on state load (Jun21 → 2021-Jun, etc).
 *
 * The CI failure on the previously-parked version came from importing state.js
 * directly: its top-level IIFE + updateStreak() + IndexedDB migration pulled
 * in side effects that don't belong in unit tests. This file tests the pure
 * `migrateTags` + `migrateStoredTags` functions that state.js now delegates to,
 * matching the realSanitize pattern.
 *
 * Analysis doc §3.3 / §3.4.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  migrateTags,
  migrateStoredTags,
  TAG_MIGRATION_MAP,
  TAG_MIGRATION_SENTINEL,
} from '../src/core/tagMigration.js';

function makeLocalStorageShim() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
    _raw: store,
  };
}

describe('migrateTags — pure function', () => {
  it('rewrites every documented MAP key', () => {
    const s = { a: 'Jun21', b: 'Jun22', c: 'Jun23', d: 'May24', e: 'Oct24', f: 'Jun25' };
    migrateTags(s);
    expect(s.a).toBe('2021-Jun');
    expect(s.b).toBe('2022-Jun');
    expect(s.c).toBe('2023-Jun');
    expect(s.d).toBe('2024-May');
    expect(s.e).toBe('2024-Oct');
    expect(s.f).toBe('2025-Jun');
  });

  it('leaves unrelated strings untouched', () => {
    const s = { year: '2021-Jun', junk: 'Jun20', full: 'June 2021' };
    migrateTags(s);
    expect(s.year).toBe('2021-Jun');
    expect(s.junk).toBe('Jun20');
    expect(s.full).toBe('June 2021');
  });

  it('walks into nested arrays', () => {
    const s = { selectedYears: ['Jun21', 'Jun25', 'already-good'] };
    migrateTags(s);
    expect(s.selectedYears).toEqual(['2021-Jun', '2025-Jun', 'already-good']);
  });

  it('walks into nested objects', () => {
    const s = { filters: { exam: { pick: 'May24' } }, tags: { q1: 'Oct24' } };
    migrateTags(s);
    expect(s.filters.exam.pick).toBe('2024-May');
    expect(s.tags.q1).toBe('2024-Oct');
  });

  it('sets the sentinel on plain-object input', () => {
    const s = { a: 'Jun21' };
    migrateTags(s);
    expect(s[TAG_MIGRATION_SENTINEL]).toBe(true);
  });

  it('does NOT set the sentinel on array input', () => {
    const s = ['Jun21', 'Jun22'];
    migrateTags(s);
    expect(s).toEqual(['2021-Jun', '2022-Jun']);
    expect(s[TAG_MIGRATION_SENTINEL]).toBeUndefined();
  });

  it('is idempotent — second run is a no-op', () => {
    const s = { a: 'Jun21' };
    migrateTags(s);
    // Simulate a user tag that LOOKS like a pre-migration key but was added
    // after migration — the sentinel must guard against re-walking.
    s.a = 'Jun21';
    migrateTags(s);
    expect(s.a).toBe('Jun21');
  });

  it('skips non-object input without throwing', () => {
    expect(migrateTags(null)).toBe(null);
    expect(migrateTags(undefined)).toBe(undefined);
    expect(migrateTags(42)).toBe(42);
    expect(migrateTags('Jun21')).toBe('Jun21');
  });

  it('MAP is frozen — can\'t be mutated at runtime', () => {
    expect(Object.isFrozen(TAG_MIGRATION_MAP)).toBe(true);
  });

  it('MAP covers every known exam year', () => {
    // Lock the shape so adding a new year forces a CHANGELOG mention.
    expect(Object.keys(TAG_MIGRATION_MAP).sort()).toEqual(
      ['Jun21', 'Jun22', 'Jun23', 'Jun25', 'May24', 'Oct24'].sort()
    );
  });
});

describe('migrateStoredTags — localStorage wrapper', () => {
  let ls;
  beforeEach(() => { ls = makeLocalStorageShim(); });

  it('rewrites persisted state and bumps the sentinel', () => {
    ls.setItem('pnimit_mega', JSON.stringify({ selectedYears: ['Jun21', 'Jun25'] }));
    migrateStoredTags('pnimit_mega', ls);
    const after = JSON.parse(ls.getItem('pnimit_mega'));
    expect(after.selectedYears).toEqual(['2021-Jun', '2025-Jun']);
    expect(after[TAG_MIGRATION_SENTINEL]).toBe(true);
  });

  it('no-ops on missing key', () => {
    migrateStoredTags('absent', ls);
    expect(ls.getItem('absent')).toBeNull();
  });

  it('no-ops when sentinel already set', () => {
    const already = { selectedYears: ['Jun21'], [TAG_MIGRATION_SENTINEL]: true };
    ls.setItem('pnimit_mega', JSON.stringify(already));
    migrateStoredTags('pnimit_mega', ls);
    const after = JSON.parse(ls.getItem('pnimit_mega'));
    // Jun21 survives because the sentinel guarded it — no rewrite.
    expect(after.selectedYears).toEqual(['Jun21']);
  });

  it('swallows corrupt JSON and leaves the key untouched', () => {
    ls.setItem('pnimit_mega', '{not-json');
    expect(() => migrateStoredTags('pnimit_mega', ls)).not.toThrow();
    expect(ls.getItem('pnimit_mega')).toBe('{not-json');
  });

  it('handles null-parsed state without throwing or writing', () => {
    ls.setItem('pnimit_mega', 'null');
    migrateStoredTags('pnimit_mega', ls);
    // Shouldn't corrupt the stored value.
    expect(ls.getItem('pnimit_mega')).toBe('null');
  });

  it('no-ops when storage is not available (SSR / node)', () => {
    expect(() => migrateStoredTags('pnimit_mega', undefined)).not.toThrow();
  });
});
