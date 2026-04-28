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
  it('averages R across reviewed cards in a topic', () => {
    const TOPICS_LIST = ['A', 'B'];
    const QZ = [{ ti: 0 }, { ti: 0 }, { ti: 1 }];
    const now = Date.now();
    const S = {
      sr: {
        0: { fsrsS: 5, fsrsD: 5, lastReview: now - 86400000 }, // 1 day old
        1: { fsrsS: 50, fsrsD: 5, lastReview: now - 86400000 }, // very stable
        2: { fsrsS: 1, fsrsD: 5, lastReview: now - 86400000 },  // weak
      },
    };
    const out = computeTopicMastery(QZ, S, TOPICS_LIST);
    const a = out.find(r => r.ti === 0);
    const b = out.find(r => r.ti === 1);
    expect(a.n).toBe(2);
    expect(b.n).toBe(1);
    expect(a.meanR).toBeGreaterThan(0);
    expect(a.meanR).toBeLessThanOrEqual(1);
    // Topic A's mean should beat topic B (one strong card pulls average up).
    expect(a.meanR).toBeGreaterThan(b.meanR);
  });
  it('skips cards with no lastReview', () => {
    const TOPICS_LIST = ['A'];
    const QZ = [{ ti: 0 }];
    const S = { sr: { 0: { fsrsS: 5, fsrsD: 5 } } }; // no lastReview
    const out = computeTopicMastery(QZ, S, TOPICS_LIST);
    expect(out[0].n).toBe(0);
    expect(out[0].meanR).toBeNull();
  });
  it('ignores out-of-range topic indexes', () => {
    const TOPICS_LIST = ['A'];
    const QZ = [{ ti: 5 }];
    const S = { sr: { 0: { fsrsS: 5, fsrsD: 5, lastReview: Date.now() } } };
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
    // Includes the legend
    expect(html).toContain('Mastery (FSRS R)');
  });
  it('cells are tab-focusable for keyboard nav', () => {
    G.S = { sr: {} };
    const html = renderTopicHeatmap();
    expect(html).toContain('tabindex="0"');
    expect(html).toContain('role="button"');
  });
});
