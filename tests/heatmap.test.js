/**
 * Tests for src/ui/heatmap.js — pure logic (computeTopicMastery, masteryBucket,
 * masteryColor) plus the SVG renderer's structural output. Mirrors the
 * fsrs-bridge bootstrap from srScore.test.js.
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

let G, computeTopicMastery, masteryBucket, masteryColor, renderTopicHeatmap, VIRIDIS_5, HEATMAP_NO_DATA;

beforeAll(async () => {
  G = (await import('../src/core/globals.js')).default;
  const mod = await import('../src/ui/heatmap.js');
  computeTopicMastery = mod.computeTopicMastery;
  masteryBucket = mod.masteryBucket;
  masteryColor = mod.masteryColor;
  renderTopicHeatmap = mod.renderTopicHeatmap;
  VIRIDIS_5 = mod.VIRIDIS_5;
  HEATMAP_NO_DATA = mod.HEATMAP_NO_DATA;
});

beforeEach(() => {
  G.S = { sr: {} };
  G.QZ = [
    { ti: 0 }, { ti: 0 }, { ti: 1 }, { ti: 2 },
  ];
});

describe('masteryBucket', () => {
  it('returns -1 for null / undefined / NaN', () => {
    expect(masteryBucket(null)).toBe(-1);
    expect(masteryBucket(undefined)).toBe(-1);
    expect(masteryBucket(NaN)).toBe(-1);
  });
  it('maps 5 evenly-spaced buckets', () => {
    expect(masteryBucket(0.0)).toBe(0);
    expect(masteryBucket(0.19)).toBe(0);
    expect(masteryBucket(0.2)).toBe(1);
    expect(masteryBucket(0.39)).toBe(1);
    expect(masteryBucket(0.4)).toBe(2);
    expect(masteryBucket(0.59)).toBe(2);
    expect(masteryBucket(0.6)).toBe(3);
    expect(masteryBucket(0.79)).toBe(3);
    expect(masteryBucket(0.8)).toBe(4);
    expect(masteryBucket(1.0)).toBe(4);
  });
});

describe('masteryColor', () => {
  it('returns Viridis stops for valid mastery, no-data colour otherwise', () => {
    expect(masteryColor(null)).toBe(HEATMAP_NO_DATA);
    expect(masteryColor(0)).toBe(VIRIDIS_5[0]);
    expect(masteryColor(1)).toBe(VIRIDIS_5[4]);
    expect(VIRIDIS_5).toHaveLength(5);
    // Verify colorblind-safe distinct hues — no duplicates.
    expect(new Set(VIRIDIS_5).size).toBe(5);
  });
});

describe('computeTopicMastery', () => {
  it('returns one entry per topic, all null when no SR data', () => {
    const TOPICS_LIST = ['A', 'B', 'C'];
    const out = computeTopicMastery([{ ti: 0 }, { ti: 1 }], { sr: {} }, TOPICS_LIST);
    expect(out).toHaveLength(3);
    out.forEach(r => {
      expect(r.meanR).toBeNull();
      expect(r.n).toBe(0);
    });
  });
  it('per-card mastery = (ok/tot) × R; wrong answer drops mastery to 0', () => {
    const TOPICS_LIST = ['A', 'B'];
    const QZ = [{ ti: 0 }, { ti: 0 }, { ti: 1 }];
    const now = Date.now();
    const S = {
      sr: {
        // Topic A: one card answered correctly 3/3, one card answered wrong 0/3
        0: { fsrsS: 5, fsrsD: 5, lastReview: now - 86400000, ok: 3, tot: 3 },
        1: { fsrsS: 5, fsrsD: 5, lastReview: now - 86400000, ok: 0, tot: 3 },
        // Topic B: one card answered correctly 3/3
        2: { fsrsS: 5, fsrsD: 5, lastReview: now - 86400000, ok: 3, tot: 3 },
      },
    };
    const out = computeTopicMastery(QZ, S, TOPICS_LIST);
    const a = out.find(r => r.ti === 0);
    const b = out.find(r => r.ti === 1);
    expect(a.n).toBe(2);
    expect(b.n).toBe(1);
    // Topic A averages 0% and ~R together → ~R/2 ≈ 0.4-0.5
    expect(a.meanR).toBeGreaterThan(0);
    expect(a.meanR).toBeLessThan(0.6);
    // Topic B is one perfect card → ~R ≈ 0.8-1.0
    expect(b.meanR).toBeGreaterThan(a.meanR);
  });
  it('regression: just-answered wrong card does NOT show 100% mastery', () => {
    // The original bug — FSRS R alone gave ~1.0 for any card answered seconds ago,
    // even if the answer was wrong. New mastery = (ok/tot)*R must be 0 when ok=0.
    const TOPICS_LIST = ['A'];
    const QZ = [{ ti: 0 }];
    const S = {
      sr: { 0: { fsrsS: 5, fsrsD: 5, lastReview: Date.now() - 60000, ok: 0, tot: 1 } },
    };
    const out = computeTopicMastery(QZ, S, TOPICS_LIST);
    expect(out[0].n).toBe(1);
    expect(out[0].meanR).toBe(0);
  });
  it('skips cards with tot=0 (never answered)', () => {
    const TOPICS_LIST = ['A'];
    const QZ = [{ ti: 0 }];
    const S = { sr: { 0: { fsrsS: 5, fsrsD: 5, lastReview: Date.now() } } }; // no tot/ok
    const out = computeTopicMastery(QZ, S, TOPICS_LIST);
    expect(out[0].n).toBe(0);
    expect(out[0].meanR).toBeNull();
  });
  it('falls back to raw hit-rate when FSRS state missing', () => {
    // Legacy SM-2-only cards (no fsrsS/fsrsD) — use raw ok/tot.
    const TOPICS_LIST = ['A'];
    const QZ = [{ ti: 0 }];
    const S = { sr: { 0: { ok: 2, tot: 4 } } };
    const out = computeTopicMastery(QZ, S, TOPICS_LIST);
    expect(out[0].n).toBe(1);
    expect(out[0].meanR).toBe(0.5);
  });
  it('ignores out-of-range topic indexes', () => {
    const TOPICS_LIST = ['A'];
    const QZ = [{ ti: 5 }];
    const S = { sr: { 0: { fsrsS: 5, fsrsD: 5, lastReview: Date.now(), ok: 1, tot: 1 } } };
    const out = computeTopicMastery(QZ, S, TOPICS_LIST);
    expect(out[0].n).toBe(0);
  });
});

describe('renderTopicHeatmap', () => {
  it('emits an SVG with one <g data-action="heatmap-topic"> per topic', () => {
    G.S = { sr: {} };
    G.QZ = [];
    const html = renderTopicHeatmap();
    expect(html).toContain('<svg');
    expect(html).toContain('data-action="heatmap-topic"');
    // 24 cells (TOPICS.length)
    const matches = html.match(/data-action="heatmap-topic"/g) || [];
    expect(matches.length).toBe(24);
    // New legend label reflecting hit-rate × recency formula
    expect(html).toContain('Mastery (accuracy × recency)');
  });
  it('cells are tab-focusable for keyboard nav', () => {
    G.S = { sr: {} };
    const html = renderTopicHeatmap();
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="button"');
  });
});
