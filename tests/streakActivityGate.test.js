/**
 * IM streak fix (2026-07-18): the day-streak must reflect REAL study activity on
 * LOCAL calendar days — not merely opening the app.
 *
 * Bug: src/core/state.js had an app-open `updateStreak` IIFE that bumped
 * G.S.streak on the first save() of each UTC calendar day. Because save() fires
 * on any state change (including app open), just OPENING the app inflated the
 * streak, and it used UTC (toISOString) day boundaries. G.S.streak is backed up
 * and submitted to the leaderboard, so this inflated the leaderboard.
 *
 * Fix: the streak is advanced ONLY on real activity, on LOCAL days, via
 * advanceStudyStreak() (called from trackDailyActivity when a question is
 * answered). The app-open IIFE no longer touches the streak.
 *
 * Bootstrap mirrors srScore.test.js: shim window + seed FSRS globals before
 * importing spaced-repetition.js (its fsrs-bridge snapshots window.fsr* at load).
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

globalThis.window = globalThis;

const fsrsSrc = readFileSync(resolve(process.cwd(), 'shared', 'fsrs.js'), 'utf-8');
new Function(
  'target',
  fsrsSrc +
    ';Object.assign(target, { FSRS_W, FSRS_DECAY, FSRS_FACTOR, FSRS_RETENTION,' +
    ' fsrsR, fsrsInterval, fsrsInitNew, fsrsUpdate, fsrsMigrateFromSM2, isChronicFail });'
)(globalThis);

let G, advanceStudyStreak, trackDailyActivity, getStudyStreak, getDailyActivity;

beforeAll(async () => {
  G = (await import('../src/core/globals.js')).default;
  const mod = await import('../src/sr/spaced-repetition.js');
  advanceStudyStreak = mod.advanceStudyStreak;
  trackDailyActivity = mod.trackDailyActivity;
  getStudyStreak = mod.getStudyStreak;
  getDailyActivity = mod.getDailyActivity;
});

// Day keys computed the SAME way the readers do (local components vs UTC
// toISOString), decrementing by local date so they line up with getStudyStreak's
// backward walk regardless of the CI timezone.
const localKeyBack = (back = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - back);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const utcKeyBack = (back = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - back);
  return d.toISOString().slice(0, 10);
};

beforeEach(() => {
  G.S = { streak: 0, lastDay: null, dailyAct: {} };
  G.save = vi.fn();
});

// Local-day timestamp (the Date constructor uses LOCAL time), so these are
// deterministic regardless of the CI timezone. January avoids DST edges.
const at = (y, mo, d, h = 12) => new Date(y, mo - 1, d, h, 0, 0, 0).getTime();

describe('advanceStudyStreak — real-activity, local-day streak', () => {
  it('first real study day sets the streak to 1', () => {
    advanceStudyStreak(at(2026, 1, 10, 9));
    expect(G.S.streak).toBe(1);
    expect(G.S.lastDay).toBe('2026-01-10');
  });

  it('a second consecutive LOCAL day increments the streak', () => {
    advanceStudyStreak(at(2026, 1, 10, 9));
    advanceStudyStreak(at(2026, 1, 11, 9));
    expect(G.S.streak).toBe(2);
    expect(G.S.lastDay).toBe('2026-01-11');
  });

  it('multiple study events within the SAME local day count once (idempotent)', () => {
    advanceStudyStreak(at(2026, 1, 10, 8));
    advanceStudyStreak(at(2026, 1, 10, 14));
    advanceStudyStreak(at(2026, 1, 10, 23));
    expect(G.S.streak).toBe(1);
    expect(G.S.lastDay).toBe('2026-01-10');
  });

  it('opening the app on days with no answers does not increment the streak', () => {
    // Day 1: genuine study.
    advanceStudyStreak(at(2026, 1, 10, 9));
    expect(G.S.streak).toBe(1);
    // Days 2 and 3: user only OPENS the app (no questions answered). The app-open
    // path no longer advances the streak, so advanceStudyStreak is not called and
    // the streak does not grow.
    expect(G.S.streak).toBe(1);
    expect(G.S.lastDay).toBe('2026-01-10');
    // Day 4: real study resumes. Because days 2-3 had no activity, the streak did
    // NOT keep climbing — the missed days broke it and it restarts at 1 (it is
    // NOT 4, which is exactly what the old app-open inflation would have produced).
    advanceStudyStreak(at(2026, 1, 13, 9));
    expect(G.S.streak).toBe(1);
  });

  it('trackDailyActivity (a real answered question) advances the streak', () => {
    // First answer of the day -> activity recorded AND streak advanced.
    trackDailyActivity();
    expect(G.S.streak).toBe(1);
    // A second answer the same day does not double-count the streak.
    trackDailyActivity();
    expect(G.S.streak).toBe(1);
  });
});

describe('regression guards: app-open path can no longer inflate the streak', () => {
  const stateSrc = readFileSync(resolve(process.cwd(), 'src', 'core', 'state.js'), 'utf-8');
  const srSrc = readFileSync(resolve(process.cwd(), 'src', 'sr', 'spaced-repetition.js'), 'utf-8');

  it('state.js no longer increments the streak on app open', () => {
    expect(stateSrc).not.toContain('G.S.streak++');
    expect(stateSrc).not.toMatch(/G\.S\.streak\s*=\s*1/);
    // The old UTC-boundary open IIFE is gone.
    expect(stateSrc).not.toContain('function updateStreak(');
  });

  it('the streak is advanced from the real activity path, on local days', () => {
    expect(srSrc).toContain('export function advanceStudyStreak(');
    expect(srSrc).toContain('advanceStudyStreak();'); // called inside trackDailyActivity
    // Streak day-key comes from local Date components, not toISOString (UTC).
    expect(srSrc).toContain('localDayKey');
  });
});

// 2026-07-19: local-day transition for the activity calendar must be
// READ-COMPATIBLE — new writes use the LOCAL key, but existing UTC-keyed history
// must still count (no destructive migration).
describe('dailyAct local-day transition: read-compatible, non-destructive', () => {
  it('new activity is WRITTEN under the local calendar key', () => {
    trackDailyActivity();
    const keys = Object.keys(G.S.dailyAct);
    expect(keys).toEqual([localKeyBack(0)]);
    expect(G.S.dailyAct[localKeyBack(0)].q).toBe(1);
  });

  it('a day stored under the legacy UTC key still counts toward the streak', () => {
    // Seed ONLY the legacy UTC keys for a 3-day run ending today. If getStudyStreak
    // read only local keys it would miss these whenever local != UTC; the both-key
    // reader must still count all three.
    G.S = {
      streak: 0,
      lastDay: null,
      dailyAct: {
        [utcKeyBack(0)]: { q: 3, ok: 2 },
        [utcKeyBack(1)]: { q: 1, ok: 1 },
        [utcKeyBack(2)]: { q: 5, ok: 4 },
      },
    };
    expect(getStudyStreak()).toBe(3);
  });

  it('getDailyActivity accepts BOTH the legacy UTC key and the new local key', () => {
    const today = new Date();
    // legacy UTC-keyed entry
    G.S = { streak: 0, lastDay: null, dailyAct: { [utcKeyBack(0)]: { q: 7, ok: 2 } } };
    expect(getDailyActivity(today)).toEqual({ q: 7, ok: 2 });
    // new local-keyed entry
    G.S = { streak: 0, lastDay: null, dailyAct: { [localKeyBack(0)]: { q: 9, ok: 4 } } };
    expect(getDailyActivity(today)).toEqual({ q: 9, ok: 4 });
  });

  it('writing today does NOT delete/rename a pre-existing legacy UTC entry (non-destructive)', () => {
    // A legacy entry for an earlier day stays intact after a new local-key write.
    const legacy = utcKeyBack(5);
    G.S = { streak: 0, lastDay: null, dailyAct: { [legacy]: { q: 4, ok: 3 } } };
    trackDailyActivity();
    expect(G.S.dailyAct[legacy]).toEqual({ q: 4, ok: 3 }); // untouched
    expect(G.S.dailyAct[localKeyBack(0)].q).toBe(1); // today written under local key
  });
});
