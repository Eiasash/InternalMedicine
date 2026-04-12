---
name: pnimit-mega-dev
description: >
  Complete development skill for Pnimit Mega (שלב א מגה — פנימית), an Israeli internal medicine
  board exam PWA. ALWAYS use this skill when: modifying Pnimit Mega code, fixing bugs, adding
  features, parsing new exam PDFs, adding questions/flashcards/notes, pushing to GitHub, or
  anything related to the InternalMedicine repo. Also trigger on: "pnimit", "internal medicine
  board", "פנימית מגה", "P0064-2025", references to eiasash.github.io/InternalMedicine,
  "parse exam", "add questions", "pnimit bug", or any mention of the InternalMedicine repo.
  Contains repo structure, data formats, deployment pipeline, exam parsing patterns, and
  content creation conventions. Always read this before touching any Pnimit code.
---

# Pnimit Mega — Development Skill

## Identity

- **App**: Pnimit Mega (שלב א מגה — רפואה פנימית)
- **URL**: https://eiasash.github.io/InternalMedicine/
- **Repo**: github.com/Eiasash/InternalMedicine
- **Version**: v1.3
- **Stack**: Single-file HTML PWA, vanilla JS, GitHub Pages
- **Syllabus**: P0064-2025 (NOT P005-2026 which is geriatrics)
- **Sibling app**: Shlav A Mega (geriatrics) at Eiasash/Geriatrics — same engine, separate data

## GitHub Access

Fetch PAT via: `GET https://toranot.netlify.app/api/github-pat` with header `x-api-secret: shlav-a-mega-2026`
Never ask Eias to paste a PAT.

## Repo Structure

```
InternalMedicine/
├── index.html                  # Redirect to pnimit-mega.html
├── pnimit-mega.html            # THE APP — single file, ~250KB, all JS/CSS inline
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker (cache: pnimit-v1.3)
├── README.md
├── data/
│   ├── questions.json          # 863 MCQs with explanations
│   ├── flashcards.json         # 33 flashcards
│   ├── notes.json              # 8 study notes
│   ├── topics.json             # 24 topic keyword arrays (for auto-tagging)
│   └── tabs.json               # 9 tab definitions
├── articles/                   # 10 required NEJM/Lancet PDFs
│   ├── 01_digitoxin_hfref.pdf
│   ├── 02_cfdna_crc_screening.pdf
│   ├── ...
│   └── 10_ecst2_carotid.pdf
├── exams/                      # 7 raw past exams (questions, answers, images, refs)
│   ├── 2020_questions.pdf
│   ├── 2020_answers.pdf
│   ├── 2020_images.pdf
│   ├── 2021_jun_questions.pdf
│   ├── ... (same pattern for Jun22, Jun23, May24, Oct24, Jun25)
├── harrison/                   # 69 Harrison's 22e chapter PDFs
├── harrison_chapters.json      # Harrison's 22e in-app reader data (~3.8MB)
├── questions/
│   ├── image_map.json          # Maps img keys to filenames
│   └── images/                 # 128 extracted exam images (JPEG, ~10MB total)
└── syllabus/
    └── P0064-2025.pdf
```

## Key Differences from Geriatrics (Shlav A Mega)

| Aspect | Geriatrics | Pnimit |
|--------|-----------|--------|
| Syllabus | P005-2026 | P0064-2025 |
| Textbooks | Hazzard's 8e + Harrison's 22e | Harrison's 22e only |
| Laws/regulations | 15 Israeli laws | None |
| Drugs tab (Beers/ACB) | Yes | No (removed) |
| Articles tab | 6 geriatric articles | 10 NEJM/Lancet articles |
| localStorage key | `samega` | `pnimit_mega` |
| IndexedDB name | `shlav_mega_db` | `pnimit_mega_db` |
| Sudden death LB key | `sd_lb` | `pnimit_sd_lb` |
| Custom questions key | `samega_custom_qs` | `pnimit_custom_qs` |
| Library default tab | `haz-pdf` | `harrison` |
| Topics count | 40 (geriatric syndromes) | 24 (IM subspecialties) |

## Data Formats

### questions.json
```json
[
  {
    "q": "שאלה בעברית...",
    "o": ["א. אפשרות", "ב. אפשרות", "ג. אפשרות", "ד. אפשרות"],
    "c": 2,           // 0-based correct answer index
    "t": "Jun23",     // exam year tag
    "e": "הסבר בעברית...",  // AI-generated explanation
    "img": "questions/images/img_Jun23_5.jpg",  // optional image path
    "ti": 12          // auto-assigned topic index (0-23)
  }
]
```

**Exam year tags**: `2020`, `Jun21`, `Jun22`, `Jun23`, `May24`, `Oct24`, `Jun25`

### flashcards.json
```json
[{"f": "Front text (question/prompt)", "b": "Back text (answer/explanation)"}]
```

### notes.json
```json
[{"id": 0, "topic": "Topic Name", "ch": "Source reference", "notes": "Full note text with ▸ headers"}]
```

### topics.json
24 arrays of keyword strings for auto-tagging questions to topics:
```
0: Cardiology — Coronary
1: Heart Failure
2: Arrhythmias & ECG
3: Valvular & Endocarditis
4: Hypertension
5: Pulmonology & VTE
6: Gastroenterology & Hepatology
7: Nephrology
8: Electrolytes & Acid-Base
9: Endocrinology & Diabetes
10: Hematology & Coagulation
11: Oncology & Screening
12: Infectious Disease
13: Rheumatology & Autoimmune
14: Neurology & Stroke
15: Critical Care & Shock
16: Dermatology
17: Allergy & Immunology
18: Fluids & Volume
19: Pain & Palliative
20: Perioperative
21: Toxicology
22: Clinical Approach & Diagnostics
23: Vascular Disease
```

## Required Articles (P0064-2025)

| # | Article | File |
|---|---------|------|
| 1 | Digitoxin in HFrEF (DIGIT-HF) | 01_digitoxin_hfref.pdf |
| 2 | cfDNA Blood Test for CRC Screening (ECLIPSE) | 02_cfdna_crc_screening.pdf |
| 3 | BSI 7 vs 14 Days (BALANCE) | 03_bsi_7vs14_days.pdf |
| 4 | Aspirin + OAC in Chronic Coronary Syndrome | 04_aspirin_ccs_oac.pdf |
| 5 | Baxdrostat for Resistant HTN | 05_baxdrostat_htn.pdf |
| 6 | Apixaban Extended VTE Treatment | 06_apixaban_vte.pdf |
| 7 | Upadacitinib for GCA (SELECT-GCA) | 07_upadacitinib_gca.pdf |
| 8 | Sarcoidosis Prednisone vs MTX (FIRE) | 08_sarcoidosis_pred_mtx.pdf |
| 9 | Sotatercept for PAH (STELLAR) | 09_sotatercept_pah.pdf |
| 10 | ECST-2 Carotid Stenosis | 10_ecst2_carotid.pdf |

## Exam Parsing Pipeline

### Answer key extraction
Answer PDFs come in two formats:
1. **Table format** (2020): `number + Hebrew letter + page ref` — use regex `(\d+)([אבגד])(?:[,]([אבגד]))?`
2. **List format** (2021+): `מספר שאלה תשובה נכונה` — use regex `(\d+)\s*([אבגד])\b`

Hebrew letter → index: `{'א': 0, 'ב': 1, 'ג': 2, 'ד': 3}`

### Question extraction
Questions are segmented by standalone number lines:
1. Find lines matching `^\.?(\d{1,3})\.?\s*$` (standalone question numbers)
2. Collect text between consecutive question numbers
3. Split each segment into question text + options using `([אבגד])\.\s+` pattern
4. Match options to answer key by question number
5. Detect image references via `תמונה\s*(\d+)` pattern

### Image extraction
Use PyMuPDF (fitz) to rasterize image PDF pages at 200 DPI, compress to JPEG quality 75, resize if >1200px wide.

### Known parsing issues
- Some option ד text can bleed into next question boundary — trim at `\d{1,3}\.\s+` patterns
- 2020 exam has different formatting than 2021+ exams
- Lab values in question text (e.g., "pH 7.22") can create false question-number matches
- Some questions reference images by number but the image PDF labels don't always match

## AI Explanation Generation

Uses proxy at `https://toranot.netlify.app/api/claude` with header `x-api-secret: shlav-a-mega-2026`.
Model: `sonnet`. Max tokens: 250-300.
Prompt pattern: `"הסבר 2 משפטים למה {correct_letter} נכון: {question_text} {options}"`

## Deployment

1. Make changes to files
2. `git add -A && git commit -m "message"`
3. Fetch PAT: `curl -s -H "x-api-secret: shlav-a-mega-2026" https://toranot.netlify.app/api/github-pat`
4. `git remote set-url origin "https://x-access-token:${PAT}@github.com/Eiasash/InternalMedicine.git"`
5. `git push origin main`
6. GitHub Pages auto-deploys (usually <2 min)

### Version bumping
Update in TWO places:
- `pnimit-mega.html`: `v1.3</span>` in header
- `sw.js`: `const CACHE='pnimit-v1.3'`

## Content Statistics (v1.3)

| Content | Count |
|---------|-------|
| MCQ questions | 863 |
| Explanations | 863/863 (100%) |
| Questions with images | 73 |
| Exam images | 128 |
| Flashcards | 33 |
| Study notes | 8 |
| Article PDFs | 10 |
| Harrison chapter PDFs | 69 |
| Past exams (raw) | 7 |
| Topics | 24 |

## Excluded Harrison's Chapters (P0064-2025)

Parts entirely excluded: 2 §4, 13 §4, 15, 17, 19.
Specific chapters excluded per the syllabus table — see README.md for full list.

## Common Tasks

### Adding new exam questions
1. Get question PDF + answer key PDF + image PDF
2. Parse answer key first (see pipeline above)
3. Parse questions with segment-based approach
4. Extract images with fitz at 200 DPI → JPEG
5. Update `data/questions.json`, `questions/image_map.json`
6. Generate explanations via proxy
7. Bump version, push

### Adding flashcards
Append to `data/flashcards.json`: `{"f": "front", "b": "back"}`

### Adding study notes
Append to `data/notes.json`: `{"id": N, "topic": "name", "ch": "source", "notes": "content with ▸ headers"}`
