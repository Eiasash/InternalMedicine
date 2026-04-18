/**
 * Tests for the flashcard FSRS scoring layer in `src/ui/learn-view.js`.
 *
 * Mirrors the srScore bootstrap: shim window, seed FSRS globals,
 * then dynamically import the module under test.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
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

let G, fcFsrsScore, fcGetDueIndices, fcRebuildQueue;

beforeAll(async () => {
  G = (await import('../src/core/globals.js')).default;
  const mod = await import('../src/ui/learn-view.js');
  fcFsrsScore = mod.fcFsrsScore;
  fcGetDueIndices = mod.fcGetDueIndices;
  fcRebuildQueue = mod.fcRebuildQueue;
});

beforeEach(() => {
  G.S = { fcsr: {}, fci: 0, fcFlip: false, fcDueMode: false };
  G.FLASH = [{ f: 'Q1', b: 'A1' }, { f: 'Q2', b: 'A2' }, { f: 'Q3', b: 'A3' }];
  G.save = vi.fn();
});

describe('fcFsrsScore', () => {
  it('creates an entry on first call with fsrs params and future next', () => {
    const now = Date.now();
    fcFsrsScore('fc_0', 3); // Good
    const s = G.S.fcsr['fc_0'];
    expect(s).toBeDefined();
    expect(typeof s.fsrsS).toBe('number');
    expect(typeof s.fsrsD).toBe('number');
    expect(s.fsrsS).toBeGreaterThan(0);
    expect(s.next).toBeGreaterThan(now);
  });

  it('Again (rating=1) resets legacy n to 0', () => {
    fcFsrsScore('fc_0', 3);
    fcFsrsScore('fc_0', 3);
    fcFsrsScore('fc_0', 1); // Again
    expect(G.S.fcsr['fc_0'].n).toBe(0);
  });

  it('consecutive Good ratings increment n (capped at 2)', () => {
    fcFsrsScore('fc_1', 3);
    expect(G.S.fcsr['fc_1'].n).toBe(1);
    fcFsrsScore('fc_1', 3);
    expect(G.S.fcsr['fc_1'].n).toBe(2);
    fcFsrsScore('fc_1', 3);
    expect(G.S.fcsr['fc_1'].n).toBe(2); // capped
  });

  it('Easy (rating=4) yields longer next-interval than Hard (rating=2)', () => {
    // Two clean entries starting fresh for fair comparison
    fcFsrsScore('fc_hard', 2);
    fcFsrsScore('fc_easy', 4);
    expect(G.S.fcsr['fc_easy'].next - Date.now())
      .toBeGreaterThan(G.S.fcsr['fc_hard'].next - Date.now());
  });

  it('stores days for UI hint', () => {
    fcFsrsScore('fc_0', 3);
    expect(G.S.fcsr['fc_0'].days).toBeGreaterThanOrEqual(1);
  });
});

describe('fcGetDueIndices', () => {
  it('returns all indices when fcsr is empty (all new)', () => {
    const due = fcGetDueIndices();
    expect(due).toEqual([0, 1, 2]);
  });

  it('excludes cards whose next is strictly in the future', () => {
    G.S.fcsr['fc_0'] = { n: 2, next: Date.now() + 10 * 86400000 };
    G.S.fcsr['fc_1'] = { n: 1, next: Date.now() - 100 }; // overdue
    // fc_2 unseen
    const due = fcGetDueIndices();
    expect(due).toContain(1);
    expect(due).toContain(2);
    expect(due).not.toContain(0);
  });
});

describe('fcRebuildQueue', () => {
  it('populates G.S.fcQueue with all due indices and resets position', () => {
    fcRebuildQueue();
    expect(G.S.fcQueue).toHaveLength(3);
    expect(G.S.fcQueuePos).toBe(0);
    // must contain each index 0..2 exactly once regardless of order
    expect(G.S.fcQueue.slice().sort()).toEqual([0, 1, 2]);
  });
});
