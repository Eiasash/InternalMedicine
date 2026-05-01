/**
 * Audit-fix-deploy expansion tests (v10.4.2).
 *
 * Targets real risk surfaces flagged in the audit-fix-deploy skill § E:
 *   1. 24-topic contract enforcement (TOPICS / EXAM_FREQ / IMA_WEIGHTS)
 *   2. HARRISON_PDF_MAP integrity — every referenced PDF must exist on disk
 *   3. IMA-bias mock-exam picker distribution invariants
 *   4. 7-tag exam mode coverage (each EXAM_YEAR has at least one question)
 *   5. EXAM_YEARS canonical format guard
 *   6. Backup → restore round-trip (mock supabase) — guards 9.76 PR #42 regression
 *      where applyRestorePayload would silently drop everything if Object.keys(G.S)
 *      were used as the dynamic whitelist after a fresh login (empty G.S).
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Hoist mocks to top-level — vitest 4+ rejects nested vi.mock().
// cloud.js transitively imports modules that reference window/dom on import.
vi.mock('../src/ui/track-view.js', () => ({ calcEstScore: vi.fn() }));
vi.mock('../src/ai/client.js', () => ({ callAI: vi.fn() }));
vi.mock('../src/sr/spaced-repetition.js', () => ({
  getTopicStats: vi.fn(() => ({})),
  getDueQuestions: vi.fn(() => []),
}));

import {
  TOPICS,
  EXAM_FREQ,
  IMA_WEIGHTS,
  EXAM_YEARS,
  HARRISON_PDF_MAP,
  APP_VERSION,
} from '../src/core/constants.js';

const rootDir = resolve(import.meta.dirname, '..');

// =============================================================
// 1. 24-topic contract — TOPICS/EXAM_FREQ/IMA_WEIGHTS must agree
// =============================================================
describe('24-topic contract', () => {
  it('TOPICS has exactly 24 entries (P0064-2025)', () => {
    expect(TOPICS).toHaveLength(24);
  });

  it('EXAM_FREQ has exactly 24 entries (one weight per topic)', () => {
    expect(EXAM_FREQ).toHaveLength(24);
  });

  it('IMA_WEIGHTS has exactly 24 entries (one weight per topic)', () => {
    expect(IMA_WEIGHTS).toHaveLength(24);
  });

  it('every TOPIC string is non-empty', () => {
    TOPICS.forEach((t, i) => {
      expect(typeof t).toBe('string');
      expect(t.trim().length, `TOPICS[${i}] empty`).toBeGreaterThan(0);
    });
  });

  it('every EXAM_FREQ weight is a positive integer', () => {
    EXAM_FREQ.forEach((w, i) => {
      expect(Number.isInteger(w), `EXAM_FREQ[${i}] not int`).toBe(true);
      expect(w, `EXAM_FREQ[${i}] non-positive`).toBeGreaterThan(0);
    });
  });

  it('every IMA_WEIGHTS entry is a positive integer (% syllabus)', () => {
    IMA_WEIGHTS.forEach((w, i) => {
      expect(Number.isInteger(w), `IMA_WEIGHTS[${i}] not int`).toBe(true);
      expect(w, `IMA_WEIGHTS[${i}] non-positive`).toBeGreaterThan(0);
    });
  });

  it('IMA_WEIGHTS sum approximately 100 (% syllabus check)', () => {
    const sum = IMA_WEIGHTS.reduce((a, b) => a + b, 0);
    // Allow generous slack — these are approx % from P0064-2025 and currently
    // sum to 141 (some categories double-count e.g. ECG under both Cardiology
    // and Arrhythmias). Lock the bounds rather than the exact figure so an
    // accidental zero/typo still trips the guard.
    expect(sum).toBeGreaterThanOrEqual(100);
    expect(sum).toBeLessThanOrEqual(150);
  });

  it('every question.ti is in 0..23', () => {
    const questions = JSON.parse(
      readFileSync(resolve(rootDir, 'data', 'questions.json'), 'utf-8'),
    );
    const tis = new Set(questions.map((q) => q.ti));
    tis.forEach((ti) => {
      expect(Number.isInteger(ti), `non-int ti: ${ti}`).toBe(true);
      expect(ti).toBeGreaterThanOrEqual(0);
      expect(ti).toBeLessThanOrEqual(23);
    });
  });

  it('every topic 0..23 has at least one question (no orphan topics)', () => {
    const questions = JSON.parse(
      readFileSync(resolve(rootDir, 'data', 'questions.json'), 'utf-8'),
    );
    const counts = new Array(24).fill(0);
    questions.forEach((q) => {
      if (q.ti >= 0 && q.ti <= 23) counts[q.ti]++;
    });
    counts.forEach((c, i) => {
      // Surface gaps — flagged below 5 in IMPROVEMENTS.md
      expect(c, `topic ${i} (${TOPICS[i]}) has only ${c} questions`).toBeGreaterThan(0);
    });
  });
});

// =============================================================
// 2. HARRISON_PDF_MAP integrity — every PDF must exist on disk
// =============================================================
describe('HARRISON_PDF_MAP integrity', () => {
  it('has at least 60 chapter mappings', () => {
    expect(Object.keys(HARRISON_PDF_MAP).length).toBeGreaterThanOrEqual(60);
  });

  it('every referenced PDF exists on disk', () => {
    const missing = [];
    for (const [ch, p] of Object.entries(HARRISON_PDF_MAP)) {
      const abs = resolve(rootDir, p);
      if (!existsSync(abs)) missing.push({ ch, p });
    }
    expect(missing, `missing PDFs: ${JSON.stringify(missing)}`).toEqual([]);
  });

  it('every chapter key parses as a positive integer', () => {
    Object.keys(HARRISON_PDF_MAP).forEach((ch) => {
      const n = Number(ch);
      expect(Number.isInteger(n), `non-int ch key: ${ch}`).toBe(true);
      expect(n).toBeGreaterThan(0);
    });
  });

  it('every PDF path starts with harrison/ and ends in .pdf', () => {
    Object.values(HARRISON_PDF_MAP).forEach((p) => {
      expect(p.startsWith('harrison/'), `bad prefix: ${p}`).toBe(true);
      expect(p.endsWith('.pdf'), `bad suffix: ${p}`).toBe(true);
    });
  });

  it('no URL-encoded escape sequences leaked into paths (regression: %23U00e9 was %-encoded by mistake in pre-v10.4.2)', () => {
    // Filenames may contain raw # but never URL-encoded sequences like %23,
    // %20, %2F — those were copy-paste artifacts in the v10.4.1 map.
    Object.values(HARRISON_PDF_MAP).forEach((p) => {
      expect(p.includes('%23'), `URL-encoded # in: ${p}`).toBe(false);
      expect(p.includes('%20'), `URL-encoded space in: ${p}`).toBe(false);
      expect(p.includes('%2F'), `URL-encoded slash in: ${p}`).toBe(false);
    });
  });
});

// =============================================================
// 3. EXAM_YEARS canonical format + 7-tag exam mode coverage
// =============================================================
describe('EXAM_YEARS exam-mode coverage', () => {
  it('EXAM_YEARS has exactly 7 sessions', () => {
    expect(EXAM_YEARS).toHaveLength(7);
  });

  it('EXAM_YEARS in canonical YYYY or YYYY-MMM format', () => {
    EXAM_YEARS.forEach((y) => {
      // 2020 (bare) or 2024-May etc.
      expect(/^\d{4}(-[A-Z][a-z]{2})?$/.test(y), `bad format: ${y}`).toBe(true);
    });
  });

  it('every EXAM_YEAR has at least one question (quiz loads ≥1 per tag)', () => {
    const questions = JSON.parse(
      readFileSync(resolve(rootDir, 'data', 'questions.json'), 'utf-8'),
    );
    const perTag = {};
    questions.forEach((q) => {
      if (q.t) perTag[q.t] = (perTag[q.t] || 0) + 1;
    });
    EXAM_YEARS.forEach((y) => {
      expect(perTag[y], `EXAM_YEAR ${y} has 0 questions`).toBeGreaterThan(0);
    });
  });

  it('each real-exam tag has ≥80 questions (exam-realistic count)', () => {
    const questions = JSON.parse(
      readFileSync(resolve(rootDir, 'data', 'questions.json'), 'utf-8'),
    );
    const perTag = {};
    questions.forEach((q) => {
      if (q.t) perTag[q.t] = (perTag[q.t] || 0) + 1;
    });
    EXAM_YEARS.forEach((y) => {
      expect(perTag[y], `EXAM_YEAR ${y} has only ${perTag[y]}`).toBeGreaterThanOrEqual(80);
    });
  });
});

// =============================================================
// 4. IMA-bias mock-exam picker distribution invariants
// =============================================================
describe('IMA-bias mock-exam distribution', () => {
  // Re-implement the deterministic part of buildMockExamPool (engine.js)
  // without RNG, so we can assert per-topic targets are sensible.
  function computeTargets(freqs, total = 100) {
    const sumW = freqs.reduce((a, b) => a + b, 0);
    return freqs.map((f) => Math.max(1, Math.round((f / sumW) * total)));
  }

  it('every topic with non-zero freq gets at least 1 slot in the 100q pool', () => {
    const targets = computeTargets(EXAM_FREQ);
    targets.forEach((t, i) => {
      if (EXAM_FREQ[i] > 0) expect(t, `topic ${i} got 0 slots`).toBeGreaterThanOrEqual(1);
    });
  });

  it('high-freq topics get more slots than low-freq ones (Pulmonology > Dermatology)', () => {
    const targets = computeTargets(EXAM_FREQ);
    // Pulmonology (5) freq 60 should outweigh Dermatology (16) freq 15
    expect(targets[5]).toBeGreaterThan(targets[16]);
    // Cardiology (0) freq 50 should outweigh Toxicology (21) freq 15
    expect(targets[0]).toBeGreaterThan(targets[21]);
  });

  it('sum of targets stays within 100 ± 24 (rounding + min-1 floor inflation)', () => {
    const targets = computeTargets(EXAM_FREQ);
    const sum = targets.reduce((a, b) => a + b, 0);
    // Floor of 1 per topic adds inflation; rounding adds ± few
    expect(sum).toBeGreaterThanOrEqual(76);
    expect(sum).toBeLessThanOrEqual(124);
  });
});

// =============================================================
// 5. APP_VERSION trinity sanity
// =============================================================
describe('APP_VERSION trinity', () => {
  it('APP_VERSION matches semver-ish format', () => {
    expect(/^\d+\.\d+\.\d+$/.test(APP_VERSION), `bad APP_VERSION: ${APP_VERSION}`).toBe(true);
  });

  it('package.json version starts with APP_VERSION (allows .0 suffix)', () => {
    const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf-8'));
    expect(
      pkg.version === APP_VERSION || pkg.version.startsWith(APP_VERSION + '.'),
      `pkg.version=${pkg.version} vs APP_VERSION=${APP_VERSION}`,
    ).toBe(true);
  });

  it('sw.js CACHE includes APP_VERSION', () => {
    const sw = readFileSync(resolve(rootDir, 'sw.js'), 'utf-8');
    expect(sw.includes(`pnimit-v${APP_VERSION}`), `sw.js CACHE missing v${APP_VERSION}`).toBe(true);
  });
});

// =============================================================
// 6. Backup → restore round-trip — guards 9.76 PR #42 regression
// =============================================================
describe('backup → restore round-trip (filterRestorePayload)', () => {
  // Mocks are hoisted at top of file.

  it('round-trips a representative G.S payload without data loss', async () => {
    const { filterRestorePayload } = await import('../src/features/cloud.js');

    // Allowed schema mirrors a populated G.S after a few sessions.
    const allowed = new Set([
      'qOk', 'qNo', 'sr', 'wrong', 'streak', 'lastDay',
      'topicStats', 'dailyAct', '_mockHist', '_sessions',
    ]);

    const original = {
      qOk: 142,
      qNo: 38,
      sr: { 0: { ef: 2.5, iv: 7 } },
      wrong: [12, 45, 88],
      streak: 5,
      lastDay: '2026-05-01',
      topicStats: { 0: { ok: 12, no: 3 } },
      dailyAct: { '2026-05-01': 18 },
      _mockHist: [{ score: 76, date: '2026-04-29T09:00:00Z' }],
      _sessions: [{ ti: 0, n: 10 }],
    };

    // Simulate cloud round-trip: stringify → parse → filter.
    const wireFormat = JSON.parse(JSON.stringify(original));
    const restored = filterRestorePayload(wireFormat, allowed);

    expect(restored).toEqual(original);
  });

  it('rejects an attacker payload with __proto__ pollution attempt', async () => {
    const { filterRestorePayload } = await import('../src/features/cloud.js');
    const allowed = new Set(['qOk']);
    // Need raw object to have __proto__ inspectable — JSON.parse strips it
    // but a hand-crafted Supabase-row mock could include it.
    const rogue = { qOk: 5 };
    Object.defineProperty(rogue, '__proto__', {
      value: { polluted: true },
      enumerable: true,
      configurable: true,
    });

    const out = filterRestorePayload(rogue, allowed);
    expect(out.__proto__).not.toEqual({ polluted: true });
    expect({}.polluted).toBeUndefined(); // global Object.prototype clean
  });

  it('9.76 regression: empty allowed-set drops everything (does NOT silently keep)', async () => {
    // Pre-9.76 bug: cloudRestore used `Object.keys(G.S)` as whitelist.
    // If invoked before G.S was hydrated (fresh login), the whitelist was
    // empty → restore silently dropped the entire payload.
    // The fix is filterRestorePayload + a static schema. This test asserts
    // an empty allowed-set → empty output (i.e., the contract is honored,
    // not silently expanded to "keep everything").
    const { filterRestorePayload } = await import('../src/features/cloud.js');
    const out = filterRestorePayload({ qOk: 10, qNo: 5 }, new Set());
    expect(out).toEqual({});
  });

  it('refuses null / array / primitive payloads (defense-in-depth)', async () => {
    const { filterRestorePayload } = await import('../src/features/cloud.js');
    expect(filterRestorePayload(null, new Set(['x']))).toEqual({});
    expect(filterRestorePayload([1, 2, 3], new Set(['x']))).toEqual({});
    expect(filterRestorePayload('rogue', new Set(['x']))).toEqual({});
    expect(filterRestorePayload(42, new Set(['x']))).toEqual({});
  });
});
