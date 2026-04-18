/**
 * Broadens the `?[Hebrew]` formatting check to Harrison + Exam tags.
 *
 * `tests/regressionGuards.test.js` applies the formatting-quality checks only
 * to PAST_EXAM_TAGS because past-exam questions had specific PDF-extraction
 * artifacts (reversed digits, question mark on wrong side of RTL stems).
 * Harrison (589 Qs) and Exam (20 Qs) skip those checks entirely.
 *
 * The `?[Hebrew]` pattern is never a legitimate Hebrew construction — it
 * always reflects RTL punctuation mangling. It can show up in AI-generated
 * Harrison content if a prompt leaks through un-cleaned, so we guard it too.
 *
 * Starts with a deliberately loose budget. Tighten in follow-up as the
 * real baseline becomes known.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');

let questions;
beforeAll(() => {
  questions = JSON.parse(readFileSync(resolve(ROOT, 'data/questions.json'), 'utf-8'));
});

describe('Harrison + Exam formatting quality', () => {
  const OTHER_TAGS = new Set(['Harrison', 'Exam']);

  // FIXME: tighten once baseline is known.
  const QMARK_HEBREW_BUDGET = 50;

  it(`?[Hebrew] (wrong-side punct) stays under budget (<=${QMARK_HEBREW_BUDGET}) in Harrison+Exam`, () => {
    const bad = [];
    questions.forEach((q, i) => {
      if (!OTHER_TAGS.has(q.t)) return;
      const text = [q.q, ...(q.o || []), q.e || ''].join(' | ');
      if (/\?[\u0590-\u05FF]/.test(text)) {
        bad.push({ i, tag: q.t, preview: (q.q || '').slice(0, 60) });
      }
    });
    if (bad.length > QMARK_HEBREW_BUDGET) {
      console.error(`?[Hebrew] in Harrison+Exam rose to ${bad.length} (budget ${QMARK_HEBREW_BUDGET}). First 3:`, bad.slice(0, 3));
    }
    expect(bad.length).toBeLessThanOrEqual(QMARK_HEBREW_BUDGET);
  });

  it('no Hebrew question in Harrison/Exam has the ð mojibake character (already-strict reassertion)', () => {
    // Overlaps with regressionGuards.test.js global check, but kept here as
    // an anchor so this file fully owns the Harrison/Exam content-quality story.
    const bad = [];
    questions.forEach((q, i) => {
      if (!OTHER_TAGS.has(q.t)) return;
      const all = [q.q, ...(q.o || []), q.e || ''].join('|');
      if (all.includes('ð')) bad.push({ i, tag: q.t });
    });
    expect(bad).toEqual([]);
  });
});
