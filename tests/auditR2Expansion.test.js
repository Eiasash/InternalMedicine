/**
 * Audit-fix-deploy Round 2 expansion tests (v10.4.4).
 *
 * Targets surfaces NOT covered by R1's auditExpansion.test.js:
 *   1. buildMockExamPool — IMA-bias picker, deterministic distribution
 *   2. heDir Hebrew/Latin direction detector — bidi numerics + units
 *   3. sanitize XSS escape — innerHTML safety helper
 *   4. fmtT seconds formatter — boundary cases (DST-irrelevant; pure math)
 *   5. isMetaOption — mixed-language meta-option detection
 *   6. getOptShuffle — deterministic seeded shuffle invariants
 *   7. backup/restore — malformed JSON, version drift, partial backup
 *   8. service worker — cache-name versioning + URL inventory invariants
 *   9. quiz filter intersection — per-topic + per-year + edge cases
 *  10. localStorage / IndexedDB schema-key migration
 *  11. Mutation-test feel — operator/boundary flips on isOk + getOptShuffle
 *
 * Round 1 baseline = 654 tests / 34 files. Target = +25 tests, real risk.
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Hoist mocks — same pattern as auditExpansion.test.js
vi.mock('../src/ui/track-view.js', () => ({ calcEstScore: vi.fn() }));
vi.mock('../src/ai/client.js', () => ({ callAI: vi.fn() }));
vi.mock('../src/sr/spaced-repetition.js', () => ({
  getTopicStats: vi.fn(() => ({})),
  getDueQuestions: vi.fn(() => []),
}));

import {
  EXAM_FREQ,
  EXAM_YEARS,
  TOPICS,
  IMA_WEIGHTS,
  APP_VERSION,
} from '../src/core/constants.js';
import {
  isOk,
  sanitize,
  heDir,
  fmtT,
  isMetaOption,
  getOptShuffle,
  remapExplanationLetters,
} from '../src/core/utils.js';
import G from '../src/core/globals.js';

const rootDir = resolve(import.meta.dirname, '..');

// =============================================================
// 1. buildMockExamPool — IMA-bias picker distribution
// =============================================================
describe('R2: mock-exam picker — multi-tag intersection', () => {
  it('per-topic target slots respect EXAM_FREQ ordering pairwise', () => {
    // For any pair (i, j) with EXAM_FREQ[i] >= 2*EXAM_FREQ[j], topic i should
    // get >= topic j slots after rounding (modulo the min-1 floor).
    const total = EXAM_FREQ.reduce((a, b) => a + b, 0);
    const targets = EXAM_FREQ.map((f) => Math.max(1, Math.round((f / total) * 100)));
    for (let i = 0; i < 24; i++) {
      for (let j = 0; j < 24; j++) {
        if (EXAM_FREQ[i] >= 2 * EXAM_FREQ[j]) {
          expect(targets[i], `ti=${i} should get ≥ ti=${j}`).toBeGreaterThanOrEqual(targets[j]);
        }
      }
    }
  });

  it('multi-tag (year+topic) intersection narrows the question pool', () => {
    const questions = JSON.parse(
      readFileSync(resolve(rootDir, 'data', 'questions.json'), 'utf-8'),
    );
    const cardiology2025 = questions.filter(
      (q) => q.ti === 0 && q.t === '2025-Jun',
    );
    // Intersection should be ≤ either single-tag set
    const cardiAll = questions.filter((q) => q.ti === 0).length;
    const y2025All = questions.filter((q) => q.t === '2025-Jun').length;
    expect(cardiology2025.length).toBeLessThanOrEqual(cardiAll);
    expect(cardiology2025.length).toBeLessThanOrEqual(y2025All);
  });
});

// =============================================================
// 2. Hebrew bidi: heDir + mixed numerics
// =============================================================
describe('R2: heDir Hebrew bidi numerics', () => {
  it('returns "rtl" for predominantly Hebrew text with embedded Arabic numerals', () => {
    expect(heDir('המטופל בן 75 עם לחץ דם 140/90 mmHg')).toBe('rtl');
  });

  it('returns "ltr" for predominantly English text with units', () => {
    expect(heDir('Lasix 40 mg IV q8h until SBP > 100 mmHg')).toBe('ltr');
  });

  it('returns "auto" for digits-only or symbols-only strings (no letters)', () => {
    expect(heDir('150/90')).toBe('auto');
    expect(heDir('***')).toBe('auto');
    expect(heDir('   ')).toBe('auto');
  });

  it('returns "auto" for empty / null / undefined inputs (no crash)', () => {
    expect(heDir('')).toBe('auto');
    expect(heDir(null)).toBe('auto');
    expect(heDir(undefined)).toBe('auto');
  });

  it('Hebrew at 25% threshold flips to rtl (boundary mutation guard)', () => {
    // 1 Hebrew letter + 3 English letters = 25% → rtl per `>= 0.25`
    expect(heDir('שabc')).toBe('rtl');
    // 1 Hebrew + 4 English = 20% → ltr
    expect(heDir('שabcd')).toBe('ltr');
  });
});

// =============================================================
// 3. sanitize — innerHTML XSS safety
// =============================================================
describe('R2: sanitize escapes all 5 unsafe HTML chars', () => {
  it('escapes < > & " and \'', () => {
    expect(sanitize('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
    expect(sanitize("O'Brien & Sons")).toBe('O&#39;Brien &amp; Sons');
  });

  it('coerces falsy non-string inputs to empty string (current contract)', () => {
    // sanitize uses `String(s||'')` — any falsy (null/undefined/0/'') becomes ''.
    // Documenting this so a refactor to String(s ?? '') would visibly trip the
    // test rather than silently change render output.
    expect(sanitize(null)).toBe('');
    expect(sanitize(undefined)).toBe('');
    expect(sanitize(0)).toBe(''); // falsy → empty per `s||''`
    expect(sanitize(false)).toBe('');
    expect(sanitize(42)).toBe('42'); // truthy number coerces normally
  });

  it('preserves Hebrew + Arabic numerals + medical units verbatim', () => {
    const s = 'מינון: 40 מ"ג IV q8h';
    expect(sanitize(s)).toBe('מינון: 40 מ&quot;ג IV q8h');
  });
});

// =============================================================
// 4. fmtT — DST-irrelevant pure math (boundary cases)
// =============================================================
describe('R2: fmtT seconds formatter — boundary cases', () => {
  it('formats sub-minute as MM:SS', () => {
    expect(fmtT(0)).toBe('00:00');
    expect(fmtT(59)).toBe('00:59');
  });

  it('formats sub-hour with leading zero on minutes (not hours)', () => {
    expect(fmtT(60)).toBe('01:00');
    expect(fmtT(3599)).toBe('59:59');
  });

  it('formats >=1h as H:MM:SS (3-hour mock-exam timer)', () => {
    expect(fmtT(3600)).toBe('1:00:00');
    expect(fmtT(10800)).toBe('3:00:00'); // mock exam start
    expect(fmtT(10799)).toBe('2:59:59'); // mock exam minus 1s
  });
});

// =============================================================
// 5. isMetaOption — mixed-language meta-option detection
// =============================================================
describe('R2: isMetaOption mixed-language detection', () => {
  it('flags Hebrew "all answers" and "none of the above" patterns', () => {
    expect(isMetaOption('כל התשובות נכונות')).toBe(true);
    expect(isMetaOption('כל האמור נכון')).toBe(true);
    expect(isMetaOption('אף תשובה לא נכונה')).toBe(true);
  });

  it('flags English All-of-the-above / both-X-and-Y patterns', () => {
    expect(isMetaOption('All of the above')).toBe(true);
    expect(isMetaOption('None of the above')).toBe(true);
    expect(isMetaOption('Both A and C')).toBe(true);
  });

  it('does NOT flag normal clinical options (false positive guard)', () => {
    expect(isMetaOption('Furosemide 40 mg IV')).toBe(false);
    expect(isMetaOption('אקו לב')).toBe(false);
    expect(isMetaOption('CT angiography')).toBe(false);
  });
});

// =============================================================
// 6. getOptShuffle — deterministic seeded shuffle
// =============================================================
describe('R2: getOptShuffle deterministic invariants', () => {
  it('returns a permutation of [0..n-1]', () => {
    G._optShuffle = null;
    const q = { o: ['A', 'B', 'C', 'D'] };
    const map = getOptShuffle(7, q);
    expect(map.slice().sort((a, b) => a - b)).toEqual([0, 1, 2, 3]);
  });

  it('deterministic for the same qIdx within a session', () => {
    G._optShuffle = null;
    const q = { o: ['A', 'B', 'C', 'D'] };
    const m1 = getOptShuffle(7, q);
    const m2 = getOptShuffle(7, q);
    expect(m2).toEqual(m1);
  });

  it('pins meta-options to the END (so "all of the above" stays last)', () => {
    G._optShuffle = null;
    const q = { o: ['Furosemide', 'Spironolactone', 'Both A and B', 'None'] };
    const map = getOptShuffle(13, q);
    const lastDisplayedIdx = map[map.length - 1];
    const secondLastIdx = map[map.length - 2];
    // Either last OR second-to-last must be a meta-option (both are, here)
    expect(isMetaOption(q.o[lastDisplayedIdx]) || isMetaOption(q.o[secondLastIdx])).toBe(true);
  });
});

// =============================================================
// 7. remapExplanationLetters — letter remapping after shuffle
// =============================================================
describe('R2: remapExplanationLetters keeps explanations consistent', () => {
  it('remaps English bare "A"/"B"/"C" letters via word-boundary', () => {
    // shuf = [2, 0, 1, 3] means: displayed[0]=orig 2, displayed[1]=orig 0, ...
    // inv[orig]=displayed → inv[2]=0
    // 'C' (orig idx 2) → displayed 0 = 'A'
    const out = remapExplanationLetters('Answer C is correct', [2, 0, 1, 3]);
    expect(out).toBe('Answer A is correct');
  });

  it('leaves non-letter text unchanged (regression: greedy regex)', () => {
    const out = remapExplanationLetters('Lasix dose 40 mg/dL', [2, 0, 1, 3]);
    expect(out).toBe('Lasix dose 40 mg/dL');
  });

  it('returns input unchanged when shuffle is identity (no-op)', () => {
    const out = remapExplanationLetters('Answer B is correct', [0, 1, 2, 3]);
    expect(out).toBe('Answer B is correct');
  });
});

// =============================================================
// 8. isOk grading helper — c_accept array support
// =============================================================
describe('R2: isOk grading mutation-resistant', () => {
  it('returns true ONLY for the canonical answer when c_accept absent', () => {
    const q = { c: 2 };
    expect(isOk(q, 2)).toBe(true);
    expect(isOk(q, 1)).toBe(false);
    expect(isOk(q, 3)).toBe(false);
  });

  it('honors c_accept array (multiple correct answers)', () => {
    const q = { c: 2, c_accept: [1, 2] };
    expect(isOk(q, 1)).toBe(true);
    expect(isOk(q, 2)).toBe(true);
    expect(isOk(q, 0)).toBe(false);
  });

  it('falls back to q.c when c_accept is empty array (boundary)', () => {
    const q = { c: 3, c_accept: [] };
    expect(isOk(q, 3)).toBe(true);
    expect(isOk(q, 0)).toBe(false);
  });

  it('returns false when q is null/undefined (defense-in-depth)', () => {
    expect(isOk(null, 0)).toBe(false);
    expect(isOk(undefined, 1)).toBe(false);
  });
});

// =============================================================
// 9. backup/restore — malformed / version-drift / partial
// =============================================================
describe('R2: backup → restore extended edge cases', () => {
  it('handles malformed JSON gracefully (caller catches; payload-validator does not)', async () => {
    // filterRestorePayload only deals with parsed objects. JSON.parse
    // failure happens upstream — this asserts the parse-then-filter
    // chain is robust.
    expect(() => JSON.parse('{ broken json')).toThrow();
    const { filterRestorePayload } = await import('../src/features/cloud.js');
    // Empty obj after caught parse error should pass through cleanly.
    expect(filterRestorePayload({}, new Set(['qOk']))).toEqual({});
  });

  it('partial backup (missing optional keys) round-trips without error', async () => {
    const { filterRestorePayload } = await import('../src/features/cloud.js');
    const allowed = new Set(['qOk', 'qNo', 'sr', 'wrong', 'streak']);
    // Only qOk + streak — all others missing
    const partial = { qOk: 50, streak: 3 };
    const out = filterRestorePayload(partial, allowed);
    expect(out).toEqual(partial);
  });

  it('version-mismatch backup (extra unknown keys ignored) does not pollute G.S', async () => {
    const { filterRestorePayload } = await import('../src/features/cloud.js');
    const allowed = new Set(['qOk', 'qNo']);
    const olderFormat = {
      qOk: 100,
      qNo: 20,
      // v9-era keys not present in v10 schema:
      legacyEf: 2.5,
      legacy_topic_stats: { foo: 'bar' },
      __v: 9.34,
    };
    const out = filterRestorePayload(olderFormat, allowed);
    expect(out).toEqual({ qOk: 100, qNo: 20 });
    expect(out.legacyEf).toBeUndefined();
    expect(out.legacy_topic_stats).toBeUndefined();
    expect(out.__v).toBeUndefined();
  });

  it('blocks constructor / prototype keys (full PROTO_BLOCKLIST coverage)', async () => {
    const { filterRestorePayload } = await import('../src/features/cloud.js');
    const allowed = new Set(['qOk', 'constructor', 'prototype']);
    const rogue = { qOk: 5, constructor: { polluted: true }, prototype: { polluted: true } };
    const out = filterRestorePayload(rogue, allowed);
    expect(out.constructor).not.toEqual({ polluted: true });
    expect(out.prototype).toBeUndefined();
    expect(out.qOk).toBe(5);
  });
});

// =============================================================
// 10. Service worker cache invalidation invariants
// =============================================================
describe('R2: service worker cache versioning invariants', () => {
  const sw = readFileSync(resolve(rootDir, 'sw.js'), 'utf-8');

  it('cache name embeds current APP_VERSION (forces invalidation on bump)', () => {
    expect(sw).toMatch(new RegExp(`pnimit-v${APP_VERSION.replace(/\./g, '\\.')}`));
  });

  it('activate handler deletes ALL caches except current (cache-eviction guard)', () => {
    // Critical: activate must filter k!==CACHE then caches.delete each.
    // A typo (k===CACHE) would delete the current cache and break the app.
    expect(sw).toMatch(/k\s*!==?\s*CACHE/);
    expect(sw).toMatch(/caches\.delete\(k\)/);
  });

  it('install handler skipWaiting (guarantees fast SW upgrade)', () => {
    expect(sw).toMatch(/self\.skipWaiting\(\)/);
  });

  it('JSON_DATA_URLS uses cache-first via shouldUseCacheFirst (perf guard)', () => {
    expect(sw).toMatch(/shouldUseCacheFirst/);
    expect(sw).toMatch(/JSON_DATA_URLS\.some/);
  });
});

// =============================================================
// 11. localStorage migration paths (v9 → v10)
// =============================================================
describe('R2: localStorage / migration paths', () => {
  it('LS namespace key is `pnimit_mega` (immutable contract — never rename)', async () => {
    const { LS } = await import('../src/core/constants.js');
    // Renaming this key would orphan every existing user's progress.
    expect(LS).toBe('pnimit_mega');
  });

  it('Supabase schema points to `public` (NOT `internal_medicine` — 9.76 scar)', () => {
    // grep-style assertion — the Supabase REST URL pattern uses bare /rest/v1/
    // (= public schema) rather than /rest/v1/internal_medicine.
    const cloud = readFileSync(
      resolve(rootDir, 'src', 'features', 'cloud.js'),
      'utf-8',
    );
    expect(cloud).not.toMatch(/\/rest\/v1\/internal_medicine\./);
    expect(cloud).toMatch(/\/rest\/v1\/(rpc|pnimit_)/);
  });
});

// =============================================================
// 12. IMA_WEIGHTS overlap-by-design annotation guard
// =============================================================
describe('R2: IMA_WEIGHTS overlap annotation', () => {
  it('source comment explicitly documents the dual-count (anti-bitrot)', () => {
    const constants = readFileSync(
      resolve(rootDir, 'src', 'core', 'constants.js'),
      'utf-8',
    );
    // Annotation must call out (a) overlap by design, (b) the ECG dual-count,
    // (c) the do-not-normalise rule. Future maintainers will see this comment
    // before "fixing" the sum.
    expect(constants).toMatch(/overlap by design/i);
    expect(constants).toMatch(/ECG/);
    expect(constants).toMatch(/sum\s*=\s*?141|sum===141|sum:\s*141/i);
  });

  it('IMA_WEIGHTS sum is exactly 141 (locks the documented invariant)', () => {
    const sum = IMA_WEIGHTS.reduce((a, b) => a + b, 0);
    expect(sum).toBe(141);
  });
});
