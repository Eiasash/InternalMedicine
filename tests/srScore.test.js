/**
 * Tests for srScore state mutation in src/sr/spaced-repetition.js.
 *
 * `srScore` is the core FSRS scheduler: it mutates G.S.sr[qIdx] on every
 * question answer. A regression here silently corrupts every user's review
 * schedule. Before this file, srScore was tested only via a copy in
 * appLogic.test.js with a different function signature (pure vs stateful).
 *
 * Setup notes:
 *   - spaced-repetition.js imports from fsrs-bridge.js, which reads
 *     `window.fsrsR` etc. We pre-populate globalThis.window with the
 *     functions from shared/fsrs.js before the dynamic import.
 *   - G is the shared global state object. We mutate it directly.
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

let srScore, G;

beforeAll(async () => {
  // Evaluate shared/fsrs.js and expose its functions on globalThis.window
  // so that src/sr/fsrs-bridge.js can re-export them at module-load time.
  const fsrsCode = readFileSync(
    resolve(import.meta.dirname, '..', 'shared', 'fsrs.js'),
    'utf-8'
  );
  const extract = new Function(
    fsrsCode +
      '\nreturn {FSRS_W,FSRS_DECAY,FSRS_FACTOR,FSRS_RETENTION,fsrsR,fsrsInterval,fsrsInitNew,fsrsUpdate,fsrsMigrateFromSM2,isChronicFail};'
  );
  const ex = extract();
  if (typeof globalThis.window === 'undefined') globalThis.window = {};
  Object.assign(globalThis.window, ex);

  // Now that window.fsrsR etc. exist, the bridge can resolve its re-exports.
  const sr = await import('../src/sr/spaced-repetition.js');
  const gMod = await import('../src/core/globals.js');
  srScore = sr.srScore;
  G = gMod.default;
});

function resetGState() {
  G.S = { sr: {}, qOk: 0, qNo: 0, dailyAct: {} };
  G.QZ = [
    { ti: 0, q: 'Q0', o: ['a', 'b', 'c', 'd'], c: 0 },
    { ti: 5, q: 'Q1', o: ['a', 'b', 'c', 'd'], c: 1 },
  ];
  G.qStartTime = Date.now();
  G._sessionOk = 0;
  G._sessionNo = 0;
  G._sessionBest = {};
  G._sessionWorse = {};
  G.save = () => {};
}

describe('srScore — initialization (new question, no prior SR state)', () => {
  beforeEach(resetGState);

  it('creates an SR entry with default shape on first call', () => {
    srScore(0, true);
    const s = G.S.sr[0];
    expect(s).toBeDefined();
    expect(s.tot).toBe(1);
    expect(s.ok).toBe(1);
    expect(s.n).toBe(1);
    expect(Array.isArray(s.ts)).toBe(true);
    expect(s.ts.length).toBe(1);
  });

  it('initializes FSRS state via fsrsInitNew when no SM-2 data', () => {
    srScore(0, true);
    const s = G.S.sr[0];
    expect(typeof s.fsrsS).toBe('number');
    expect(typeof s.fsrsD).toBe('number');
    expect(s.fsrsS).toBeGreaterThan(0);
    expect(s.fsrsD).toBeGreaterThanOrEqual(1);
    expect(s.fsrsD).toBeLessThanOrEqual(10);
  });

  it('schedules next review in the future', () => {
    const before = Date.now();
    srScore(0, true);
    expect(G.S.sr[0].next).toBeGreaterThan(before);
  });

  it('records lastReview timestamp', () => {
    const before = Date.now();
    srScore(0, true);
    expect(G.S.sr[0].lastReview).toBeGreaterThanOrEqual(before);
  });
});

describe('srScore — repeated calls (existing SR state)', () => {
  beforeEach(resetGState);

  it('increments tot and ok on correct answers', () => {
    srScore(0, true);
    srScore(0, true);
    srScore(0, true);
    expect(G.S.sr[0].tot).toBe(3);
    expect(G.S.sr[0].ok).toBe(3);
  });

  it('resets n to 0 on a wrong answer', () => {
    srScore(0, true);
    srScore(0, true);
    expect(G.S.sr[0].n).toBe(2);
    srScore(0, false);
    expect(G.S.sr[0].n).toBe(0);
  });

  it('increments n on correct answers', () => {
    srScore(0, true);
    srScore(0, true);
    srScore(0, true);
    expect(G.S.sr[0].n).toBe(3);
  });

  it('caps the response-time window ts at 10 entries', () => {
    for (let i = 0; i < 15; i++) srScore(0, true);
    expect(G.S.sr[0].ts.length).toBe(10);
  });

  it('keeps ef clamped in [1.3, 2.5]', () => {
    // Many wrongs in a row drive fsrsD toward 10 → ef toward 1.3
    for (let i = 0; i < 10; i++) srScore(0, false);
    expect(G.S.sr[0].ef).toBeGreaterThanOrEqual(1.3);
    expect(G.S.sr[0].ef).toBeLessThanOrEqual(2.5);
  });

  it('keeps fsrsD clamped in [1, 10]', () => {
    for (let i = 0; i < 20; i++) srScore(0, i % 2 === 0);
    expect(G.S.sr[0].fsrsD).toBeGreaterThanOrEqual(1);
    expect(G.S.sr[0].fsrsD).toBeLessThanOrEqual(10);
  });

  it('keeps fsrsS above zero after wrong answers', () => {
    for (let i = 0; i < 5; i++) srScore(0, false);
    expect(G.S.sr[0].fsrsS).toBeGreaterThan(0);
  });
});

describe('srScore — session counters', () => {
  beforeEach(resetGState);

  it('increments _sessionOk on correct, _sessionNo on wrong', () => {
    srScore(0, true);
    srScore(0, true);
    srScore(0, false);
    expect(G._sessionOk).toBe(2);
    expect(G._sessionNo).toBe(1);
  });

  it('increments _sessionBest[ti] on correct answers', () => {
    srScore(0, true); // ti=0
    srScore(1, true); // ti=5
    srScore(0, true); // ti=0
    expect(G._sessionBest[0]).toBe(2);
    expect(G._sessionBest[5]).toBe(1);
  });

  it('increments _sessionWorse[ti] on wrong answers', () => {
    srScore(0, false); // ti=0
    srScore(1, false); // ti=5
    srScore(1, false); // ti=5
    expect(G._sessionWorse[0]).toBe(1);
    expect(G._sessionWorse[5]).toBe(2);
  });
});

describe('srScore — SM-2 → FSRS migration', () => {
  beforeEach(resetGState);

  it('migrates existing SM-2 state to FSRS on first call', () => {
    // Simulate a pre-FSRS user entry (no fsrsS/fsrsD, ef ≠ 2.5)
    G.S.sr[0] = { ef: 2.0, n: 3, next: Date.now() + 5 * 86400000, ts: [], at: 0, tot: 3, ok: 3 };
    srScore(0, true);
    const s = G.S.sr[0];
    // Migration sets fsrsS/fsrsD from the SM-2 numbers
    expect(typeof s.fsrsS).toBe('number');
    expect(typeof s.fsrsD).toBe('number');
    expect(s.fsrsS).toBeGreaterThan(0);
  });

  it('does not re-migrate once fsrsS/fsrsD exist', () => {
    srScore(0, true);
    const firstFsrsD = G.S.sr[0].fsrsD;
    const firstTot = G.S.sr[0].tot;
    srScore(0, true);
    // fsrsD moves slightly via mean reversion on every fsrsUpdate call.
    // If re-init had run, it would reset to fsrsInitNew(3).d — i.e. the
    // same value as firstFsrsD — so "changed" proves fsrsUpdate ran and
    // re-init did NOT.
    expect(G.S.sr[0].fsrsD).not.toBe(firstFsrsD);
    // tot keeps incrementing (entry is not fully reset)
    expect(G.S.sr[0].tot).toBe(firstTot + 1);
  });
});

describe('srScore — explicit fsrsRating parameter', () => {
  beforeEach(resetGState);

  it('rating=4 (Easy) gives higher initial stability than rating=3 (Good)', () => {
    // First call initializes via fsrsInitNew(rating). Higher rating → higher s.
    srScore(0, true, 3);
    const good = G.S.sr[0].fsrsS;

    resetGState();
    srScore(0, true, 4);
    const easy = G.S.sr[0].fsrsS;

    expect(easy).toBeGreaterThan(good);
  });

  it('rating=2 (Hard) gives lower initial stability than rating=3 (Good)', () => {
    srScore(0, true, 3);
    const good = G.S.sr[0].fsrsS;

    resetGState();
    srScore(0, true, 2);
    const hard = G.S.sr[0].fsrsS;

    expect(hard).toBeLessThan(good);
  });

  it('rating=1 (Again) reduces stability on a mature card', () => {
    // Build up some stability first with rating=4 inits
    for (let i = 0; i < 3; i++) srScore(0, true, 4);
    const matureS = G.S.sr[0].fsrsS;
    srScore(0, false, 1);
    expect(G.S.sr[0].fsrsS).toBeLessThan(matureS);
  });
});

describe('srScore — daily activity tracking', () => {
  beforeEach(resetGState);

  it('records today in G.S.dailyAct on every call', () => {
    srScore(0, true);
    const today = new Date().toISOString().slice(0, 10);
    expect(G.S.dailyAct[today]).toBeDefined();
    expect(G.S.dailyAct[today].q).toBeGreaterThanOrEqual(1);
  });
});
