/**
 * Honest stats — CI guard against scoring functions returning confident-looking
 * numbers when fed sparse or empty state.
 *
 * This whole class of bug is what produced the v9.91.0 incident:
 *   - Topic Mastery Heatmap showed 100% on every touched topic because the
 *     formula used FSRS R only (R≈1 right after any review, right or wrong).
 *   - Est. Score showed 60% because topics with <3 answers were imputed
 *     acc=0.60 — making the score collapse to ~60% on sparse data.
 *
 * The principle codified here: if the data is too sparse to produce a real
 * measurement, the scoring function MUST return null (UI shows "—") rather
 * than a default value that LOOKS like a measurement.
 *
 * Add a new scoring function to the app? Add a case here.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
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

let G, computeTopicMastery, topicCardMastery, calcEstScore;

beforeAll(async () => {
  G = (await import('../src/core/globals.js')).default;
  const heatmap = await import('../src/ui/heatmap.js');
  computeTopicMastery = heatmap.computeTopicMastery;
  topicCardMastery = heatmap.topicCardMastery;
  const trackView = await import('../src/ui/track-view.js');
  calcEstScore = trackView.calcEstScore;
});

beforeEach(() => {
  G.S = { sr: {}, ts: {} };
  G.QZ = [];
  // Seed 24 topics × 3 questions for any test that uses topic indices.
  for (let ti = 0; ti < 24; ti++) {
    for (let j = 0; j < 3; j++) G.QZ.push({ ti, q: `t${ti}q${j}`, o: ['a','b','c','d'], c: 0 });
  }
});

describe('honest stats — calcEstScore', () => {
  it('returns null for completely empty state (zero answers)', () => {
    expect(calcEstScore()).toBeNull();
  });

  it('returns null when only 1 topic has data', () => {
    G.S.ts[0] = { ok: 5, tot: 10, no: 5 };
    expect(calcEstScore()).toBeNull();
  });

  it('returns null when only 2 topics have data (need ≥3)', () => {
    G.S.ts[0] = { ok: 5, tot: 10, no: 5 };
    G.S.ts[1] = { ok: 3, tot: 10, no: 7 };
    expect(calcEstScore()).toBeNull();
  });

  it('does NOT default to 60% on sparse data — never returns a number close to 60 with empty state', () => {
    // Regression: pre-v9.92.0 this returned 60 by imputing acc=0.60 to <3-tot topics.
    expect(calcEstScore()).not.toBe(60);
    expect(calcEstScore()).not.toBe(0.6);
  });

  it('returns a real number once 3+ topics have ≥3 answers each', () => {
    G.S.ts[0] = { ok: 3, tot: 3, no: 0 };
    G.S.ts[1] = { ok: 3, tot: 3, no: 0 };
    G.S.ts[2] = { ok: 3, tot: 3, no: 0 };
    const score = calcEstScore();
    expect(score).not.toBeNull();
    expect(typeof score).toBe('number');
  });

  it('topics with <3 answers do NOT contribute to the score', () => {
    // Three topics with full data → score ≈ 100. Adding a fourth topic with
    // 1 wrong answer must NOT pull the score down (it should be excluded).
    G.S.ts[0] = { ok: 3, tot: 3, no: 0 };
    G.S.ts[1] = { ok: 3, tot: 3, no: 0 };
    G.S.ts[2] = { ok: 3, tot: 3, no: 0 };
    const baseScore = calcEstScore();
    G.S.ts[3] = { ok: 0, tot: 1, no: 1 }; // <3 → must be ignored
    expect(calcEstScore()).toBe(baseScore);
  });
});

describe('honest stats — topicCardMastery', () => {
  it('returns null when card has never been answered (tot=0)', () => {
    expect(topicCardMastery({ fsrsS: 5, lastReview: Date.now() })).toBeNull();
    expect(topicCardMastery({ fsrsS: 5, lastReview: Date.now(), tot: 0, ok: 0 })).toBeNull();
    expect(topicCardMastery({})).toBeNull();
    expect(topicCardMastery(null)).toBeNull();
  });

  it('REGRESSION: just-failed card (tot=1, ok=0) does NOT show high mastery', () => {
    // The bug: FSRS R alone gave ~1.0 here (because lastReview is recent).
    const m = topicCardMastery({
      fsrsS: 5, lastReview: Date.now() - 1000, tot: 1, ok: 0,
    });
    expect(m).toBe(0);
  });

  it('REGRESSION: 0/4 card (4 wrong answers in a row) shows 0 mastery', () => {
    const m = topicCardMastery({
      fsrsS: 5, lastReview: Date.now() - 1000, tot: 4, ok: 0,
    });
    expect(m).toBe(0);
  });

  it('perfect record + just answered → near 1.0 mastery', () => {
    const m = topicCardMastery({
      fsrsS: 10, lastReview: Date.now() - 1000, tot: 5, ok: 5,
    });
    expect(m).toBeGreaterThan(0.95);
  });

  it('partial record (50% accuracy) → ~0.5 mastery just after review', () => {
    const m = topicCardMastery({
      fsrsS: 10, lastReview: Date.now() - 1000, tot: 4, ok: 2,
    });
    expect(m).toBeGreaterThan(0.45);
    expect(m).toBeLessThan(0.55);
  });

  it('mastery never exceeds 1.0 or goes below 0', () => {
    // Stress: weird inputs should still produce valid output range.
    expect(topicCardMastery({ fsrsS: 1, lastReview: Date.now(), tot: 1, ok: 1 })).toBeLessThanOrEqual(1);
    expect(topicCardMastery({ fsrsS: 1, lastReview: 0, tot: 1, ok: 0 })).toBeGreaterThanOrEqual(0);
  });
});

describe('honest stats — computeTopicMastery', () => {
  it('returns null meanR for every topic when no SR data', () => {
    const out = computeTopicMastery(G.QZ, G.S, ['A','B','C']);
    out.forEach(r => {
      expect(r.meanR).toBeNull();
      expect(r.n).toBe(0);
    });
  });

  it('REGRESSION: topic where every card is 0/X correct → meanR = 0, NOT ~1.0', () => {
    // This is the screenshot bug. Hematology was the user's worst topic
    // (4 wrong) but heatmap showed 100% mastery.
    const TOPICS_LIST = ['Hematology'];
    const QZ = [{ ti: 0 }, { ti: 0 }, { ti: 0 }, { ti: 0 }];
    const now = Date.now();
    const S = {
      sr: {
        0: { fsrsS: 5, lastReview: now, tot: 1, ok: 0 },
        1: { fsrsS: 5, lastReview: now, tot: 1, ok: 0 },
        2: { fsrsS: 5, lastReview: now, tot: 1, ok: 0 },
        3: { fsrsS: 5, lastReview: now, tot: 1, ok: 0 },
      },
    };
    const out = computeTopicMastery(QZ, S, TOPICS_LIST);
    expect(out[0].n).toBe(4);
    expect(out[0].meanR).toBe(0);
  });

  it('mixed topic: some right, some wrong → meanR proportional, not 1.0', () => {
    const TOPICS_LIST = ['Mixed'];
    const QZ = [{ ti: 0 }, { ti: 0 }, { ti: 0 }, { ti: 0 }];
    const now = Date.now();
    const S = {
      sr: {
        0: { fsrsS: 5, lastReview: now, tot: 1, ok: 1 }, // right
        1: { fsrsS: 5, lastReview: now, tot: 1, ok: 0 }, // wrong
        2: { fsrsS: 5, lastReview: now, tot: 1, ok: 1 }, // right
        3: { fsrsS: 5, lastReview: now, tot: 1, ok: 0 }, // wrong
      },
    };
    const out = computeTopicMastery(QZ, S, TOPICS_LIST);
    // 50% accuracy × ~1.0 R = ~0.5 mastery
    expect(out[0].meanR).toBeGreaterThan(0.4);
    expect(out[0].meanR).toBeLessThan(0.6);
  });
});

describe('honest stats — source-level guard', () => {
  it('calcEstScore must NOT contain the literal "acc=0.60" imputation', () => {
    // The original bug: `if(s.tot<3){ acc=0.60; }` defaulted to 60% neutral.
    // Static text guard: this exact string must not return.
    const src = readFileSync(resolve(process.cwd(), 'src', 'ui', 'track-view.js'), 'utf-8');
    const calcEst = src.match(/export function calcEstScore\(\)[\s\S]*?\n\}\n/);
    expect(calcEst, 'calcEstScore function not found in track-view.js').not.toBeNull();
    expect(calcEst[0]).not.toMatch(/acc\s*=\s*0\.60/);
    expect(calcEst[0]).not.toMatch(/acc\s*=\s*0\.6\b/);
  });

  it('heatmap must NOT use pure FSRS R aggregation (must mix in ok/tot)', () => {
    const src = readFileSync(resolve(process.cwd(), 'src', 'ui', 'heatmap.js'), 'utf-8');
    // The new code uses either accuracy*r or topicCardMastery as the per-card signal.
    // Reject if we see a bare `sumR += r;` pattern (the old bug).
    expect(src).not.toMatch(/sumR\s*\+=\s*r\s*;/);
  });

  it('takeWeeklySnapshot must require ≥3 answers per topic (no single-answer extremes)', () => {
    // Bug: snapshotting `s.tot>0?Math.round(s.ok/s.tot*100):null` produces
    // 0% or 100% from a single answer, making trend arrows misleading.
    // Honest fix: require ≥3 tot before snapshotting per-topic accuracy.
    const src = readFileSync(resolve(process.cwd(), 'src', 'ui', 'app.js'), 'utf-8');
    const takeFn = src.match(/export function takeWeeklySnapshot\(\)[\s\S]*?\n\}/);
    expect(takeFn, 'takeWeeklySnapshot not found').not.toBeNull();
    // Must NOT contain the lax `tot>0` snapshot threshold.
    expect(takeFn[0]).not.toMatch(/s\.tot>0\s*\?\s*Math\.round/);
    // Must contain a ≥3 (or stricter) threshold.
    expect(takeFn[0]).toMatch(/s\.tot\s*>=\s*[3-9]/);
  });
});
