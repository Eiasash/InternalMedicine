/**
 * Tests for the previously-uncovered helpers in src/sr/spaced-repetition.js:
 *   getTopicStats, getWeakTopics, getStudyStreak,
 *   trackDailyActivity, trackChapterRead, getChaptersDueForReading.
 *
 * Setup mirrors tests/srScore.test.js — load shared/fsrs.js into globalThis
 * before importing spaced-repetition.js so fsrs-bridge.js sees real FSRS
 * functions at module-load time.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

globalThis.window = globalThis;

const fsrsSrc = readFileSync(resolve(process.cwd(), 'shared', 'fsrs.js'), 'utf-8');
const seed = new Function(
  'target',
  fsrsSrc +
    ';Object.assign(target, { FSRS_W, FSRS_DECAY, FSRS_FACTOR, FSRS_RETENTION,' +
    ' fsrsR, fsrsInterval, fsrsInitNew, fsrsUpdate, fsrsMigrateFromSM2, isChronicFail });'
);
seed(globalThis);

let G, getTopicStats, getWeakTopics, getStudyStreak,
  trackDailyActivity, trackChapterRead, getChaptersDueForReading;

beforeAll(async () => {
  G = (await import('../src/core/globals.js')).default;
  const mod = await import('../src/sr/spaced-repetition.js');
  getTopicStats = mod.getTopicStats;
  getWeakTopics = mod.getWeakTopics;
  getStudyStreak = mod.getStudyStreak;
  trackDailyActivity = mod.trackDailyActivity;
  trackChapterRead = mod.trackChapterRead;
  getChaptersDueForReading = mod.getChaptersDueForReading;
});

beforeEach(() => {
  G.S = { sr: {}, streak: 0, qOk: 0, qNo: 0, dailyAct: {}, chReads: {} };
  G.QZ = [
    { ti: 0 }, { ti: 0 }, { ti: 0 },      // topic 0 — 3 entries
    { ti: 1 }, { ti: 1 }, { ti: 1 }, { ti: 1 }, // topic 1 — 4 entries
    { ti: 2 },                             // topic 2 — 1 entry
  ];
  G.save = vi.fn();
});

describe('getTopicStats', () => {
  it('returns {} when sr is empty', () => {
    expect(getTopicStats()).toEqual({});
  });

  it('counts n>0 as ok, otherwise no, and rolls up by topic', () => {
    G.S.sr = {
      0: { n: 1 }, 1: { n: 2 }, 2: { n: 0 },    // topic 0: 2 ok, 1 no
      3: { n: 3 }, 4: { n: 0 }, 5: { n: 0 },    // topic 1: 1 ok, 2 no
    };
    const st = getTopicStats();
    expect(st[0]).toEqual({ ok: 2, no: 1, tot: 3 });
    expect(st[1]).toEqual({ ok: 1, no: 2, tot: 3 });
    expect(st[2]).toBeUndefined();
  });

  it('skips sr entries whose qIdx no longer exists in G.QZ', () => {
    G.S.sr = { 0: { n: 1 }, 999: { n: 1 } };
    const st = getTopicStats();
    expect(st[0].tot).toBe(1);
    expect(Object.keys(st).length).toBe(1);
  });

  it('defaults ti=0 when question lacks a ti field', () => {
    G.QZ = [{}];
    G.S.sr = { 0: { n: 1 } };
    expect(getTopicStats()[0]).toEqual({ ok: 1, no: 0, tot: 1 });
  });
});

describe('getWeakTopics', () => {
  it('returns [] when no topic has >=3 answered questions', () => {
    G.S.sr = { 0: { n: 1 }, 1: { n: 1 } };
    expect(getWeakTopics()).toEqual([]);
  });

  it('sorts by pct ascending and slices to n (default 3)', () => {
    G.S.sr = {
      0: { n: 0 }, 1: { n: 0 }, 2: { n: 0 },          // topic 0: 0% (3/0)
      3: { n: 1 }, 4: { n: 1 }, 5: { n: 1 }, 6: { n: 0 }, // topic 1: 75%
      7: { n: 0 },                                     // topic 2: ignored (<3)
    };
    const weak = getWeakTopics();
    expect(weak.length).toBe(2);
    expect(weak[0].ti).toBe(0);
    expect(weak[0].pct).toBe(0);
    expect(weak[1].ti).toBe(1);
    expect(weak[1].pct).toBe(75);
  });

  it('respects a custom n', () => {
    G.QZ = Array.from({ length: 12 }, (_, i) => ({ ti: Math.floor(i / 3) }));
    for (let i = 0; i < 12; i++) G.S.sr[i] = { n: i % 2 };
    expect(getWeakTopics(1).length).toBe(1);
    expect(getWeakTopics(10).length).toBe(4);
  });
});

describe('getStudyStreak', () => {
  function isoDayOffset(offset) {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
  }

  it('returns G.S.streak fallback when dailyAct is missing', () => {
    G.S.dailyAct = undefined;
    G.S.streak = 17;
    expect(getStudyStreak()).toBe(17);
  });

  it('counts today-only as streak of 1', () => {
    G.S.dailyAct[isoDayOffset(0)] = { q: 3, ok: 2 };
    expect(getStudyStreak()).toBe(1);
  });

  it('counts consecutive days ending today', () => {
    for (let i = 0; i < 5; i++) G.S.dailyAct[isoDayOffset(i)] = { q: 1, ok: 1 };
    expect(getStudyStreak()).toBe(5);
  });

  it('breaks the streak on a gap day (but allows a missing today)', () => {
    G.S.dailyAct[isoDayOffset(1)] = { q: 1, ok: 1 };
    G.S.dailyAct[isoDayOffset(2)] = { q: 1, ok: 1 };
    // gap at offset 3
    G.S.dailyAct[isoDayOffset(4)] = { q: 1, ok: 1 };
    expect(getStudyStreak()).toBe(2);
  });

  it('does not count a day with q=0', () => {
    G.S.dailyAct[isoDayOffset(0)] = { q: 0, ok: 0 };
    expect(getStudyStreak()).toBe(0);
  });
});

describe('trackDailyActivity', () => {
  it('creates today\'s entry on first call', () => {
    trackDailyActivity();
    const today = new Date().toISOString().slice(0, 10);
    expect(G.S.dailyAct[today]).toEqual({ q: 1, ok: 0 });
  });

  it('increments q on repeated calls within the same day', () => {
    trackDailyActivity();
    trackDailyActivity();
    trackDailyActivity();
    const today = new Date().toISOString().slice(0, 10);
    expect(G.S.dailyAct[today].q).toBe(3);
  });

  it('prunes history down to 90 days', () => {
    for (let i = 0; i < 120; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      G.S.dailyAct[d.toISOString().slice(0, 10)] = { q: 1, ok: 1 };
    }
    trackDailyActivity();
    expect(Object.keys(G.S.dailyAct).length).toBe(90);
  });
});

describe('trackChapterRead + getChaptersDueForReading', () => {
  it('records a read timestamp keyed by source_ch and calls G.save', () => {
    trackChapterRead('harrison', '12');
    expect(G.S.chReads.harrison_12).toBeTypeOf('number');
    expect(G.save).toHaveBeenCalledTimes(1);
  });

  it('returns [] when chReads is empty/missing', () => {
    G.S.chReads = undefined;
    expect(getChaptersDueForReading('harrison')).toEqual([]);
  });

  it('returns only chapters older than the day threshold, from the matching source', () => {
    const now = Date.now();
    G.S.chReads = {
      harrison_1: now - 40 * 86400000,   // 40d old → due
      harrison_2: now - 10 * 86400000,   // 10d old → not due
      articles_1: now - 60 * 86400000,   // other source → ignored
    };
    const due = getChaptersDueForReading('harrison', 30);
    expect(due.length).toBe(1);
    expect(due[0].ch).toBe('1');
    expect(due[0].daysSince).toBeGreaterThanOrEqual(40);
  });

  it('sorts results from oldest to newest', () => {
    const now = Date.now();
    G.S.chReads = {
      harrison_a: now - 35 * 86400000,
      harrison_b: now - 90 * 86400000,
      harrison_c: now - 45 * 86400000,
    };
    const due = getChaptersDueForReading('harrison', 30);
    expect(due.map(d => d.ch)).toEqual(['b', 'c', 'a']);
  });
});
