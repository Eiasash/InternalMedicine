/**
 * Intra-word spaced-Hebrew guard (ported from Geriatrics v10.64.145).
 *
 * Catches the PDF/BIDI extraction artifact where a Hebrew word is split by spurious
 * spaces — either into isolated single letters ("ת ו פע ו ת" → "תופעות") or by a single
 * prefix letter cleaved from its word ("ב טיפול" → "בטיפול"). A standalone single Hebrew
 * letter is essentially never correct: the 1-letter prefixes ו/ה/ב/ל/מ/ש/כ are always
 * glued to the next token. The detector flags EITHER pattern (Codex IM #157 P2 added the
 * single-prefix rule — the ≥2-consecutive rule alone missed split prefixes).
 *
 * 2026-06-01: 14 questions repaired by surgical PURE de-spacing (only spaces removed,
 * zero character changes, zero answer-key changes):
 *   v10.4.38 — idx 415/743/800 (≥2-consecutive splits)
 *   v10.4.39 — idx 84/205/398/413/517/714/723/761/834/860/861 (single ב/ל/מ/כ prefix splits)
 *
 * Only ב/ל/מ/כ are auto-glued — those standalone letters are unambiguously prefixes. ו and
 * ה are AMBIGUOUS. ו can be word-final ("ו איז" is the split of "איזו" — moving the ו forward
 * gives the non-word "ואיז"), and ה can be a SUFFIX of the PRECEDING word ("מחלק ה פנימית"→
 * "מחלקה פנימית", "באיז ה סוג"→"באיזה סוג", "נמוכ ה"→"נמוכה"). Gluing those forward creates
 * malformed Hebrew — Codex IM #158 P2 caught three such cases. So 14 ו/ה-split + scrambled +
 * gershayim-artifact questions were QUARANTINED rather than mechanically de-spaced.
 *
 * v10.4.40 (2026-06-01) — all 14 quarantined questions RECONSTRUCTED from their source exam
 * booklets (InternalMedicine/exams/) via the render-the-clean-visual-layer method (Geriatrics
 * PR #316): each page rendered @300–600 DPI, the clean visual Hebrew read directly, and the
 * stem + every option transcribed verbatim from the source. Fixes went beyond the flagged
 * span where the booklet dictated — ו word-final reorders (איזו), ה suffix/displacement,
 * BIDI punctuation regrouping ((Death Rattle), "רפליקטיבי"?, ע"י), a parser-bleed (idx 851
 * o[3] "Prednisone שאלות על מאמרים"→"Prednisone"), and a scramble (idx 1544 o[2] "י לי ע ת"→
 * "עליית"). Answer keys (c) UNCHANGED for all 14; Hebrew-letter multiset preserved everywhere
 * except the 851 bleed. ALLOWLIST is now EMPTY — the dataset is fully clean of spaced-Hebrew.
 *
 * RATCHET: any spaced-Hebrew now fails (allowlist empty). If a future ingest reintroduces the
 * artifact, repair from source (render-the-visual) before merge — do not re-grow the allowlist
 * for anything mechanically fixable.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const QZ = JSON.parse(readFileSync(resolve(ROOT, 'data/questions.json'), 'utf-8'));

// EMPTY — all 14 ambiguous/scrambled cases reconstructed from source @ v10.4.40 (see header).
const ALLOWLIST = new Set([]);

const isHeb = (ch) => /[֐-׿]/.test(ch);
const PFX = new Set('ובהלמכש'); // 1-letter Hebrew prefixes — always glued to the next token
const FINAL = /[ךםןףץ]/;       // word-final-form letters — impossible except at word-end
function hasSpacedHebrew(s) {
  const t = String(s).split(/\s+/);
  // (c) a lone word-final-form letter (ךםןףץ) — always a fractured word-final letter (zero FP:
  //     a final form can never be a standalone label or prefix). Sibling-parity with the
  //     Geriatrics/FamilyMedicine guards; added v10.4.41.
  for (const tok of t) if (tok.length === 1 && FINAL.test(tok)) return true;
  for (let k = 0; k < t.length - 1; k++) {
    const a = t[k], b = t[k + 1];
    // (a) >=2 consecutive single-Hebrew-letter tokens — e.g. "ת ו פע ו ת"
    if (a.length === 1 && isHeb(a) && b.length === 1 && isHeb(b)) return true;
    // (b) a single prefix letter cleaved from its (Hebrew) word — e.g. "ב טיפול" (Codex #157 P2)
    if (a.length === 1 && PFX.has(a) && b.length > 0 && isHeb(b[0])) return true;
  }
  return false;
}
function fields(q) {
  const out = [q.q || ''];
  for (const o of q.o || []) out.push(String(o));
  return out;
}

describe('intra-word spaced-Hebrew guard', () => {
  const offenders = [];
  QZ.forEach((q, i) => {
    if (fields(q).some(hasSpacedHebrew)) offenders.push(i);
  });

  it('no NEW spaced-Hebrew corruption (offenders ⊆ quarantine allowlist)', () => {
    const unexpected = offenders.filter((i) => !ALLOWLIST.has(i));
    expect(
      unexpected,
      `New spaced-Hebrew corruption at idx ${unexpected.join(', ')}. ` +
        'A Hebrew word was split by spurious spaces (e.g. "ת ו פע ו ת"→"תופעות"). ' +
        'Repair the spacing (pure de-space); only allowlist if the damage is entangled (char change) and needs source reconstruction.'
    ).toEqual([]);
  });

  it('allowlist does not rot — every allowlisted idx still has the artifact', () => {
    const stale = [...ALLOWLIST].filter((i) => !offenders.includes(i));
    expect(stale, `Allowlisted idx ${stale.join(', ')} no longer have spaced-Hebrew — remove them from ALLOWLIST.`).toEqual([]);
  });
});
