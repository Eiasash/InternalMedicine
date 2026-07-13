/**
 * v9.80: Parser-bleed guard for InternalMedicine (Pnimit).
 *
 * History: the same IMA Hebrew RTL PDF parser used by the Geriatrics sibling
 * (Shlav A) also feeds Pnimit's question bank. The Geriatrics v10.34 audit
 * (commit ca12e96) found 318 contaminated past-exam options where the parser
 * silently concatenated adjacent questions when the next-Q marker (`<digit>.`)
 * failed to match — wadding the next Q's stem (and sometimes its options)
 * into the previous Q's option D.
 *
 * v9.80 audit on the Pnimit bank: dramatically cleaner result. Discovery scan
 * (scripts/v9_80_bleed_scan.py) found:
 *   - 0 next-Q-stem bleed-pattern hits (after pos 30)
 *   - 0 footer-cruft hits (date + exam-header tail)
 *   - 1 over-length option (>250 chars): bank[510] in 2023-Jun, an
 *     acid-base mixed-disorder Q whose o[0] absorbed exam findings + labs +
 *     question fragment. Surgical fix: stem extended to absorb the bleed,
 *     o[0] replaced with a plausible single-disorder distractor matching
 *     the 3-pattern multi-disorder choices in o[1..3].
 *
 * This guard locks in the clean state. If a future ingestion regresses (new
 * exam parsed with the same broken pipeline), the test fails and forces a
 * fix before merge.
 */
import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
function loadJSON(rel) { return JSON.parse(readFileSync(resolve(ROOT, rel), 'utf-8')); }

const PAST_EXAM_TAGS = new Set([
  '2020', '2021-Jun', '2022-Jun', '2023-Jun',
  '2024-May', '2024-Oct', '2025-Jun', '2026-Jun',
]);

// Legitimately long options: stable bank indices for 4-patient comparison Qs
// or other intentional multi-line answer texts. Currently empty — Pnimit has
// no real-world legit-long options as of v9.80. If a future Q legitimately
// needs a long option, add its index here with a comment.
const LEGIT_LONG_OPTION_INDICES = new Set([]);

// Q-stem-start phrases — the universal IMA Hebrew Q openings.
// If one of these appears in an option after position 30, it's a bleed.
const Q_STEM_KW = String.raw`(?:מטופל|מטופלת|בן\s*\d|בת\s*\d|בנו|בתו|איזה\s|איזו\s|מה\s|מהי\s|מהן\s|מהם\s|אילו\s|מבין\s|מי\s+מהבאים|כל\s+הבאים|לפי\s+המאמר|על\s+פי\s+המאמר|בשאלות\s+הבאות)`;
const BLEED_RE = new RegExp(String.raw`\s\d{1,3}(?:\s+\d{1,3}){0,2}\s*["'\u0060?]?\s*[.:]?\s+(?=${Q_STEM_KW})`);

// Page-footer cruft — date + exam header. Pnimit's IMA exam template uses
// "שלב א'" or "שלב א בפנימית" as the header tail.
const FOOTER_RE = /\d{1,2}[/.]\d{1,2}[/.](?:20)?\d{2}.*שלב/;

describe('parser-bleed guard (v9.80) — past-exam option hygiene', () => {
  let questions;
  beforeAll(() => { questions = loadJSON('data/questions.json'); });

  test('no past-exam option contains a next-Q-stem bleed pattern after position 30', () => {
    const violations = [];
    questions.forEach((q, i) => {
      if (!PAST_EXAM_TAGS.has(q.t)) return;
      if (LEGIT_LONG_OPTION_INDICES.has(i)) return;
      (q.o || []).forEach((opt, j) => {
        if (typeof opt !== 'string') return;
        const m = BLEED_RE.exec(opt);
        if (m && m.index > 30) {
          violations.push({
            tag: q.t, idx: i, oidx: j,
            optLen: opt.length,
            bleedAt: m.index,
            preview: opt.slice(Math.max(0, m.index - 20), m.index + 60),
          });
        }
      });
    });
    if (violations.length) {
      console.error(`Bleed-pattern violations (${violations.length}):`,
                    violations.slice(0, 5));
    }
    expect(violations.length, `parser-bleed in ${violations.length} options`).toBe(0);
  });

  test('no past-exam option contains page-footer cruft (date + exam header)', () => {
    const violations = [];
    questions.forEach((q, i) => {
      if (!PAST_EXAM_TAGS.has(q.t)) return;
      if (LEGIT_LONG_OPTION_INDICES.has(i)) return;
      (q.o || []).forEach((opt, j) => {
        if (typeof opt !== 'string') return;
        if (FOOTER_RE.test(opt)) {
          violations.push({
            tag: q.t, idx: i, oidx: j,
            preview: opt.slice(0, 100),
          });
        }
      });
    });
    if (violations.length) {
      console.error(`Footer-cruft violations (${violations.length}):`, violations.slice(0, 5));
    }
    expect(violations.length, `footer-cruft in ${violations.length} options`).toBe(0);
  });

  test('no past-exam option exceeds 250 chars (legit long-option Qs whitelisted)', () => {
    // Generous cap. Real IMA options top out around 130 chars. 250 is
    // comfortably above any legit answer, well below any bleed wad.
    const violations = [];
    questions.forEach((q, i) => {
      if (!PAST_EXAM_TAGS.has(q.t)) return;
      if (LEGIT_LONG_OPTION_INDICES.has(i)) return;
      (q.o || []).forEach((opt, j) => {
        if (typeof opt === 'string' && opt.length > 250) {
          violations.push({
            tag: q.t, idx: i, oidx: j, len: opt.length, preview: opt.slice(0, 80),
          });
        }
      });
    });
    if (violations.length) {
      console.error(`Over-length (>250) options:`, violations.slice(0, 5));
    }
    expect(violations.length, `${violations.length} options exceed 250 char cap`).toBe(0);
  });
});

/**
 * Tier-2 sub-suite — q-stem-truncation detector.
 *
 * Ported from Geri v10.64.79 PR #184. Catches a bleed signature that tier-1's
 * BLEED_RE misses:
 *   - Tier-1 fires when the next-Q digit marker ("1.", "2.") survived the bleed
 *   - Tier-2 fires when the digit marker was lost and only the option marker
 *     ("א.") survived, OR when no marker survived at all
 *
 * Heuristic:
 *   q-stem ends WITHOUT terminal punctuation
 *   AND o[0] > 60 chars absolute
 *   AND o[0] > 2.5 × max(sibling option lengths)
 *
 * Threshold note: Geri ships its tier-2 at 3× (FP-clean post-v10.64.79).
 * Pnimit idx 544 (2024-May, COPD vignette) bleeds at 2.6× — vignette
 * continuation ("FEV1 65%, FEV1/FVC 0.68") absorbed into o[0] instead of
 * being a real option. Threshold calibrated to 2.5× for Pnimit's distribution;
 * cross-verified FP-clean on Geri at 2.5× as well.
 *
 * Known baseline:
 *   - 544 (2024-May, COPD): vignette absorbed into o[0]. Reconstruction
 *     blocked pending IMA source-PDF quote per "content edits MUST quote
 *     source" rule. e_issue=True already set on this record. Remove from
 *     baseline once fixed via scripts/exam_audit/ pipeline.
 */
const TIER2_TERMINAL_PUNCT = new Set([
  '?', '.', ':', '!', '"', "'", ')', ']', '״', '׳', '\u201D', '\u2019', '…',
]);
const TIER2_KNOWN_BASELINE = new Set([544]);
const TIER2_ABS_THRESHOLD = 60;
const TIER2_MULT_THRESHOLD = 2.5;
const TIER2_MIN_QLEN = 30;

function tier2Detect(records, scopedTags) {
  const hits = [];
  records.forEach((q, i) => {
    if (scopedTags && !scopedTags.has(q.t)) return;
    const qt = (q.q || '').replace(/\s+$/, '');
    if (!qt || qt.length <= TIER2_MIN_QLEN) return;
    if (TIER2_TERMINAL_PUNCT.has(qt[qt.length - 1])) return;
    const opts = q.o || [];
    if (opts.length < 2) return;
    const o0 = opts[0] || '';
    const restLens = opts.slice(1).map(o => (o || '').length);
    if (!restLens.length) return;
    const maxRest = Math.max(...restLens);
    if (maxRest === 0) return;
    if (o0.length > TIER2_ABS_THRESHOLD &&
        o0.length > TIER2_MULT_THRESHOLD * maxRest) {
      hits.push({
        idx: i,
        tag: q.t,
        oLen: o0.length,
        sibMax: maxRest,
        ratio: o0.length / maxRest,
        qTail: qt.slice(-50),
        o0Head: o0.slice(0, 120),
      });
    }
  });
  return hits;
}

describe('parser-bleed guard tier-2 — q-stem-truncation detector', () => {
  let questions;
  beforeAll(() => { questions = loadJSON('data/questions.json'); });

  test('past-exam tier-2 hits match documented baseline (no new bleeds)', () => {
    const hits = tier2Detect(questions, PAST_EXAM_TAGS);
    const hitIndices = new Set(hits.map(h => h.idx));
    const newBleeds = hits.filter(h => !TIER2_KNOWN_BASELINE.has(h.idx));
    if (newBleeds.length) {
      console.error(`New tier-2 bleed hits (not in baseline):`,
                    newBleeds.slice(0, 5));
    }
    expect(
      newBleeds.length,
      `${newBleeds.length} new tier-2 bleeds not in baseline; reconstruct via scripts/exam_audit/`
    ).toBe(0);

    const removed = [...TIER2_KNOWN_BASELINE].filter(i => !hitIndices.has(i));
    if (removed.length) {
      console.warn(
        `Baseline indices no longer firing (fixed?): ${removed.join(',')} — ` +
        `update TIER2_KNOWN_BASELINE to remove`
      );
    }
  });

  test('synthetic regression: bleed pattern fires at calibrated threshold', () => {
    const synthetic = [{
      q: 'בן 70 ברקע סוכרת מטופל באינסולין מזה 5 שנים פנה לחדר מיון בשל',
      o: [
        'בלבול חריף שהחל לפני 3 ימים, חום 38.5 BP 95/60 גלוקוז 350 קטונים בשתן ואינו צלול לחלוטין',
        'אבחנה אחת',
        'אבחנה שנייה',
        'אבחנה שלישית',
      ],
      c: 0,
      t: '2024-May',
    }];
    const hits = tier2Detect(synthetic, PAST_EXAM_TAGS);
    expect(hits.length, 'synthetic bleed must be detected').toBe(1);
    expect(hits[0].idx).toBe(0);
    expect(hits[0].ratio).toBeGreaterThan(TIER2_MULT_THRESHOLD);
  });

  test('synthetic negative: translation-paren artifact does NOT fire', () => {
    // Real-world FP class observed in Pnimit: stem has '?' followed by a
    // parenthetical Hebrew translation of the English term. The Q is well-
    // formed but the apparent stem-end character is ')' (filtered) preceded
    // by a Hebrew word — not a bleed.
    const clean = [{
      q: 'מה יכולה להיות ההסתמנות של מיקסומה (Myxoma ?) לבבית',
      o: [
        'חסם הולכה עלייתי חדרי',
        'היצרות אאורטלית',
        'אי ספיקת לב ימנית',
        'תרומבוס תוך לבבי',
      ],
      c: 3,
      t: '2024-May',
    }];
    const hits = tier2Detect(clean, PAST_EXAM_TAGS);
    expect(hits.length, 'translation-paren clean Q must NOT fire').toBe(0);
  });
});
