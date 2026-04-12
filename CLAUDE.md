# CLAUDE.md — Pnimit Mega: Israeli Internal Medicine Board Exam App

## Project Overview

**Pnimit Mega** is a Progressive Web App (PWA) for Israeli internal medicine board exam preparation (שלב א פנימית, P0064-2025). It is a single-file, no-build-step application deployed via GitHub Pages.

- **Live URL**: https://eiasash.github.io/InternalMedicine/
- **Main file**: `pnimit-mega.html` (~253 KB, ~4,100 lines, self-contained HTML/CSS/JS)
- **App version**: v9.17
- **Data**: JSON files in `data/` directory, loaded lazily at runtime
- **Deployment**: Push to `main` → GitHub Pages live
- **Sibling app**: Shlav A Mega (geriatrics) at Eiasash/Geriatrics — same engine, separate data

---

## Architecture

### Single-File PWA

All application logic lives in `pnimit-mega.html` — no bundler, no framework, no build step. The file contains:
- All CSS (responsive, RTL-aware, dark/light/study modes)
- All JavaScript (ES6+, vanilla)
- HTML structure

Data is loaded at runtime from `data/*.json` files. The service worker (`sw.js`) caches all assets for offline use.

### Storage Layers

| Layer | Keys / Table | Purpose |
|-------|-------------|---------|
| `localStorage` | App state, API key | User preferences, exam state |
| `IndexedDB` | (internal) | Study progress, spaced repetition state |

---

## File Map

```
/
├── pnimit-mega.html        # Main app (THE file — all HTML/CSS/JS, v9.17)
├── index.html               # GitHub Pages redirect → pnimit-mega.html
├── sw.js                    # Service worker (offline caching, cache: pnimit-v1.3)
├── manifest.json            # PWA manifest
│
├── data/                    # Lazy-loaded JSON data — single source of truth
│   ├── questions.json       # 863 MCQs (primary runtime source)
│   ├── notes.json           # 8 study topic notes
│   ├── flashcards.json      # 33 flashcards
│   ├── drugs.json            # 53 drugs with ACB scores, Beers flags, STOPP interactions
│   ├── tabs.json            # 9 tab definitions for app navigation
│   └── topics.json          # 24 topic keyword mappings for auto-tagging
│
├── questions/               # Question images for exams with figures
│   ├── image_map.json       # Maps question IDs to image files
│   └── images/              # 128 PNG images referenced by exam questions
│
├── harrison_chapters.json   # Harrison's 22e textbook content (structured JSON, 3.9 MB)
│
├── skill/
│   └── SKILL.md             # Development skill package for Claude Projects
│
├── exams/                   # Past exam PDFs (2020–2025, 7 exam sessions)
│   ├── 2020_questions.pdf, 2020_answers.pdf, 2020_images.pdf
│   ├── 2021_jun_*.pdf
│   ├── 2022_jun_*.pdf
│   ├── 2023_jun_*.pdf
│   ├── 2024_may_*.pdf
│   ├── 2024_oct_*.pdf
│   └── 2025_jun_*.pdf
│
├── articles/                # 10 required NEJM/Lancet articles (2024–2025)
│
├── harrison/                # Harrison's 22e chapter PDFs (~69 chapters)
│
├── syllabus/
│   └── P0064-2025.pdf       # Official IMA syllabus
│
└── README.md
```

### Data Architecture

All runtime data lives in `data/`. The app and service worker load exclusively from `data/*.json`. There are no root-level JSON duplicates — `data/` is the single source of truth.

---

## Data Schemas

### questions.json
```json
{
  "q": "Question text (Hebrew)",
  "o": ["Option A", "Option B", "Option C", "Option D"],
  "c": 2,       // correct answer index (0–3, integer)
  "t": "Jun23",  // exam year/session string
  "ti": 5,      // topic index (0–23, see TOPICS below)
  "e": "..."    // AI-generated explanation (Hebrew)
}
```

### notes.json
```json
{
  "id": 0,
  "topic": "Cardiology",
  "ch": "Harrison's Ch X",
  "notes": "Study notes text"
}
```

### flashcards.json
```json
{
  "f": "Front (question/prompt)",
  "b": "Back (answer)"
}
```

---

## Topic Index (ti field — 0 to 23)

```
0=Cardiology (CAD/ACS)     1=Heart Failure          2=Arrhythmias           3=Valvular Disease
4=Hypertension             5=Pulmonology            6=Gastroenterology      7=Nephrology
8=Electrolytes/Acid-Base   9=Endocrinology          10=Hematology           11=Oncology
12=Infectious Disease      13=Rheumatology          14=Neurology            15=Critical Care/ICU
16=Dermatology             17=Allergy/Immunology    18=Fluids/Volume        19=Pain/Palliative
20=Perioperative           21=Toxicology            22=Clinical Approach    23=Vascular
```

---

## Development Workflow

### Local Dev Server
```bash
python -m http.server 3737
# Then open http://localhost:3737/pnimit-mega.html
```
No build step needed. Edit and refresh.

### Making Changes
1. Edit `pnimit-mega.html` for app logic, UI, or features
2. Edit JSON files in `data/` for content changes
3. Run local server to test
4. Commit and push to `main` — Pages deploys

### Service Worker Versioning
- `APP_VERSION` in `pnimit-mega.html` must match the cache version in `sw.js`
- Currently: app=`9.14`, sw.js cache key=`pnimit-v9.17` (synced)
- Update both when making changes to ensure users get cache-busted

---

## Testing

**Status: NO TESTS EXIST** — this is the highest-priority gap.

### Recommended test setup (model after Geriatrics sibling)

```bash
npm init -y
npm install -D vitest
# Add "test": "vitest run" to package.json scripts
```

### Minimum test suite to create

| File | Tests Needed | Description |
|------|-------------|-------------|
| `tests/dataIntegrity.test.js` | ~25 | Question schema, duplicates, topic coverage, notes, flashcards, topics cross-referential integrity |
| `tests/appIntegrity.test.js` | ~10 | HTML structure (RTL, viewport, PWA), SW version sync, security checks (eval, innerHTML), manifest |
| `tests/serviceWorker.test.js` | ~10 | SW cache config, URL lists, file existence |

### Data validation tests (must cover)

| Check | Threshold |
|-------|-----------|
| JSON parse validity | questions, notes, flashcards, topics, tabs |
| Question count | Must be > 800 |
| Question schema | `q` (string), `o` (array >= 2), `c` (valid index), `ti` (int 0–23) |
| All 863 questions have explanations | `e` field present |
| Notes schema | `topic` and `notes` fields present |
| Flashcards schema | `f` and `b` fields present |
| Duplicate detection | First 80 chars of question text (conflicting answers flagged) |
| Topic coverage | >= 5 questions per topic (all 24 topics) |
| Image map integrity | All referenced images exist in `questions/images/` |
| HTML syntax | Valid HTML doctype, RTL direction, viewport meta |
| Service worker version sync | APP_VERSION matches sw.js CACHE version |
| innerHTML sanitization | Audit for unsanitized innerHTML usage |

### Auto-expand rule
Every feature, improvement, or bug fix MUST include new or updated tests:
- New data file or field → schema validation test
- Bug fix → regression test that reproduces the bug before the fix
- New app feature → integrity test for the feature's HTML/JS structure
- After adding tests, update the test count in this section

### CI Pipeline (to create)
Model after Geriatrics `.github/workflows/ci.yml` — should run on push to `main` and all PRs:
1. JSON parse validity for all data files
2. Question schema validation
3. Duplicate detection (conflicting answers = fatal, same answers = warning)
4. Topic coverage check
5. HTML syntax validation
6. SW version sync check
7. Vitest test suite

---

## Exam Data

| Session | Questions | Year Tag |
|---------|-----------|----------|
| 2020 | 87 | `2020` |
| June 2021 | 148 | `Jun21` |
| June 2022 | 147 | `Jun22` |
| June 2023 | 136 | `Jun23` |
| May 2024 | 98 | `May24` |
| October 2024 | 98 | `Oct24` |
| June 2025 | 149 | `Jun25` |
| **Total** | **863** | |

All 863 questions have AI-generated explanations (`e` field).

---

## Key Conventions

### Content Integrity
- Textbook: Harrison's Principles of Internal Medicine, 22nd Edition
- Syllabus: P0064-2025 (NOT P005-2026 which is geriatrics)
- Question `ti` must be an integer 0–23 from the topic list above
- `c` (correct answer index) must be 0-based and valid (< length of `o` array)

### Code Style
- Vanilla JavaScript ES6+ — no transpilation, no framework
- Functional style with module-like structure
- CamelCase for functions, UPPERCASE for constants
- CSS custom properties: `--sky`, `--em`, `--sl8`, `--red`, `--amb`

### Localization
- App supports Hebrew (RTL) and English
- Hebrew text uses `dir="rtl"` and `unicode-bidi: plaintext` CSS
- Fonts: Inter (English), Heebo (Hebrew) via Google Fonts
- Do not break RTL layout when adding new UI elements

### Accessibility / Mobile
- Touch targets must be >= 44px
- Dark mode and study mode must both be tested for new UI
- Mobile-first responsive design (max-width: 640px container)

---

## Adding New Questions — Checklist

1. Read `data/questions.json` to understand existing format
2. Check topic index from the TOPICS list above — pick the most specific `ti` (0–23)
3. Validate: exactly 4 options, `c` index in 0–3, valid `t` year string
4. Fuzzy-check for near-duplicates (first 80 chars)
5. Append to the JSON array (do not sort or reorder existing entries)
6. Run tests (when available) to validate schema and detect duplicates

---

## Modifying the Main App (pnimit-mega.html)

- The file is intentionally a single monolith — do not split it
- CSS is at the top, JS is at the bottom before `</body>`
- All localStorage operations must use established keys
- Data loads lazily from `data/*.json` — do not inline large data back into HTML
- `data/` is the single source of truth for all JSON data

---

## Deployment

```bash
git add <files>
git commit -m "descriptive message"
git push origin main
```

GitHub Pages updates within ~60 seconds.

**No manual deployment steps needed.**

---

## Codebase Metrics

| Metric | Value |
|--------|-------|
| Main app LOC | ~4,100 |
| Questions | 863 (all with explanations) |
| Topics | 24 |
| Notes | 19 |
| Flashcards | 68 |
| Question images | 128 |
| Past exams | 7 sessions (2020–2025) |
| Harrison chapters | ~69 PDFs |
| Articles | 10 |
| Test files | 0 (gap) |
| Tests | 0 (gap) |
| CI pipeline | None (gap) |

---

## Known Issues

- ~~APP_VERSION / SW cache mismatch~~ — FIXED: Both synced at v9.17
- **No tests**: Highest-priority gap — see Testing section for recommended setup
- **No CI pipeline**: No GitHub Actions workflow — see Testing section
- **No package.json**: Needed for test runner (vitest)
- **Topic auto-tagging**: All questions currently have `ti` field but topic distribution is unknown until tests validate

---

## Branch Policy

- `main` — production branch, auto-deployed to GitHub Pages
- Feature branches: `claude/<description>-<id>` convention
- All PRs target `main`
