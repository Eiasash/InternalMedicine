import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

globalThis.window = globalThis;

let G, getTrackStatsDonutData, renderTrack;

beforeAll(async () => {
  G = (await import('../src/core/globals.js')).default;
  const mod = await import('../src/ui/track-view.js');
  getTrackStatsDonutData = mod.getTrackStatsDonutData;
  renderTrack = mod.renderTrack;
});

beforeEach(() => {
  G.QZ = [{}, {}, {}, {}];
  G.S = { sr: {}, trackSubtab: 'stats', qOk: 0, qNo: 0, ck: {}, bk: {} };
});

describe('track stats sub-tab', () => {
  it('summarizes correct, wrong, unanswered, and attempt accuracy from G.S.sr', () => {
    G.S.sr = {
      0: { n: 2, tot: 3, ok: 2 },
      1: { n: 0, tot: 2, ok: 1 },
      999: { n: 1, tot: 1, ok: 1 },
    };

    expect(getTrackStatsDonutData()).toEqual({
      total: 4,
      correct: 1,
      wrong: 1,
      unanswered: 2,
      answered: 2,
      attemptTotal: 5,
      attemptCorrect: 3,
      accuracy: 50,
      attemptAccuracy: 60,
    });
  });

  it('keeps question-status accuracy separate from historical attempt accuracy', () => {
    G.S.sr = {
      0: { n: 1, tot: 10, ok: 10 },
      1: { n: 0, tot: 1, ok: 0 },
    };

    expect(getTrackStatsDonutData()).toMatchObject({
      correct: 1,
      wrong: 1,
      accuracy: 50,
      attemptAccuracy: 91,
    });
  });

  it('renders the Hebrew stats sub-tab without heatmap or priority matrix content', () => {
    G.S.sr = { 0: { n: 1, tot: 1, ok: 1 } };
    const html = renderTrack();

    expect(html).toContain('data-sub="stats"');
    expect(html).toContain('סטטיסטיקה');
    expect(html).toContain('סטטיסטיקת התקדמות');
    expect(html).toContain('conic-gradient');
    expect(html).not.toContain('Topic Mastery Heatmap');
    expect(html).not.toContain('Priority Matrix');
  });
});
