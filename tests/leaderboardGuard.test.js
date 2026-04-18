/**
 * Tests for the leaderboard submission guard in `src/features/cloud.js`.
 *
 * The guard prevents polluting the global leaderboard with neutral-60%
 * readiness values from users who haven't answered enough questions
 * (`LB_MIN_ANSWERED=20`) or who don't yet have a real `calcEstScore()`.
 * Analysis doc \u00a73.8.
 *
 * Setup runs under the default node env (no jsdom devDep installed),
 * so `localStorage` is shimmed manually.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock cloud.js's heavy dependencies before import.
vi.mock('../src/ui/track-view.js', () => ({
  calcEstScore: vi.fn(),
}));
vi.mock('../src/ai/client.js', () => ({
  callAI: vi.fn(),
}));
vi.mock('../src/sr/spaced-repetition.js', () => ({
  getTopicStats: vi.fn(() => ({})),
  getDueQuestions: vi.fn(() => []),
}));

import G from '../src/core/globals.js';
import { submitLeaderboardScore } from '../src/features/cloud.js';
import { calcEstScore } from '../src/ui/track-view.js';

function makeSrWithTotal(totalAnswered) {
  const sr = {};
  for (let i = 0; i < totalAnswered; i++) sr[i] = { tot: 1, ok: 1 };
  return sr;
}

function installLocalStorageShim() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  };
}

describe('submitLeaderboardScore \u2014 threshold guard', () => {
  beforeEach(() => {
    G.S = { sr: {}, streak: 0, qOk: 0, qNo: 0 };
    calcEstScore.mockReset();
    installLocalStorageShim();
    globalThis.fetch = vi.fn();
  });

  it('skips when answered below LB_MIN_ANSWERED threshold', async () => {
    G.S.sr = makeSrWithTotal(19);
    calcEstScore.mockReturnValue(75);
    const result = await submitLeaderboardScore();
    expect(result).toEqual({ skipped: 'thin_data', answered: 19 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('still skips when calcEstScore returns null (no real estimate)', async () => {
    G.S.sr = makeSrWithTotal(25);
    calcEstScore.mockReturnValue(null);
    const result = await submitLeaderboardScore();
    expect(result.skipped).toBe('no_est');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('submits when answered >= threshold AND calcEstScore is a real number', async () => {
    G.S.sr = makeSrWithTotal(20);
    calcEstScore.mockReturnValue(82);
    globalThis.fetch.mockResolvedValue({ ok: true, status: 201 });
    const result = await submitLeaderboardScore();
    expect(result).toEqual({ submitted: true });
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toContain('/rest/v1/pnimit_leaderboard');
    expect(init.method).toBe('POST');
    const payload = JSON.parse(init.body);
    expect(payload.answered).toBe(20);
    expect(payload.readiness).toBe(82);
  });

  it('reports submitted:false when server rejects', async () => {
    G.S.sr = makeSrWithTotal(50);
    calcEstScore.mockReturnValue(70);
    globalThis.fetch.mockResolvedValue({ ok: false, status: 403 });
    const result = await submitLeaderboardScore();
    expect(result).toEqual({ submitted: false, status: 403 });
  });

  it('reports submitted:false on network error', async () => {
    G.S.sr = makeSrWithTotal(50);
    calcEstScore.mockReturnValue(70);
    globalThis.fetch.mockRejectedValue(new Error('offline'));
    const result = await submitLeaderboardScore();
    expect(result.submitted).toBe(false);
    expect(String(result.error)).toContain('offline');
  });

  it('generates and caches a uid when none exists', async () => {
    G.S.sr = makeSrWithTotal(30);
    calcEstScore.mockReturnValue(65);
    globalThis.fetch.mockResolvedValue({ ok: true });
    expect(localStorage.getItem('pnimit_uid')).toBeNull();
    await submitLeaderboardScore();
    const uid = localStorage.getItem('pnimit_uid');
    expect(uid).toBeTruthy();
    expect(uid).toMatch(/^u[a-z0-9]+$/);
    // Second call reuses the same uid
    globalThis.fetch.mockClear();
    await submitLeaderboardScore();
    expect(localStorage.getItem('pnimit_uid')).toBe(uid);
  });
});
