/**
 * IM-6 regression: showAnswerHardFail (the "give up / show me the answer" path in
 * src/ui/more-view.js) must route scoring through the SAME wrong-answer path as
 * check(): srScore(idx,false) (FSRS rating Again) + recordResult(idx,false)
 * (enrol in wrong-review) — and must NOT set G.sel to the correct index.
 *
 * Before the fix it mutated only legacy SM-2 fields (ef/n/next), never engaged
 * FSRS, never enrolled the question for review, and set G.sel=q.c (rendering the
 * correct option as if the user had picked it).
 *
 * Fails on the pre-fix code; passes on the fixed code.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Heavy transitive imports not needed by showAnswerHardFail.
vi.mock('../src/quiz/modes.js', () => ({ startVoiceParser: vi.fn() }));
vi.mock('../src/features/cloud.js', () => ({ submitFeedbackForm: vi.fn() }));
vi.mock('../src/ai/client.js', () => ({ callAI: vi.fn() }));
vi.mock('../src/services/supabaseAuth.js', () => ({ getProxyBearer: vi.fn() }));

// Seed shared/fsrs.js into globalThis BEFORE spaced-repetition/fsrs-bridge load,
// so srScore's FSRS calls resolve (mirrors tests/srScore.test.js).
globalThis.window = globalThis;
const fsrsSrc = readFileSync(resolve(process.cwd(), 'shared', 'fsrs.js'), 'utf-8');
new Function(
  'target',
  fsrsSrc +
    ';Object.assign(target, { FSRS_W, FSRS_DECAY, FSRS_FACTOR, FSRS_RETENTION,' +
    ' fsrsR, fsrsInterval, fsrsInitNew, fsrsUpdate, fsrsMigrateFromSM2, isChronicFail });'
)(globalThis);

function installLocalStorageShim() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

let G, showAnswerHardFail;
beforeAll(async () => {
  G = (await import('../src/core/globals.js')).default;
  showAnswerHardFail = (await import('../src/ui/more-view.js')).showAnswerHardFail;
});

beforeEach(() => {
  installLocalStorageShim();
  G.S = { sr: {}, qOk: 0, qNo: 0, tpNo: {}, dailyAct: {} };
  G.QZ = [{ q: 'Q', o: ['a', 'b', 'c', 'd'], c: 2, ti: 5 }];
  G.pool = [0];
  G.qi = 0;
  G.sel = null;
  G.ans = false;
  G.examMode = false;
  G.qStartTime = Date.now() - 3000;
  G._sessionOk = 0;
  G._sessionNo = 0;
  G._sessionBest = {};
  G._sessionWorse = {};
  G.wrongSet = new Map();
  G.save = vi.fn();
  G.render = vi.fn();
});

describe('IM-6 give-up routes through srScore(false) + recordResult(false)', () => {
  it('records a miss via FSRS + wrong-review and does not reveal-as-picked', () => {
    showAnswerHardFail();

    const s = G.S.sr[0];
    expect(s).toBeDefined();
    // srScore(false) ran (pre-fix set only ef/n/next, never tot/ok/fsrsS).
    expect(s.tot).toBe(1);
    expect(s.ok).toBe(0);
    expect(typeof s.fsrsS).toBe('number');
    // recordResult(false) enrolled the question in wrong-review.
    expect(G.wrongSet.has(0)).toBe(true);
    // Global + per-topic wrong tallies preserved.
    expect(G.S.qNo).toBe(1);
    expect(G.S.tpNo[5]).toBe(1);
    // NOT rendered as the correct pick.
    expect(G.sel).not.toBe(2);
    expect(G.ans).toBe(true);
  });

  it('is a no-op once already answered', () => {
    G.ans = true;
    showAnswerHardFail();
    expect(G.S.sr[0]).toBeUndefined();
    expect(G.wrongSet.has(0)).toBe(false);
  });
});
