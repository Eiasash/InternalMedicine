---
description: Check recently-touched Hebrew strings for medical-terminology consistency
---

Pnimit does not yet ship a `hebrew-medical-glossary` skill (the Geriatrics one is geriatrics-scoped). This command does a best-effort eyeball review until a Pnimit-specific glossary skill exists.

1. `git diff origin/main...HEAD -- '*.html' '*.json' '*.ts' '*.js'` — filter lines containing Hebrew (regex `[\u0590-\u05FF]`).
2. If a `hebrew-medical-glossary` skill is available in this session, load it. Otherwise apply the heuristics below.
3. For each candidate string, classify: **Canonical** (matches glossary or standard Israeli MoH/Clalit/Maccabi terminology), **Variant** (non-canonical but recognized), **Unknown** (flag for review), **Deviant** (wrong term — block).

### Heuristics when no glossary is loaded
- Drug names: prefer generic (in Hebrew transliteration where common, e.g. אספירין) over Israeli trade name in stems and answer text. Trade names may appear in `data/drugs.json` `heb` field — that's correct.
- Disease names: prefer the standard Israeli clinical Hebrew (e.g. אוטם שריר הלב for MI, אי ספיקת לב for HF, יתר לחץ דם for HTN). Flag transliterations like הארט פיילר.
- Lab tests: keep English abbreviations if Hebrew has no widely-used form (CRP, BUN, eGFR). Flag awkward Hebrew lab transliterations.
- Mixed code-switching mid-sentence is OK if it matches the existing corpus style; sudden style breaks are not.

4. Report: counts by class, plus a numbered list of **Deviant** and **Unknown** strings with `file:line`.
5. Do NOT auto-rewrite. The point is a reviewer's second opinion, not a silent fix.

To upgrade: drop a `hebrew-medical-glossary-pnimit` skill into `.claude/skills/` and this command will pick it up automatically.
