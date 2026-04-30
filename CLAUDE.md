# CLAUDE.md — Pnimit Mega: Israeli Internal Medicine Board Exam App

<!-- working-rules-v1:start -->
## Working Rules (user-mandated, non-negotiable)

These four rules are the floor. They override any conflicting guidance later in this file. If a rule conflicts with what you're about to do, stop and surface it before proceeding.

1. **Don't assume. Don't hide confusion. Surface tradeoffs.**
2. **Minimum code that solves the problem. Nothing speculative.**
3. **Touch only what you must. Clean up only your own mess.**
4. **Define success criteria. Loop until verified.**
<!-- working-rules-v1:end -->

## Project Overview

**Pnimit Mega** is a Progressive Web App (PWA) for Israeli internal medicine board exam preparation (שלב א פנימית, P0064-2025). It uses a modular ES module architecture with Vite tooling, deployed via GitHub Actions to GitHub Pages.

- **Live URL**: https://eiasash.github.io/InternalMedicine/
- **App version**: see `APP_VERSION` in `src/core/constants.js` (source of truth)
- **Entry point**: `pnimit-mega.html` (155-line HTML shell) → `src/ui/app.js` (ES module)
- **Deployment**: Push to `main` → GitHub Actions builds with Vite → deploys `dist/` to Pages
- **Sibling apps**: Shlav A Mega (geriatrics) + Mishpacha Mega (family medicine) — all three share `shared/fsrs.js` (byte-identical, canonical md5 `cea66a0435…`) and the same Supabase project `krmlzwwelqvlfslwltol` (labeled "Toranot" in the dashboard)
- **Current version**: v9.86.0 (as of 28/04/26) — in-app Study Plan generator, username/password accounts, built-in debug console, callAI singleton AbortController fix

---

## Architecture

### Modular ES Modules

The app is split into 26 ES module source files under `src/`. The HTML shell loads two scripts:
```html
<script src="shared/fsrs.js"></script>              <!-- plain script, shared with Geriatrics -->
<script type="module" src="src/ui/app.js"></script>  <!-- ES module entry, imports everything -->
```

`app.js` imports all other modules, wires up `G.render` / `G.renderTabs`, initializes delegated event handlers for all 5 content views, and runs the boot sequence (IDB migration → render).

### Shared Mutable State (globals.js)

All cross-module mutable state lives on a single exported object `G` in `src/core/globals.js`. Modules import `G` and access state as `G.S`, `G.QZ`, `G.pool`, `G.qi`, etc. Constants and functions use proper `import`/`export`.

### FSRS Bridge

`shared/fsrs.js` is a plain `<script>` (not a module) shared with the Geriatrics repo. `src/sr/fsrs-bridge.js` re-exports its globals (`fsrsR`, `fsrsUpdate`, etc.) as ES module imports.

### Event Delegation Pattern

All 5 content views use delegated event handling via `data-action` / `data-*` attributes. Each view exports an `initXxxEvents(container)` function called once on `#ct` during boot. Handlers survive innerHTML changes.

```
data-action="pick" data-i="3"           → quiz answer selection
data-action="open-chapter" data-ch="42" → Harrison chapter nav
data-action="fc-rate" data-r="2"        → flashcard SRS rating
```

### Remaining Window Bindings (16)

Functions still on `window` due to circular import constraints or HTML shell usage:

| Reason | Bindings |
|--------|----------|
| Core nav (inline onclick in render/renderTabs) | `go`, `render` |
| Track-view delegation (circular: app↔track) | `setTopicFilt`, `openHarrisonChapter`, `showLeaderboard`, `cloudBackup`, `cloudRestore`, `sendChatStarter`, `exportProgress`, `importProgress` |
| Quiz-view delegation (circular: app↔quiz) | `shareQ` |
| HTML shell onclick (pnimit-mega.html header) | `toggleDark`, `toggleStudyMode`, `showHelp` |
| Dynamic UI (created via JS, not delegation-friendly) | `applyUpdate`, `shareApp` |

**Also on window (internal state, not API surface):**
- `window.G` — global state object, accessed by inline handler strings in `render()`
- `window.APP_VERSION` — exposed for the built-in debug console
- `window._idbSaveTimer` / `window._lsWarnShown` — internal flags in `state.js`
- `window.save` — IDB save (legacy alias, `G.save()` is preferred)
- `window.__pnimitLastMockWrong` — last mock-exam wrong indices (replay support)
- `window.__authBound` / `window.__studyPlanBound` — idempotency guards for one-time event bindings
- `window.__debug` — built-in debug console API (5-tap top-right activation, see `src/debug/console.js`)

### Storage Layers

| Layer | Key / Store | Purpose |
|-------|-------------|---------|
| `localStorage` | `pnimit_mega` | User state (progress, settings, SRS data) |
| `IndexedDB` | `pnimit_mega_db` | Primary state store (migrated from localStorage) |
| Supabase | `pnimit_backups`, `pnimit_leaderboard`, `pnimit_feedback` | Cloud backup, leaderboard, feedback |

---

## File Map

```
/
├── pnimit-mega.html            # HTML shell (155 lines — loads CSS + 2 scripts)
├── index.html                  # GitHub Pages redirect → pnimit-mega.html
├── sw.js                       # Dev service worker (caches individual modules)
├── manifest.json               # PWA manifest
├── vite.config.js              # Vite: base /InternalMedicine/, vitest config
├── package.json                # Scripts: dev, build, test, lint, format, verify, hooks:install
│
├── src/
│   ├── clock.js                # Tiny shared clock helper
│   ├── core/
│   │   ├── globals.js          # Shared mutable state object G (exported default)
│   │   ├── constants.js        # APP_VERSION, TOPICS, EXAM_FREQ, LS, SUPA_*, AI_*
│   │   ├── utils.js            # sanitize, fmtT, safeJSONParse, getApiKey, getOptShuffle
│   │   ├── state.js            # S object, save, IDB migration, updateStreak
│   │   ├── data-loader.js      # Fetches data/*.json → populates G.QZ, G.NOTES, etc.
│   │   ├── sw-update.js        # SW registration, update banner, applyUpdate (mirrors Geriatrics/src/sw-update.js)
│   │   └── tagMigration.js     # Legacy tag/topic migration helpers
│   ├── debug/
│   │   └── console.js          # Built-in debug console (5-tap top-right activation; window.__debug API)
│   ├── sr/
│   │   ├── fsrs-bridge.js      # Re-exports shared/fsrs.js globals as ES imports
│   │   └── spaced-repetition.js # srScore, getDue, buildRescuePool, trackDailyActivity
│   ├── quiz/
│   │   ├── engine.js           # buildPool, pick/check/next, mock exam, on-call mode
│   │   └── modes.js            # Pomodoro, sudden death, blind recall, speech, NBS
│   ├── ai/
│   │   ├── client.js           # callAI (proxy-first + API key fallback, singleton AbortController)
│   │   └── explain.js          # explainWithAI, aiAutopsy, gradeTeachBack
│   ├── services/
│   │   └── supabaseAuth.js     # Supabase auth client wrapper
│   ├── features/
│   │   ├── auth.js             # Username/password account UI + handlers
│   │   ├── cloud.js            # Leaderboard, backup/restore, feedback, diagnostics
│   │   └── study_plan/
│   │       ├── algorithm.js    # Study-plan generator algorithm
│   │       ├── index.js        # Study-plan UI + event bindings
│   │       └── syllabus_data.json
│   ├── ui/
│   │   ├── app.js              # Entry point: imports all, render(), renderTabs(), boot
│   │   ├── quiz-view.js        # renderQuiz, SD mode, timed mode, image upload
│   │   ├── learn-view.js       # renderStudy, renderFlash, renderDrugs, fcRate
│   │   ├── library-view.js     # renderLibrary, Harrison reader, AI chapter tools
│   │   ├── track-view.js       # renderTrack, renderCalc, study plan, analytics
│   │   └── more-view.js        # renderSearch, renderChat, AI chat
│   └── styles/                 # 8 CSS files (base, layout, components, quiz, track, chat, theme, utilities)
│
├── shared/
│   └── fsrs.js                 # FSRS-4.5 algorithm (plain script, shared with Geriatrics)
│
├── scripts/
│   └── build.sh                # Production build: vite build + copy static assets + generate prod SW
│
├── data/                       # Runtime JSON data
│   ├── questions.json          # 1556 MCQs
│   ├── topics.json             # 24 topic definitions
│   ├── notes.json              # 24 study notes
│   ├── drugs.json              # 53 drugs (Beers, ACB, STOPP)
│   ├── flashcards.json         # 155 flashcards
│   ├── distractors.json        # Per-question distractor pool (~2.6 MB)
│   └── tabs.json               # 5 tab definitions
│
├── harrison_chapters.json      # Harrison's 22e in-app reader (3.8 MB)
├── exams/                      # Past exam PDFs (2020–2025, 7 sessions)
├── articles/                   # 10 required NEJM/Lancet articles
├── harrison/                   # Harrison's 22e chapter PDFs (~69)
├── questions/images/            # 134 question images
├── syllabus/P0064-2025.pdf     # Official IMA syllabus
│
├── tests/                      # 597 tests across 28 files
│   ├── dataIntegrity.test.js   # Question schema, duplicates, topic coverage
│   ├── appIntegrity.test.js    # Module structure, SW version sync, security
│   ├── appLogic.test.js        # Core quiz logic patterns
│   ├── appLogicExpanded.test.js # Extended logic coverage
│   ├── serviceWorker.test.js   # SW cache config, file existence
│   ├── coverageGaps.test.js    # Cross-module coverage verification
│   ├── sharedFsrs.test.js      # FSRS algorithm unit tests
│   └── (plus textbookChapters, parserBleedGuard, debugConsole, auth, studyPlanAlgorithm, regressionGuards, fsrsDeadline, …)
│
└── .github/workflows/
    ├── ci.yml                  # JSON validation, schema, tests, build (on push/PR)
    ├── integrity-guard.yml     # 6 gates: syntax, critical functions, module structure
    ├── weekly-audit.yml        # Weekly: full audit + security + docs drift
    ├── distractor-autopsy.yml  # Distractor-pool integrity scan
    └── deploy.yml              # Build with Vite → deploy dist/ to GitHub Pages
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
  "e": "AI-generated explanation (Hebrew)",
  "img": "https://...supabase.co/..." 
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

### Local Dev
```bash
npm run dev          # Vite dev server (port 3737, auto-reload)
npm test             # 597 tests via vitest
npm run build        # Production build → dist/ (Vite bundle + static assets)
npm run build:vite   # Vite-only build (no asset copy)
npm run lint         # ESLint
npm run format       # Prettier
npm run verify       # Full pre-push gate: SW sync + innerHTML guards + Hebrew baseline + tests + build
npm run hooks:install # One-time: install pre-commit + pre-push git hooks
```

### Version Sync
`APP_VERSION` in `src/core/constants.js` must match the `CACHE` key in `sw.js`. CI enforces this.

### Production Build
`scripts/build.sh` runs:
1. `npx vite build` → bundles 26 modules into one JS + one CSS (content-hashed)
2. Copies static assets (data/, harrison_chapters.json, shared/, exams/, articles/, harrison/, questions/, syllabus/)
3. Fixes manifest.json path (Vite hashes it, sed reverts)
4. Generates production SW (simplified: caches HTML + data JSON, stale-while-revalidate for hashed assets)

### Deployment
Push to `main` → `deploy.yml` runs: `npm ci` → `npm test` → `bash scripts/build.sh` → upload `dist/` → deploy to GitHub Pages.

---

## Exam Data

| Session | Questions | Year Tag |
|---------|-----------|----------|
| 2020 | 139 | `2020` |
| June 2021 | 149 | `2021-Jun` |
| June 2022 | 148 | `2022-Jun` |
| June 2023 | 147 | `2023-Jun` |
| May 2024 | 99 | `2024-May` |
| October 2024 | 99 | `2024-Oct` |
| June 2025 | 151 | `2025-Jun` |
| Exam (misc) | 20 | `Exam` |
| Harrison (AI) | 589 | `Harrison` |
| **Total** | **1556** | |

---

## Key Conventions

### Preferred Patterns (for future work)
- **Event delegation** via `data-action` attributes — do NOT add new inline `onclick=` handlers
- **Module imports** for cross-file dependencies — do NOT add new `window.fn` bindings
- **`G.xxx`** for shared mutable state — do NOT use bare globals in module scope
- **`export function`** for any function called outside its file
- **`initXxxEvents(container)`** for view-specific delegated listeners (set up once in boot)

### Patterns to Avoid
- Inline `onclick=`, `onchange=`, `oninput=` in HTML template strings
- Bare global variable names (always use `G.xxx` or proper imports)
- Circular imports between UI views and app.js (use `window.fn()` as escape hatch)
- Adding `window.fn =` bindings without checking if delegation can handle it
- Modifying `shared/fsrs.js` (shared with Geriatrics — coordinate changes)

### Content Integrity
- Textbook: Harrison's Principles of Internal Medicine, 22nd Edition
- Syllabus: P0064-2025 (NOT P005-2026 which is geriatrics)
- Question `ti` must be an integer 0–23
- Flashcard schema: `f`/`b` (not `q`/`a`), no `ti` field

### Code Style
- ES module syntax (`import`/`export`) throughout `src/`
- CamelCase for functions, UPPERCASE for constants
- CSS custom properties: `--sky`, `--em`, `--sl8`, `--red`, `--amb`
- Hebrew RTL + English; Fonts: Inter + Heebo via Google Fonts

---

## Codebase Metrics

| Metric | Value |
|--------|-------|
| Source modules | 26 (under src/) |
| Source LOC | ~5,780 |
| Functions | ~180 |
| ES imports | 98 |
| Window bindings | 16 (API surface; down from 72) |
| Questions | 1,556 (all with explanations) |
| AI-generated | 589 (tagged `Harrison`) |
| Topics | 24 |
| Notes | 24 |
| Flashcards | 155 |
| Drugs | 53 |
| Question images | 116 linked, 134 on disk |
| Past exams | 7 sessions (2020–2025) |
| Harrison chapters | ~69 PDFs |
| Articles | 10 |
| Test files | 28 |
| Tests | 597 |
| CI workflows | 5 (ci, integrity-guard, weekly-audit, distractor-autopsy, deploy) |

---

## CI Workflows

| Workflow | Trigger | Checks |
|----------|---------|--------|
| `ci.yml` | Push/PR to main | JSON validation, question schema, SW version sync, topic coverage, no geriatrics content, innerHTML audit, tests, Vite build |
| `integrity-guard.yml` | Push/PR to main | JS syntax (all 26 modules), critical functions, required files, function count regression, truncated code patterns, SW file refs |
| `weekly-audit.yml` | Sunday 06:00 UTC | Full data audit + security (eval, innerHTML) + version drift + tests + build |
| `distractor-autopsy.yml` | Push/PR touching distractors | Distractor-pool integrity (mirrors Geriatrics v10.34 parser-bleed audit) |
| `deploy.yml` | Push to main | Install → test → build → deploy dist/ to GitHub Pages |

---

## Branch Policy

- `main` — production, deployed via GitHub Actions
- Feature branches: `claude/<description>` or `refactor/<description>`
- All PRs target `main`
