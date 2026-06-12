import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

globalThis.window = globalThis;

let G, getTrackStatsDonutData, renderTrack, renderStudyDashboard;

beforeAll(async () => {
  G = (await import('../src/core/globals.js')).default;
  const mod = await import('../src/ui/track-view.js');
  getTrackStatsDonutData = mod.getTrackStatsDonutData;
  renderTrack = mod.renderTrack;
  renderStudyDashboard = mod.renderStudyDashboard;
});

beforeEach(() => {
  globalThis.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
  G.QZ = [
    { t: '2020', ti: 0 },
    { t: '2024-May', ti: 1 },
    { t: '2025-Jun', ti: 2 },
    { t: '2023-Jun', ti: 3 },
  ];
  G.S = { sr: {}, trackSubtab: 'stats', qOk: 0, qNo: 0, ck: {}, bk: {}, ts: {}, sp: {}, spOpen: false };
  G._sessionOk = 0;
  G._sessionNo = 0;
  G._sessionBest = {};
  G._sessionWorse = {};
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

describe('Study/Track information architecture', () => {
  it('keeps Track analytics-only and removes workflow cards from rendered Track', () => {
    G.S.trackSubtab = 'progress';
    const html = renderTrack();

    expect(html).toContain('Leaderboard');
    expect(html).not.toContain('questions due for review');
    expect(html).not.toContain('Export Weak Topics Cheat Sheet');
    expect(html).not.toContain('Chapters Due for Re-Reading');
    expect(html).not.toContain('Bookmarked');
    expect(html).not.toContain('Syllabus (');
    expect(html).not.toContain('Study Journal');
    expect(html).not.toContain('Share App Link');
    expect(html).not.toContain('Reference');
  });

  it('renders moved workflow cards under Study Today', () => {
    const html = renderStudyDashboard();

    expect(html).toContain('When is your exam?');
    expect(html).toContain('Export Weak Topics Cheat Sheet');
    expect(html).toContain('Syllabus (');
    expect(html).toContain('Study Journal');
  });

  it('guards old persisted Track Reference state back to analytics', () => {
    G.S.trackSubtab = 'more';
    const html = renderTrack();

    expect(html).toContain('Progress');
    expect(html).not.toContain('Reference');
    expect(html).not.toContain('Share App Link');
  });
});
