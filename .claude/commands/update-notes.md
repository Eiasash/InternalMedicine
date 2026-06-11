---
description: Update or add study notes in data/notes.json from Harrison's 22e, mapped to the 24 Pnimit subspecialty topics.
---

# /update-notes

Update or add study notes in `data/notes.json` for the Israeli Internal Medicine board (P0064-2025). Primary source: **Harrison's 22e**.

## Steps

1. Read `data/notes.json` and identify which topic to update (the `topic` field maps to one of the 24 subspecialties in `TOPICS`, `src/core/constants.js`).
2. Verify the content against the relevant Harrison 22e chapter (`HARRISON_PDF_MAP` in `constants.js` lists in-repo chapters). Don't write from memory where a source can be checked.
3. Format: dense, board-pearl style — key facts, numbers/thresholds, mechanism, classic distractors, exam traps.
4. Preserve the item's field shape: at minimum `topic` + `notes`, both non-empty (CI validates this in `ci.yml`). Do not rename or add verbose field aliases.
5. Cite the Harrison 22e chapter (or the specific guideline) for facts you add.
6. Hebrew content stays UTF-8 as written; follow `.claude/skills/hebrew-medical-glossary/SKILL.md`. Never transliterate.
7. Keep notes internal-medicine-scoped — no geriatrics-only content (CI bans a set of geriatrics terms in `src/`).

After editing, run `npm run verify`. If you cannot ground a fact in Harrison 22e or a cited guideline, flag it rather than writing it.
