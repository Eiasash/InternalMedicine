/**
 * Intra-word spaced-Hebrew guard (ported from Geriatrics v10.64.145).
 *
 * Catches the PDF/BIDI extraction artifact where a Hebrew word is split by spurious
 * spaces into isolated single letters — e.g. "ת ו פע ו ת" (should be "תופעות"),
 * "מ י ימת" (should be "מיימת"). A standalone single Hebrew letter is essentially
 * never correct (the 1-letter words ו/ה/ב/ל/מ/ש/כ are always prefixes glued to the
 * next token), so >=2 consecutive single-Hebrew-letter tokens reliably flags corruption.
 *
 * 2026-06-01 scan found 6 affected questions. 3 were repaired by a surgical PURE
 * de-spacing pass (only spaces removed, zero character changes):
 *   idx 415  "ציטוגנטי ו ת" → "ציטוגנטיות"
 *   idx 743  "מ י ימת"      → "מיימת"
 *   idx 800  "ת ו פע ו ת"   → "תופעות" + "ל טיפול" → "לטיפול"
 *
 * The remaining 3 are ENTANGLED (involve a character change, not pure spacing) and are
 * QUARANTINED here pending reconstruction from the source exam PDFs (InternalMedicine/
 * exams/) — the same render-the-clean-visual-layer method used for Geriatrics PR #316,
 * which requires a verbatim source read + sign-off (no guessing):
 *   idx 807  'ע י'→ should be the abbreviation 'ע"י' (space→gershayim, a char change)
 *   idx 824  'מ ה בין' → 'מבין' (a spurious/displaced 'ה' to drop)
 *   idx 1544 'י לי ע ת' → scrambled letters before "נוגדנים"; intended word unclear from context
 *
 * RATCHET: any NEW spaced-Hebrew occurrence (outside the allowlist) fails. When the 3
 * quarantined cases are reconstructed from source, remove them from ALLOWLIST in that PR.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const QZ = JSON.parse(readFileSync(resolve(ROOT, 'data/questions.json'), 'utf-8'));

// Entangled (char-change) cases awaiting source-PDF reconstruction (see header).
const ALLOWLIST = new Set([807, 824, 1544]);

const isHeb = (ch) => /[֐-׿]/.test(ch);
function hasSpacedHebrew(s) {
  const t = String(s).split(/\s+/);
  for (let k = 0; k < t.length - 1; k++) {
    if (t[k].length === 1 && isHeb(t[k]) && t[k + 1].length === 1 && isHeb(t[k + 1])) return true;
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
