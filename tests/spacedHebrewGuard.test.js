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
 * ה are NOT auto-glued: they are AMBIGUOUS. ו can be word-final ("ו איז" is the split of
 * "איזו" — moving the ו forward gives the non-word "ואיז"), and ה can be a SUFFIX of the
 * PRECEDING word ("מחלק ה פנימית"→"מחלקה פנימית", "באיז ה סוג"→"באיזה סוג", "נמוכ ה"→"נמוכה").
 * Gluing those forward creates malformed Hebrew — Codex IM #158 P2 caught three such cases.
 * So any question containing a ו/ה split (or scrambled letters / a gershayim artifact) is
 * QUARANTINED for reconstruction from the source exam PDFs (InternalMedicine/exams/) via the
 * render-the-clean-visual-layer method (Geriatrics PR #316), requiring a verbatim source
 * read + sign-off (no guessing). 14 quarantined — see ALLOWLIST below.
 *
 * RATCHET: any NEW spaced-Hebrew (outside the allowlist) fails. When a quarantined case is
 * reconstructed from source, remove its idx from ALLOWLIST in that PR.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const QZ = JSON.parse(readFileSync(resolve(ROOT, 'data/questions.json'), 'utf-8'));

// Ambiguous (ו word-final / ה suffix) + scrambled cases awaiting source-PDF reconstruction (see header).
const ALLOWLIST = new Set([451, 499, 743, 759, 776, 779, 789, 807, 824, 833, 836, 851, 855, 1544]);

const isHeb = (ch) => /[֐-׿]/.test(ch);
const PFX = new Set('ובהלמכש'); // 1-letter Hebrew prefixes — always glued to the next token
function hasSpacedHebrew(s) {
  const t = String(s).split(/\s+/);
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
