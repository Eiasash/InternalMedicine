/**
 * Intra-word fracture repair ratchet (v10.4.41).
 *
 * 4 fractures — a lone NON-prefix Hebrew letter wedged inside a word — repaired from the
 * source exam-booklet VISUAL renders (fitz). The spacedHebrewGuard a/b/c rules do NOT catch
 * this shape (not 2-consecutive, not a prefix, not a final-form), so these pins guard the
 * fixes against regression. Each is pure-despace or Hebrew-multiset-preserved; 0 answer-key
 * changes. Sibling of Geriatrics' fractureRepair.test.js.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const QZ = JSON.parse(readFileSync(resolve(ROOT, 'data/questions.json'), 'utf-8'));

// [idx, field ('q' | option-index), [must-contain], [must-be-absent (old fracture)]]
const PINS = [
  [334, 0, ['צנתורים'], ['צ נתורים']],       // catheters — Q102/2022-Jun
  [442, 'q', ['לארתריטיס'], ['לאר ת ריטיס']], // septic arthritis — Q66/2023-Jun
  [752, 2, ['היא'], ['א הי']],                // trazodone "is" — Q41/2025-Jun (reorder)
  [860, 2, ['בסיכוי'], ['בס י כוי']],          // ARTESIA chance — Q149/2025-Jun
];

const fieldText = (q, f) => (f === 'q' ? String(q.q || '') : String((q.o || [])[f] ?? ''));

describe('intra-word fracture repair ratchet (IM)', () => {
  PINS.forEach(([idx, f, has, absent]) => {
    it(`idx ${idx} field ${f}: fracture repaired`, () => {
      const s = fieldText(QZ[idx], f);
      for (const w of has) expect(s, `expected "${w}" in idx ${idx} field ${f}`).toContain(w);
      for (const w of absent) expect(s, `old fracture "${w}" should be gone in idx ${idx}`).not.toContain(w);
    });
  });

  it('count unchanged (1556) — fixes were pure-despace/multiset, no add/drop', () => {
    expect(QZ.length).toBe(1556);
  });
});
