/**
 * IM-4 regression: in check() (src/quiz/engine.js) the deferred autopsy
 * setTimeout(() => aiAutopsy(...), 400) must target the QUESTION THAT WAS
 * ANSWERED, captured at check() time. Before the fix the closure re-read
 * G.pool[G.qi] at fire time, so advancing within the 400ms debounce autopsied
 * the wrong question.
 *
 * Fails on the pre-fix code (fires aiAutopsy with the advanced index); passes on
 * the fixed code (fires with the captured index).
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// aiAutopsy is a remote AI call; spy on it. engine.js imports it from explain.js.
vi.mock('../src/ai/explain.js', () => ({ aiAutopsy: vi.fn() }));

// Seed shared/fsrs.js before spaced-repetition/fsrs-bridge load (srScore runs in
// check()'s wrong path).
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

let G, check, aiAutopsy;
beforeAll(async () => {
  G = (await import('../src/core/globals.js')).default;
  check = (await import('../src/quiz/engine.js')).check;
  aiAutopsy = (await import('../src/ai/explain.js')).aiAutopsy;
});

beforeEach(() => {
  vi.useFakeTimers();
  installLocalStorageShim();
  G.S = { sr: {}, qOk: 0, qNo: 0, dailyAct: {} };
  G.QZ = [
    { q: 'Q0', o: ['a', 'b', 'c', 'd'], c: 0, ti: 5 },
    { q: 'Q1', o: ['a', 'b', 'c', 'd'], c: 0, ti: 6 },
  ];
  G.pool = [0, 1];
  G.qi = 0;
  G.sel = 1; // wrong (c=0) -> takes the deferred-autopsy branch
  G.ans = false;
  G.examMode = false;
  G.mockExamResults = null;
  G._confidence = null;
  G._exCache = {};
  G.qStartTime = Date.now();
  G._sessionOk = 0;
  G._sessionNo = 0;
  G._sessionBest = {};
  G._sessionWorse = {};
  G.wrongSet = new Map();
  G.save = vi.fn();
  G.render = vi.fn();
  aiAutopsy.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('IM-4 deferred autopsy targets the answered question', () => {
  it('fires aiAutopsy with the captured index even after advancing in the debounce', () => {
    check(); // answers pool[0] (index 0) wrong -> schedules aiAutopsy(0) at 400ms
    expect(aiAutopsy).not.toHaveBeenCalled();

    // User advances within the 400ms debounce window.
    G.qi = 1; // now G.pool[G.qi] === 1

    vi.advanceTimersByTime(400);

    expect(aiAutopsy).toHaveBeenCalledTimes(1);
    expect(aiAutopsy).toHaveBeenCalledWith(0); // captured index, NOT the advanced 1
    expect(aiAutopsy).not.toHaveBeenCalledWith(1);
  });
});
