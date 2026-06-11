---
description: The legitimate path for adding questions to the Pnimit bank — Harrison-grounded generation → schema verify → blind audit → physician review. Never copy external/paywalled banks.
---

# /add-questions

This repo is **public**. Questions are added only through the Harrison-grounded generation pipeline below — never by copying paywalled or external question banks.

## Question schema (data/questions.json)

Each item: `{ q, o, c, t, e, ti, st }`

| Field | Type | Allowed | Notes |
|---|---|---|---|
| `q` | string | Hebrew (len ≥ 10) | Stem. |
| `o` | array | **exactly 4 strings** | Options. |
| `c` | int | 0..3 | Index of the correct option in `o`. |
| `t` | **string** | `2020`, `2021-Jun`, `2022-Jun`, `2023-Jun`, `2024-May`, `2024-Oct`, `2025-Jun`, or `Harrison` / `Exam` | Session/provenance. Never an integer. |
| `e` | string | Hebrew explanation | Must agree with `c`. |
| `ti` | int | 0..23 | Topic index into `TOPICS` (`src/core/constants.js`). Every `ti` needs ≥ 5 questions. |
| `st` | string | subtopic / provenance tag | Free-form subtopic; AI-generated batches carry a provenance tag (e.g. `AI-2026-hy`). |

Optional fields seen in the bank: `c_accept` (additional accepted answer indices/letters), `e_issue`, `img`, `imgDep`.

## The legit pipeline (in order)

1. **Generate (Harrison-grounded).** `node scripts/gen_highyield.mjs` — generates high-yield MCQs via the Toranot AI proxy, grounded in Harrison 22e, tagged with a provenance `st` (e.g. `AI-2026-hy`). Output goes to the high-yield bank (`data/highyield.json`), kept **separate** from `data/questions.json` so the cross-repo CI gate stays clean.
2. **Schema verify.** `node scripts/verify_questions.mjs` — checks the schema (4 options, `c` in range, `ti` valid, `t` is a string) and, where wired, judges key⟷explanation consistency. Fix every flagged item before proceeding.
3. **Blind Opus audit.** `node scripts/audit_keys_blind.mjs` — a blind model re-derives the answer from the stem without seeing the stored `c`, surfacing disagreements for human adjudication.
4. **Physician review.** A human physician reviews flagged items and adjudicates the final `c`. Stored `c` is never assumed correct; the physician's source-grounded call wins.

## Hard rules

- **Never copy external/paywalled question banks** into this public repo. Generation must be Harrison-grounded and original.
- **Run CI gates before opening a PR**: `npm run verify` (regen_manifest --check, sync-sw-version, innerHTML checks, harrison-hebrew baseline, vitest, build). Topic coverage must stay ≥ 5 per `ti`; question count stays > 800.
- **Quote the source, don't fabricate.** When writing an item or its explanation, ground it in the Harrison chapter; never invent option text or a citation.
- **Hebrew UTF-8 as-is**; follow `.claude/skills/hebrew-medical-glossary/SKILL.md`. Never transliterate.
- **Insert at the end** of the target array unless told otherwise — the quiz engine treats array index as the canonical question id.
