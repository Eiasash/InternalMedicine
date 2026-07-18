/**
 * IM-8 regression: getDueQuestions (src/sr/spaced-repetition.js) must return the
 * MOST-OVERDUE questions first (sorted by scheduled `next` ascending) before
 * capping the review pool at 20 — previously it sliced in numeric-index order,
 * hiding older-due items. And getDueCount() must report the TRUE due total, not
 * the min(20,...) pool cap used by badges.
 *
 * Fails on the pre-fix code (numeric-order slice; no getDueCount export);
 * passes on the fixed code.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import G from '../src/core/globals.js';
import { getDueQuestions, getDueCount } from '../src/sr/spaced-repetition.js';

beforeEach(() => {
  G.S = { sr: {}, qOk: 0, qNo: 0 };
  G.QZ = Array.from({ length: 60 }, (_, i) => ({ ti: i % 24 }));
  G.save = vi.fn();
});

describe('IM-8 getDueQuestions ordering + getDueCount total', () => {
  it('returns the 20 most-overdue first (sorted by next ascending)', () => {
    const now = Date.now();
    // Higher index = more overdue (smaller `next`). 25 due entries total.
    for (let i = 0; i < 25; i++) G.S.sr[i] = { next: now - i * 1000 };
    G.S.sr[99] = { next: now + 1e7 }; // not due

    const due = getDueQuestions();
    expect(due.length).toBe(20);
    // Most overdue (index 24, smallest next) is first.
    expect(due[0]).toBe(24);
    expect(due[1]).toBe(23);
    // The 20 returned are the MOST overdue (indices 24..5), not the numeric 0..19.
    expect(due).toContain(24);
    expect(due).toContain(5);
    expect(due).not.toContain(0);
    expect(due).not.toContain(4);
    expect(due).not.toContain(99);
    // `next` is non-decreasing across the returned pool.
    const nexts = due.map((i) => G.S.sr[i].next);
    for (let k = 1; k < nexts.length; k++) {
      expect(nexts[k]).toBeGreaterThanOrEqual(nexts[k - 1]);
    }
  });

  it('getDueCount reflects the TRUE due total, not the 20-item pool cap', () => {
    const now = Date.now();
    for (let i = 0; i < 25; i++) G.S.sr[i] = { next: now - 1000 };
    G.S.sr[99] = { next: now + 1e7 };
    expect(getDueQuestions().length).toBe(20); // pool is capped
    expect(getDueCount()).toBe(25); // count is NOT capped
  });

  it('getDueCount is 0 when nothing is due', () => {
    const now = Date.now();
    for (let i = 0; i < 5; i++) G.S.sr[i] = { next: now + 1e7 };
    expect(getDueCount()).toBe(0);
    expect(getDueQuestions()).toEqual([]);
  });
});
