/**
 * IM-1 regression: calcEstScore (src/ui/track-view.js) must read LIVE topic
 * stats via getTopicStats() (derived from G.S.sr), NOT the field G.S.ts — which
 * the app reads but NEVER writes. Before the fix, Est-Score / readiness /
 * leaderboard submission were dead because tSt = G.S.ts||{} was always {}.
 *
 * Fails on the pre-fix code (which returns null / reads G.S.ts); passes on the
 * fixed code (reads getTopicStats()).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// track-view transitively pulls engine + library-view + heatmap; none are used
// by calcEstScore. Mock them to keep the import light. spaced-repetition stays
// REAL so getTopicStats() computes live from G.S.sr — the whole point of IM-1.
vi.mock('../src/quiz/engine.js', () => ({
  setFilt: vi.fn(),
  startTopicMiniExam: vi.fn(),
  buildPool: vi.fn(),
}));
vi.mock('../src/ui/library-view.js', () => ({ renderWrongAnswerLog: vi.fn(() => '') }));
vi.mock('../src/ui/heatmap.js', () => ({ renderTopicHeatmap: vi.fn(() => '') }));

import G from '../src/core/globals.js';
import { calcEstScore } from '../src/ui/track-view.js';
import { getTopicStats } from '../src/sr/spaced-repetition.js';

// getTopicStats() counts an sr entry as ok when d.n>0, keyed by G.QZ[idx].ti.
function seedTopic(ti, correct, total) {
  for (let j = 0; j < total; j++) {
    const idx = 5000 + ti * 100 + j;
    G.QZ[idx] = { ti, q: 'q' + ti + '_' + j, o: ['a', 'b', 'c', 'd'], c: 0 };
    const ok = j < correct;
    G.S.sr[idx] = { n: ok ? 1 : 0, tot: 1, ok: ok ? 1 : 0 };
  }
}

beforeEach(() => {
  G.S = { sr: {}, ts: {} };
  G.QZ = [];
});

describe('IM-1 calcEstScore reads live topic stats (not the dead G.S.ts)', () => {
  it('returns a number once >=3 topics each have >=3 answers', () => {
    for (const ti of [0, 1, 2, 3]) seedTopic(ti, 2, 3); // 3 answered each
    const score = calcEstScore();
    expect(score).not.toBeNull();
    expect(typeof score).toBe('number');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('ignores G.S.ts entirely: populated G.S.ts with empty G.S.sr still yields null', () => {
    for (let ti = 0; ti < 6; ti++) G.S.ts[ti] = { ok: 3, tot: 3, no: 0 };
    // No live SR data -> getTopicStats()={} -> below the 3-topic threshold -> null.
    expect(calcEstScore()).toBeNull();
  });

  it('derives from live getTopicStats(): score tracks G.S.sr, not G.S.ts', () => {
    // Poison G.S.ts with all-perfect topics (pre-fix code would score ~100)...
    for (let ti = 0; ti < 6; ti++) G.S.ts[ti] = { ok: 3, tot: 3, no: 0 };
    // ...but the LIVE stats say topics 0,1,2 are 0% correct.
    for (const ti of [0, 1, 2]) seedTopic(ti, 0, 3);
    expect(getTopicStats()[0]).toEqual({ ok: 0, no: 3, tot: 3 });
    const score = calcEstScore();
    expect(score).not.toBeNull();
    // Reading the poisoned G.S.ts would give ~100; reading live G.S.sr gives 0.
    expect(score).toBe(0);
  });
});
