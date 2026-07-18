/**
 * IM-2 regression: when a 90s timed question times out (startTimedQ,
 * src/ui/quiz-view.js) it is a MISS. It must:
 *   - count wrong in global stats (G.S.qNo++),
 *   - count wrong in mock byTopic (.no++, not .ok++) and enter wrongIdxs,
 *   - enrol in wrong-review via recordResult(idx,false),
 *   - and NOT be rendered as the correct pick (G.sel !== correct index).
 *
 * Before the fix, the timeout set G.sel = correct index, so checkMockIntercept
 * graded it CORRECT (mock byTopic double-counted it as ok) and the UI showed it
 * as if the user picked right; recordResult was never called.
 *
 * Fails on the pre-fix code; passes on the fixed code.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Mock quiz-view's transitive imports NOT on the timeout path. Keep engine
// (checkMockIntercept), spaced-repetition (srScore) and wrong-review
// (recordResult) REAL so the scoring effects are genuinely exercised.
vi.mock('../src/ai/explain.js', () => ({
  renderExplainBox: vi.fn(),
  toggleFlagExplain: vi.fn(),
  explainWithAI: vi.fn(),
  aiAutopsy: vi.fn(),
  gradeTeachBack: vi.fn(),
  startVoiceTeachBack: vi.fn(),
}));
vi.mock('../src/ui/track-view.js', () => ({ TOPIC_REF: {} }));
vi.mock('../src/ui/library-view.js', () => ({ openHarrisonChapter: vi.fn() }));
vi.mock('../src/ui/source-link.js', () => ({
  renderSourceLink: vi.fn(() => ''),
  openSourceForQuestion: vi.fn(),
}));
vi.mock('../src/quiz/modes.js', () => ({ speakQuestion: vi.fn(), startNextBestStep: vi.fn() }));
vi.mock('../src/ui/more-view.js', () => ({ showAnswerHardFail: vi.fn() }));

// Seed shared/fsrs.js before spaced-repetition/fsrs-bridge load (srScore runs).
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

let G, startTimedQ;
beforeAll(async () => {
  G = (await import('../src/core/globals.js')).default;
  startTimedQ = (await import('../src/ui/quiz-view.js')).startTimedQ;
});

beforeEach(() => {
  vi.useFakeTimers();
  installLocalStorageShim();
  // The interval callback reads document.getElementById('timed-bar').
  globalThis.document = { getElementById: () => null };

  G.S = { sr: {}, qOk: 0, qNo: 0, bk: {}, dailyAct: {} };
  G.QZ = [{ q: 'Q', o: ['a', 'b', 'c', 'd'], c: 2, ti: 5 }]; // correct index = 2
  G.pool = [0];
  G.qi = 0;
  G.sel = null;
  G.ans = false;
  G.examMode = false;
  G.timedMode = true;
  G.timedPaused = false;
  G.timedInt = null;
  G.timedSec = 90;
  G.mockExamResults = { byTopic: { 5: { ok: 0, no: 0 } }, start: Date.now(), wrongIdxs: [] };
  G._mockAnswered = 0;
  G.qStartTime = Date.now();
  G._sessionOk = 0;
  G._sessionNo = 0;
  G._sessionBest = {};
  G._sessionWorse = {};
  G.wrongSet = new Map();
  G.save = vi.fn();
  G.render = vi.fn();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  delete globalThis.document;
});

describe('IM-2 timed timeout scores wrong (not correct)', () => {
  it('counts wrong globally + in mock byTopic + wrong-review, never shown correct', () => {
    startTimedQ();
    vi.advanceTimersByTime(90000); // drive the 90s countdown to timeout

    // Global stats: one wrong.
    expect(G.S.qNo).toBe(1);
    // Mock byTopic: recorded as a MISS, not a hit.
    expect(G.mockExamResults.byTopic[5].no).toBe(1);
    expect(G.mockExamResults.byTopic[5].ok).toBe(0);
    expect(G.mockExamResults.wrongIdxs).toContain(0);
    // Wrong-review enrolment.
    expect(G.wrongSet.has(0)).toBe(true);
    // SR recorded a wrong attempt.
    expect(G.S.sr[0].tot).toBe(1);
    expect(G.S.sr[0].ok).toBe(0);
    // NOT rendered as the correct pick.
    expect(G.sel).not.toBe(2);
    expect(G.ans).toBe(true);
  });
});
