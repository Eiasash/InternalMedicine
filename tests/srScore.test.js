/**
 * Tests for `srScore` in `src/sr/spaced-repetition.js`.
 *
 * `srScore` is the core SRS mutation: initialises FSRS state, migrates from
 * SM-2 for legacy entries, updates stability/difficulty, schedules the next
 * review, maintains an answer-time moving average, and bumps session counters.
 * A regression here silently corrupts every user's review schedule.
 *
 * Implementation notes:
 *  - `src/sr/fsrs-bridge.js` does `const w = window; export const fsrsR = w.fsrsR;`
 *    at module load. `shared/fsrs.js` is designed to load in a browser via
 *    `<script>` and populate the globals.
 *  - Under Node/vitest we bypass the window dance entirely by `vi.mock`-ing
 *    the bridge. The factory loads `shared/fsrs.js` via `new Function` (the
 *    same trick `tests/sharedFsrs.test.js` already uses) and returns its
 *    globals as ESM exports. This guarantees the real FSRS code is what gets
 *    exercised \u2014 no drift risk.
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/sr/fsrs-bridge.js', async () => {
  const { readFileSync } = await import('fs');
  const { resolve } = await import('path');
  const fsrsSrc = readFileSync(resolve(process.cwd(), 'shared', 'fsrs.js'), 'utf-8');
  const factory = new Function(
    fsrsSrc +
      ';\nreturn { FSRS_W, FSRS_DECAY, FSRS_FACTOR, FSRS_RETENTION,' +
      ' fsrsR, fsrsInterval, fsrsInitNew, fsrsUpdate, fsrsMigrateFromSM2, isChronicFail };'
  );
  return factory();
});

// Imports resolve AFTER vi.mock is hoisted, so spaced-repetition.js
// picks up the mocked bridge.
const G = (await import('../src/core/globals.js')).default;
const { srScore, getDueQuestions, isExamTrap } = await import(
  '../src/sr/spaced-repetition.js'
);

beforeEach(() => {
  G.S = {
    sr: {},
    streak: 0,
    qOk: 0,
    qNo: 0,
    dailyAct: {},
  };
  G.QZ = [{ ti: 0 }, { ti: 1 }, { ti: 2 }];
  G.qStartTime = Date.now() - 5000; // 5s ago
  G._sessionOk = 0;
  G._sessionNo = 0;
  G._sessionBest = {};
  G._sessionWorse = {};
  G.save = vi.fn();
});

describe('srScore \u2014 first-time call on a fresh entry', () => {
  it('creates an sr entry with tot=1, ok=1 for a correct answer', () => {
    srScore(0, true);
    const s = G.S.sr[0];
    expect(s).toBeDefined();
    expect(s.tot).toBe(1);
    expect(s.ok).toBe(1);
    expect(s.n).toBe(1);
  });

  it('creates an sr entry with tot=1, ok=0 for a wrong answer', () => {
    srScore(0, false);
    const s = G.S.sr[0];
    expect(s.tot).toBe(1);
    expect(s.ok).toBe(0);
    expect(s.n).toBe(0);
  });

  it('initialises fsrsS / fsrsD via fsrsInitNew on first call', () => {
    srScore(0, true);
    const s = G.S.sr[0];
    expect(typeof s.fsrsS).toBe('number');
    expect(typeof s.fsrsD).toBe('number');
    expect(s.fsrsS).toBeGreaterThan(0);
    expect(s.fsrsD).toBeGreaterThanOrEqual(1);
    expect(s.fsrsD).toBeLessThanOrEqual(10);
  });

  it('schedules a next review strictly in the future', () => {
    const now = Date.now();
    srScore(0, true);
    expect(G.S.sr[0].next).toBeGreaterThan(now);
  });

  it('records an answer time (at) from qStartTime', () => {
    srScore(0, true);
    const s = G.S.sr[0];
    // qStartTime was 5s ago in beforeEach
    expect(s.ts.length).toBe(1);
    expect(s.at).toBeGreaterThanOrEqual(4);
    expect(s.at).toBeLessThanOrEqual(8);
  });

  it('invokes G.save so the mutation persists', () => {
    srScore(0, true);
    expect(G.save).toHaveBeenCalledTimes(1);
  });
});

describe('srScore \u2014 repeated calls maintain invariants', () => {
  it('wrong answer resets n to 0, keeps tot/ok accurate', () => {
    srScore(1, true);
    srScore(1, true);
    srScore(1, false);
    const s = G.S.sr[1];
    expect(s.tot).toBe(3);
    expect(s.ok).toBe(2);
    expect(s.n).toBe(0);
  });

  it('correct streak increments n each time', () => {
    srScore(2, true);
    srScore(2, true);
    srScore(2, true);
    expect(G.S.sr[2].n).toBe(3);
  });

  it('ef stays within [1.3, 2.5]', () => {
    for (let i = 0; i < 10; i++) {
      srScore(0, i % 2 === 0);
      const ef = G.S.sr[0].ef;
      expect(ef).toBeGreaterThanOrEqual(1.3);
      expect(ef).toBeLessThanOrEqual(2.5);
    }
  });

  it('fsrsD stays within [1, 10]', () => {
    for (let i = 0; i < 10; i++) {
      srScore(0, i % 3 !== 0);
      const d = G.S.sr[0].fsrsD;
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(10);
    }
  });

  it('answer-time array ts is capped at 10 entries', () => {
    for (let i = 0; i < 15; i++) {
      G.qStartTime = Date.now() - 2000;
      srScore(0, true);
    }
    expect(G.S.sr[0].ts.length).toBe(10);
  });

  it('session counters track correct vs wrong across qIdx', () => {
    srScore(0, true);
    srScore(1, false);
    srScore(2, true);
    expect(G._sessionOk).toBe(2);
    expect(G._sessionNo).toBe(1);
  });

  it('per-topic session best/worse counters update from G.QZ[qIdx].ti', () => {
    srScore(0, true); // ti=0 -> best
    srScore(1, false); // ti=1 -> worse
    srScore(0, true); // ti=0 -> best again
    expect(G._sessionBest[0]).toBe(2);
    expect(G._sessionWorse[1]).toBe(1);
  });
});

describe('srScore \u2014 migration from legacy SM-2 entries', () => {
  it('migrates an existing SM-2 entry (no fsrsS yet) via fsrsMigrateFromSM2', () => {
    G.S.sr[0] = {
      ef: 2.1,
      n: 3,
      next: Date.now() + 3 * 86400000,
      ts: [4, 5, 6],
      at: 5,
      tot: 3,
      ok: 3,
    };
    srScore(0, true);
    const s = G.S.sr[0];
    expect(typeof s.fsrsS).toBe('number');
    expect(typeof s.fsrsD).toBe('number');
    expect(s.fsrsD).toBeGreaterThanOrEqual(1);
    expect(s.fsrsD).toBeLessThanOrEqual(10);
    expect(s.tot).toBe(4);
    expect(s.ok).toBe(4);
  });
});

describe('getDueQuestions + isExamTrap (stateful sibling exports)', () => {
  it('getDueQuestions returns indices whose next <= now, capped at 20', () => {
    const now = Date.now();
    for (let i = 0; i < 30; i++) G.S.sr[i] = { next: now - 1000 };
    G.S.sr[99] = { next: now + 86400000 }; // future
    const due = getDueQuestions();
    expect(due.length).toBe(20);
    expect(due).not.toContain(99);
    expect(typeof due[0]).toBe('number');
  });

  it('isExamTrap requires >=3 attempts AND >=40% on one distractor', () => {
    G.S.sr[0] = { tot: 10, wc: { 2: 5 } };
    expect(isExamTrap(0)).toBe(true);

    G.S.sr[1] = { tot: 2, wc: { 2: 1 } };
    expect(isExamTrap(1)).toBe(false);

    G.S.sr[2] = { tot: 10, wc: { 1: 2, 2: 2 } };
    expect(isExamTrap(2)).toBe(false);
  });
});
