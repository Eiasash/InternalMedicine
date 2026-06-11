---
name: question-schema
description: Authoritative schema reference for data/questions.json, data/notes.json, data/drugs.json, and data/flashcards.json in Pnimit Mega (InternalMedicine). Claude must load this whenever editing any of those files. Contains exact field names, allowed values, the 24-topic map (P0064-2025), and the version trinity. Complements the /add-questions command.
---

# Data Schema — Pnimit Mega (InternalMedicine)

When editing `data/questions.json`, `data/notes.json`, `data/drugs.json`, or `data/flashcards.json`, follow this schema exactly. Field names are compact — do not invent verbose aliases. CI (`.github/workflows/ci.yml`) validates these shapes; the version trinity is enforced by `tests/regressionGuards.test.js`.

## questions.json — array of objects (~1556 items)

| Field | Type | Allowed | Notes |
|---|---|---|---|
| `q` | string | Hebrew, len ≥ 10 | Question stem. Preserve literal line breaks. |
| `o` | array | **exactly 4 strings** | MCQ options in Hebrew. No markdown. |
| `c` | integer | 0..3 | Index into `o` of the correct answer. Must satisfy `0 ≤ c < len(o)`. |
| `t` | **string** | `2020`, `2021-Jun`, `2022-Jun`, `2023-Jun`, `2024-May`, `2024-Oct`, `2025-Jun`, `Harrison`, `Exam` | Session/provenance. NEVER an integer. The seven dated values are the IMA sessions used for the year filter-pills (`EXAM_YEARS`); `Harrison` and `Exam` are valid non-dated tags by design. |
| `e` | string | Hebrew explanation | Must agree with `c`. |
| `ti` | integer | 0..23 | Topic index per the 24-topic map below. Every `ti` needs ≥ 5 questions (CI gate). |
| `st` | string | subtopic / provenance | Free-form subtopic label (e.g. `acs_complications`, `aki_etiology`); AI-generated batches carry a provenance tag (e.g. `AI-2026-hy`). |

**Optional fields seen in the bank** (do not add unless the item needs them): `c_accept` (array of additionally-accepted answer indices/letters), `e_issue`, `img`, `imgDep` (image-dependent items: ECG, imaging, peripheral smear).

**Not on the question:** there is NO `id`, `source`, `year` (numeric), `correct`, `options`, `topic`, or `text` field. Reference questions by **array index** (`idx <N>`, 0-based) — the quiz engine treats array position as the canonical question id.

## notes.json — array of objects

| Field | Type | Notes |
|---|---|---|
| `topic` | string | Human-readable subspecialty name; maps to one of the 24 `TOPICS`. CI requires it non-empty. |
| `notes` | string | Dense board-pearl prose. CI requires it non-empty. |

(Items may carry additional fields; CI validates only that `topic` and `notes` are present and non-empty. Preserve whatever shape an existing item already has.)

## drugs.json — array of objects

| Field | Type | Allowed | Notes |
|---|---|---|---|
| `name` | string | INN (generic), English | Required. |
| `heb` | string | Hebrew brand/transliteration | Required. |
| `acb` | integer | 0..3 | Anticholinergic Burden. Required. |
| `beers` | boolean | true/false | Beers-criteria flag. Required. |
| `cat` | string | short category label | Required. |
| `risk` | string | one-line risk summary | Required. |

CI fails if any of the six keys is missing on any drug.

## flashcards.json — array of objects

| Field | Type | Notes |
|---|---|---|
| `f` | string | Front (prompt). CI requires non-empty. |
| `b` | string | Back (answer). CI requires non-empty. |

## 24-topic map (ti → subspecialty, P0064-2025)

Source of truth is `TOPICS` in `src/core/constants.js`. The 24 display names, in index order:

```
 0 Cardiology — Coronary          12 Infectious Disease
 1 Heart Failure                  13 Rheumatology & Autoimmune
 2 Arrhythmias & ECG              14 Neurology & Stroke
 3 Valvular & Endocarditis        15 Critical Care & Shock
 4 Hypertension                   16 Dermatology
 5 Pulmonology & VTE              17 Allergy & Immunology
 6 Gastroenterology & Hepatology  18 Fluids & Volume
 7 Nephrology                     19 Pain & Palliative
 8 Electrolytes & Acid-Base       20 Perioperative
 9 Endocrinology & Diabetes       21 Toxicology
10 Hematology & Coagulation       22 Clinical Approach & Diagnostics
11 Oncology & Screening           23 Vascular Disease
```

`TOPICS`, `EXAM_FREQ`, and `IMA_WEIGHTS` are all length-24 (the P0064-2025 contract, asserted by `tests/auditExpansion.test.js`). `IMA_WEIGHTS` sums to 141 by design (some topics, e.g. ECG, are dual-counted) — do NOT normalize it to 100.

## Version trinity (move all three together)

| File | Field | Format |
|---|---|---|
| `package.json` | `"version"` | `X.Y.Z.0` (4-part) |
| `src/core/constants.js` | `APP_VERSION` | `X.Y.Z` (3-part) |
| `sw.js` | `CACHE` | `pnimit-v<X.Y.Z>` |

`node scripts/sync-sw-version.cjs` keeps them aligned (runs inside `npm run verify`); `tests/regressionGuards.test.js` enforces the lockstep.

## Rules when editing

1. **Never change field names.** CI hashes/validates specific keys.
2. **Preserve ordering in `questions.json`.** Insert at the end unless explicitly asked to reorder — array index is the canonical question id.
3. **`t` is a string.** `"t": 2020` (integer) breaks the year filter.
4. **`c` must be 0..3** and index a real option. `"c": 4` with 4 options = no correct answer.
5. **Exactly 4 options in `o`.** Not 3, not 5. Ever (CI enforces).
6. **`ti` in 0..23**, and each `ti` must keep ≥ 5 questions (topic-coverage gate).
7. **Hebrew RTL.** Preserve original whitespace and punctuation; don't blindly Unicode-normalize.
8. **No external/paywalled banks.** New questions come from the Harrison-grounded pipeline (`/add-questions`): `gen_highyield.mjs` → `verify_questions.mjs` → `audit_keys_blind.mjs` → physician review.

## Duplicate detection

CI fails on a *conflicting* duplicate: two items with the same first-80-char `q`, identical `o`, but a different `c`. Before adding a question, grep a ~30-char unique substring of your stem to avoid collisions.
