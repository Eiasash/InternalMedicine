# CLAUDE.md — Pnimit Mega: Israeli Internal Medicine Board Exam App

## Project Overview

**Pnimit Mega** is a Progressive Web App (PWA) for Israeli internal medicine board exam preparation (שלב א פנימית, P0064-2025). It is a single-file, no-build-step application deployed via GitHub Pages.

- **Live URL**: https://eiasash.github.io/InternalMedicine/
- **Main file**: `pnimit-mega.html` (~253 KB, ~4,157 lines, self-contained HTML/CSS/JS)
- **App version**: v9.36
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
├── pnimit-mega.html         # Main app (THE file — all HTML/CSS/JS, v9.36)
├── index.html               # GitHub Pages redirect → pnimit-mega.html
├── sw.js                    # Service worker (offline caching, cache: pnimit-v9.36)
├── manifest.json            # PWA manifest
│
├── data/                    # Lazy-loaded JSON data — single source of truth
│   ├── questions.json       # 1169 MCQs (primary runtime source)
│   ├── notes.json           # 24 study topic notes
│   ├── flashcards.json      # 155 flashcards
│   ├── drugs.json           # 53 drugs with ACB scores, Beers flags, STOPP interactions
│   ├── tabs.json            # 5 tab definitions (consolidated from 10)
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
│   ├── 2021_jun_*.pdf, 2022_jun_*.pdf, 2023_jun_*.pdf
│   ├── 2024_may_*.pdf, 2024_oct_*.pdf
│   └── 2025_jun_*.pdf
│
├── articles/                # 10 required NEJM/Lancet articles (2024–2025)
├── harrison/                # Harrison's 22e chapter PDFs (~69 chapters)
├── syllabus/
│   └── P0064-2025.pdf       # Official IMA syllabus
└── README.md
```

---

## Data Schemas

### questions.json
```json
{
  "q": "Question text (Hebrew)",
  "o": ["Option A", "Option B", "Option C", "Option D"],
  "c": 2,
  "t": "Jun23",
  "ti": 5,
  "e": "AI-generated explanation (Hebrew)"
}
```

### notes.json
```json
{ "id": 0, "topic": "Cardiology", "ch": "Harrison's Ch X", "notes": "Study notes text" }
```

### flashcards.json
```json
{ "f": "Front (question/prompt)", "b": "Back (answer)" }
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
# Open http://localhost:3737/pnimit-mega.html
```

### Service Worker Versioning
- `APP_VERSION` in `pnimit-mega.html` must match the cache version in `sw.js`
- Currently: app=`9.36`, sw.js cache key=`pnimit-v9.36` (synced)

---

## Testing

**240 tests across 5 files** — CI via GitHub Actions (10 checks).

| File | Tests | Description |
|------|-------|-------------|
| `tests/dataIntegrity.test.js` | ~80 | Question schema, duplicates, topic coverage, notes, flashcards, drugs |
| `tests/appIntegrity.test.js` | ~15 | HTML structure, SW version sync, security checks |
| `tests/serviceWorker.test.js` | ~12 | SW cache config, URL lists, file existence |
| `tests/examData.test.js` | ~40 | Past exam validation, image map integrity |
| `tests/aiQuestions.test.js` | ~39 | AI-generated question quality, explanation length |

### Auto-expand rule
Every feature or bug fix MUST include new or updated tests.

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
| Harrison (AI) | 306 | `Harrison` |
| **Total** | **1169** | |

All 1169 questions have AI-generated explanations (`e` field).

---

## Key Conventions

### Content Integrity
- Textbook: Harrison's Principles of Internal Medicine, 22nd Edition
- Syllabus: P0064-2025 (NOT P005-2026 which is geriatrics)
- Question `ti` must be an integer 0–23

### Code Style
- Vanilla JavaScript ES6+ — no transpilation, no framework
- CamelCase for functions, UPPERCASE for constants
- CSS custom properties: `--sky`, `--em`, `--sl8`, `--red`, `--amb`

### Localization
- Hebrew (RTL) and English; Fonts: Inter + Heebo via Google Fonts

### Accessibility / Mobile
- Touch targets >= 44px; dark + study mode support
- Mobile-first responsive design (max-width: 640px container)

---

## Modifying the Main App (pnimit-mega.html)

- Single monolith — do not split
- CSS at top, JS before `</body>`
- Data loads lazily from `data/*.json` — never inline large data

---

## Deployment

Push to `main` → GitHub Pages updates in ~60 seconds. No manual steps.

---

## Codebase Metrics

| Metric | Value |
|--------|-------|
| Main app LOC | ~4,157 |
| Questions | 1169 (all with explanations) |
| AI-generated | 306 (tagged `Harrison`) |
| Topics | 24 |
| Notes | 24 |
| Flashcards | 155 |
| Drugs | 53 |
| Question images | 128 |
| Past exams | 7 sessions (2020–2025) |
| Harrison chapters | ~69 PDFs |
| Articles | 10 |
| Test files | 5 |
| Tests | 186 |

---

## Test Coverage Recommendations

### Current Coverage Summary

| Area | Status | Tests |
|------|--------|-------|
| Question schema & duplicates | Strong | ~80 |
| HTML structure & PWA | Good | ~15 |
| Exam data & images | Good | ~40 |
| AI question quality | Good | ~39 |
| Service worker config | Good | ~12 |

### Recommended Additions (Priority Order)

1. ~~FSRS spaced repetition logic~~ — **DONE** (ported in v9.32). Next: expand FSRS test coverage
2. **Quiz engine unit tests** — answer selection, scoring, exam modes
3. **Sanitization function** — `sanitize(s)` HTML entity escaping + XSS payloads
4. **ACB/STOPP calculator tests** — `calcACBTotal`, `getSTOPPWarnings` with known drug combos
5. **Chronic fail / exam trap detection** — `isChronicFail`, `isExamTrap` with mock study records
6. **Topic distribution balance** — each of 24 topics >= 5 questions, no single topic > 15%
7. **Harrison chapter JSON** — validate structure, chapter numbering, non-empty content
8. **Explanation completeness** — all 1169 `e` fields non-empty, >= 50 chars, no raw HTML
9. **Image map bidirectional integrity** — every image referenced and exists
10. **Service worker fetch strategy** — network-first for HTML, cache-first for JSON

### Long-Term Goal
Reach **300+ tests** with FSRS, quiz engine, calculators, and all pure functions tested.

---

## TODO / Improvement Roadmap

### High Priority
- [ ] **Add FSRS test coverage** — critical engine untested here (Geriatrics has 91 tests)
- [ ] **Expand test suite to 250+** — See Test Coverage Recommendations
- [ ] **Add test:coverage thresholds** — 50% lines, 40% branches

### Medium Priority
- [ ] **Add `.claude/` directory** — port slash commands from Geriatrics
- [ ] **Harrison AI question expansion** — continue from 306 AI-generated
- [ ] **Drug interaction tests** — STOPP/START logic exists; add comprehensive tests
- [ ] **Add explanations_cache.json** — pre-generate and cache all explanations

### Low Priority
- [ ] **Supabase cloud sync** — optional progress backup
- [ ] **Push notifications** — daily review reminders
- [ ] **PWA install prompt** — beforeinstallprompt handler

### Content Roadmap
- [ ] **Next exam session** — parse and add when available
- [ ] **Flashcard expansion** — target 200+ (currently 155)
- [ ] **Question image coverage** — add figures for more questions

---

## Branch Policy

- `main` — production, auto-deployed to GitHub Pages
- Feature branches: `claude/<description>-<id>` convention
- All PRs target `main`
