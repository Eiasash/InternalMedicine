# CLAUDE.md — Pnimit Mega: Israeli Internal Medicine Board Exam App

## Operating model — single lane (from 2026-05-19)

Development on this repo is done by Claude Code directly — design,
implementation, testing, and shipping all in one session. This **supersedes**
every "two-lane", "web-lane", or "terminal-lane" instruction in older docs and
skills (audit-fix-deploy and the per-repo skills included): there is no second
Claude lane, and no `claude/web-` vs `claude/term-` branch split.

Workflow: branch `claude/<slug>` -> PR -> CI green + Codex review -> Claude Code
self-merges -> post-merge `verify-deploy`. Codex is the independent automated
reviewer. Codex green + CI green is sufficient self-merge authority.
**"Codex green" is defined as:** review state ∈ {`APPROVED`, `COMMENTED`} AND no unresolved P0 or P1 inline comments at the moment of merge. P2 inline comments may self-merge with an in-thread reply explaining the decision. Auto-merge (`gh pr merge --auto`) is **disabled** — every self-merge requires explicitly reading the latest Codex review surface and CI status before merging. If Codex has not reviewed and the PR is substantive, wait or ping; do not deadline-out a missing reviewer on non-trivial changes.

 Eias sign-off is required only for: (a) PRs touching patient-data paths (ward-helper PHI crypto, IDB roster schema, rounds-data persistence — enumerated in ward-helper codeowners, queued as follow-up PR), and (b) per-PR gate docs that explicitly carry a "NO self-merge" clause (audit-8 R1.5 / R1.6 and subsequent R1.x gates). Claude Code never self-certifies its own audit — independence comes from cross-model review (Codex), not from human-vs-AI gates. All release,
version-trinity, and verification rules in the repo's skill still apply
unchanged.


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
- **Sibling apps**: Shlav A Mega (geriatrics) + Mishpacha Mega (family medicine) — all three share `shared/fsrs.js` (byte-identical, canonical LF md5 `71f9f2d4…`; was `cea66a0435…` pre-2026-04-22 LF normalization) and the same Supabase project `krmlzwwelqvlfslwltol` (labeled "Toranot" in the dashboard)
## Chaos doctor-bot v4 (2026-05-08)

`scripts/chaos-doctor-bot-v4.mjs` — sibling-port of FM's canonical v4 bot. IM-specific adaptations: navigates to `[data-action="go"][data-tab="quiz"]` first (IM lands on `lib` tab, not quiz), reads explanation from `.explain-box`. Pure helper at `scripts/lib/extractJson.mjs` (10 unit tests in `tests/chaosBotV4ExtractJson.test.js`).

- **Run**: `CLAUDE_API_KEY=$key CHAOS_USERS=10 CHAOS_DURATION_MS=21600000 CHAOS_HEADLESS=1 CHAOS_COST_CAP_USD=8 node scripts/chaos-doctor-bot-v4.mjs`
- **First overnight run** 2026-05-08: 91% appIdx capture rate, surfaced 59 distinct flagged IM questions where AI judge said the app's answer was wrong. Top hits include EBV-vs-CMV (Hairy Leukoplakia), ALI compression-stockings-vs-heparin data-entry error, NNT math contradictions. See `~/repos/FINDINGS_v4_2026-05-08.md`.

## Current version

- **Current version**: v10.4.57 - content(2020): re-add the real booklet Q51 (70F with pacemaker + MRSA bacteremia; answer א — early device+lead extraction + endocarditis-guideline abx; Harrison ref 930), lost when v10.4.56/#188 restored Q50 into the shared slot. Verbatim from exams/2020_questions.pdf + answer key. 2020 now 151, total 1557 (both Q50 + Q51 present); appended to canonical too (sweep 0 divergences). NOTE: answer key has 150 Qs, so 151 flags a possible residual spurious for a separate 2020 reconciliation.
- **Prior version trail**: v10.4.56 — content(2020): restore the missing colorectal-screening Q50 (answer ד) at idx 44 (IM #185). Prior: v10.4.55 — ui(a11y): Settings touch targets use a scoped 44px minimum. Prior: v10.4.52 — ui(study): classed Today Study Plan action rows, grid Study Plan row actions, and compact collapsed Study Plan tiers. Prior: v10.4.51 — ui(quiz-mobile): keep primary answer actions above the fixed bottom tab bar on phones. Prior: v10.4.49 — ui(ia): Study Today owns active workflows; Track is analytics-only; Share moved to Settings; visible Pomodoro / Sudden Death / On-call launch controls removed. Prior: v10.4.48 — fix(track): clarify the stats donut semantics so headline accuracy is current question-status accuracy (`correct / answered`) while historical attempt accuracy remains secondary, both computed from `G.S.sr`. Prior: v10.4.47 — feat(track): add a Hebrew `סטטיסטיקה` Track sub-tab with a progress donut for correct / wrong / unanswered questions and attempt accuracy computed from `G.S.sr`, wired through the existing sub-tab dispatcher without duplicating the heatmap or priority matrix. Prior: v10.4.46 — ui(theme): medexams-style retheme (teal/turquoise primary + warm-gold accent + medexams red; teal-tinted selected-answer/hover; softer 12px cards; the two pnimit-skin a11y overrides + skip-link moved to dark teal `#0a5d54`, still AAA; no layout/markup/content change; sibling of Geri v10.64.167 / FM). Prior: v10.4.45 — fix(account): sync the Anthropic API key to the account at save time (#353 sibling, Geri v10.64.160). The v10.4.44 `_apikey` backup removal also severed the only WRITE path into `app_users.api_key` (the sync trigger fed off backup writes) — keys saved/rotated after .44 stayed localStorage-only, so `auth_login_user` restored a stale/null key on the next device (Codex P2 on #167). Settings save/remove now save locally FIRST, then logged-in users sync via the existing `auth_set_api_key` RPC (re-auth via `window.prompt`, the `_handleChangePassword` pattern); cancel = device-only, RPC failure keeps the local save, guests unchanged. Pinned by `tests/apikeyAccountSync.test.js`. Prior: v10.4.44 — fix(security): stop cloud-syncing the Anthropic API key (removed `_apikey` from the `backup_set` payload; `backup_get/set` are SECURITY DEFINER with no identity check, so the synced key was username-guess-readable on the anon key — redundant since `auth_login_user` returns it on login; restore-read kept for back-compat). Sibling of Geri v10.64.158 / FM v1.26.1. Pinned by `tests/apikeyExposureGuard.test.js`. Prior: v10.4.43 — content(highyield): added a separate AI high-yield bank (data/highyield.json, 236 Qs, tag AI-2026-hy) loaded additively by data-loader.js and labeled "AI — High-Yield" in the quiz UI; questions.json UNCHANGED (1556) so count-lock + cross-repo manifest/syllabus contract untouched. Pipeline scripts: gen_highyield.mjs + verify_questions.mjs (0/310 key/expl conflicts) + audit_keys_blind.mjs (blind opus board audit, 74 flags held out). Prior: v10.4.42 — chore(a11y/docs): sibling-parity polish (2026-06-05 audit) — 5 `dir="rtl"`→`dir="auto"` (study_plan ×4, quiz-view loading ×1; pure-Hebrew so zero visual change, matches Geri/FM convention) + documented the EXAM_YEARS comment (bare `2020` = intentional source-data gap, not a stale TODO; `t` field legitimately carries `Harrison`+`Exam` curated tags outside EXAM_YEARS). 0 data/answer-key changes; 1556 unchanged. Prior: v10.4.41 — fix(data): repaired 4 intra-word spaced-Hebrew FRACTURES (a lone NON-prefix Hebrew letter wedged inside a word — a class the a/b rules missed) from source exam-booklet renders: idx334 `צ נתורים`→`צנתורים` (catheters, Q102/2022-Jun), idx442 `לאר ת ריטיס`→`לארתריטיס` (septic arthritis, Q66/2023-Jun), idx752 `א הי`→`היא` (trazodone, Q41/2025-Jun — multiset reorder), idx860 `בס י כוי`→`בסיכוי` (ARTESIA, Q149/2025-Jun). All pure-despace or Hebrew-multiset-preserved; 0 answer-key changes; 1556 unchanged. Extended `spacedHebrewGuard` with rule (c) lone-final-form-letter (sibling-parity with Geri/FM, zero-FP); ALLOWLIST stays EMPTY. Prior: v10.4.40 — fix(data): RECONSTRUCT all 14 quarantined `ו`/`ה`-ambiguous + scrambled spaced-Hebrew Qs (451/499/743/759/776/779/789/807/824/833/836/851/855/1544) from their source exam booklets (`exams/`) via the render-the-clean-visual-layer method (Geriatrics #316) — pages rendered @300–600 DPI, clean visual Hebrew read directly, stem + every option transcribed verbatim. Fixes went beyond the flagged span where the booklet dictated: `ו` word-final reorders (`ו איז`→`איזו`), `ה` suffix backward-glue (`מחלק ה`→`מחלקה`, `באיז ה`→`באיזה`), a displaced `ה` (`מ ה בין טיפולים`→`מבין הטיפולים`), BIDI punctuation regrouping (`(Death Rattle)`, `"רפליקטיבי"?`, `ע"י`), a parser-bleed (idx 851 o[3] section header `שאלות על מאמרים` removed), and a scramble (idx 1544 o[2] `י לי ע ת`→`עליית`). idx 836 keeps `חיוביות` as the booklet prints it (visual wins over grammar). Answer keys (c) UNCHANGED for all 14; Hebrew-letter multiset preserved except the 851 bleed; 1556 unchanged. `spacedHebrewGuard` ALLOWLIST now EMPTY — dataset fully clean of spaced-Hebrew. Prior: v10.4.39 — de-spaced 11 unambiguous `ב/ל/מ/כ` prefix splits + quarantined the 14 (Codex IM #157/#158 P2). Prior: v10.4.38 — repaired 3 spaced-Hebrew Qs (415/743/800) + added the guard (ported from Geriatrics v10.64.145).

---

## Architecture

### Modular ES Modules

The app is split into 32 ES module source files under `src/`. The HTML shell loads two scripts:
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
│   │   ├── more-view.js        # renderSearch, renderChat, AI chat
│   │   ├── heatmap.js          # topic-accuracy heatmap (SVG grid)
│   │   ├── wrong-review.js     # wrong-answer review queue
│   │   ├── source-link.js      # per-question Harrison source chip (TOPIC_REF)
│   │   └── settings-overlay.js # ⚙️ settings modal (API key, data mgmt, force-update)
│   └── styles/                 # 9 CSS files (base, layout, components, quiz, track, chat, theme, utilities, settings) + shared/tokens.css
│
├── shared/
│   └── fsrs.js                 # FSRS-4.5 algorithm (plain script, shared with Geriatrics)
│
├── scripts/
│   └── build.sh                # Production build: vite build + copy static assets + generate prod SW
│
├── data/                       # Runtime JSON data
│   ├── questions.json          # 1557 MCQs
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
├── tests/                      # 838 tests across 54 files
│   ├── dataIntegrity.test.js   # Question schema, duplicates, topic coverage
│   ├── appIntegrity.test.js    # Module structure, SW version sync, security
│   ├── appLogic.test.js        # Core quiz logic patterns
│   ├── appLogicExpanded.test.js # Extended logic coverage
│   ├── serviceWorker.test.js   # SW cache config, file existence
│   ├── coverageGaps.test.js    # Cross-module coverage verification
│   ├── sharedFsrs.test.js      # FSRS algorithm unit tests
│   ├── auditExpansion.test.js  # 24-topic + HARRISON_PDF_MAP + IMA-bias picker + 9.76 backup-restore (v10.4.2)
│   ├── postLoginRestore.test.js # auto-restore-on-login flow (v10.4.0)
│   ├── apiKeyLoginRestore.test.js # api-key cloud sync v10.4.14-17 (cloudBackup _apikey, startTimedQ G-binding, defensive toLowerCase, _handleLogin r.api_key)
│   └── (plus textbookChapters, parserBleedGuard, debugConsole, auth, studyPlanAlgorithm, regressionGuards, fsrsDeadline, …)
│
└── .github/workflows/
    ├── ci.yml                  # JSON validation, schema, tests, build (on push/PR)
    ├── integrity-guard.yml     # 6 gates: syntax, critical functions, module structure
    ├── weekly-audit.yml        # Weekly: full audit + security + docs drift
    ├── deploy.yml              # Build with Vite → deploy dist/ to GitHub Pages
    └── notify-auto-audit.yml   # repository_dispatch → Eiasash/auto-audit on merge (closes cron gap)
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
  "img": "https://...supabase.co/...",
  "st": "anemia_rbc",
  "c_accept": [1, 3],
  "e_issue": true,
  "imgDep": true
}
```
Optional fields: `st` (finer subtopic tag — display/analytics only, read by no code path), `c_accept` (array of extra accepted answer indices for IMA post-appeal multi-answer / voided questions; honored by `isOk()` in `utils.js`), `e_issue` (explanation flagged unreliable → shows a UI banner, clearable), `imgDep` (image-dependent question → warning banner).

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
npm test             # 838 tests via vitest
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
1. `npx vite build` → bundles 32 modules into one JS + one CSS (content-hashed)
2. Copies static assets (data/, harrison_chapters.json, shared/, exams/, articles/, harrison/, questions/, syllabus/)
3. Fixes manifest.json path (Vite hashes it, sed reverts)
4. Generates production SW (simplified: caches HTML + data JSON, stale-while-revalidate for hashed assets)

### Deployment
Push to `main` → `deploy.yml` runs: `npm ci` → `npm test` → `bash scripts/build.sh` → upload `dist/` → deploy to GitHub Pages.

### Release Invariants (run before declaring "shipped")
1. **Local trinity** — `APP_VERSION (3-part) + sw.js CACHE (3-part) + package.json version (APP_VERSION + ".0", 4-part)` all aligned. The `+.0` suffix on package.json is **deliberate convention**, enforced by `tests/regressionGuards.test.js` — do NOT "normalize" it. Local guard: `scripts/sync-sw-version.cjs` checks constants.js↔sw.js. The regression test enforces the package.json↔APP_VERSION pairing.
2. **Tests + build** — `npm run verify` (full pre-push gate).
3. **Live witness** — after Pages rebuilds (~60–90s), `bash scripts/verify-deploy.sh` does a two-step check: fetches `pnimit-mega.html`, extracts the hashed `assets/pnimit-mega-*.js` bundle path, greps the bundle for `"<APP_VERSION>"` literal AND verifies `sw.js` shows `CACHE='pnimit-v<APP_VERSION>'`. The script reads `APP_VERSION` directly from `src/core/constants.js` (NOT `package.json`, which has the `+.0` suffix). **Don't claim "deployed" until this passes.**
4. **Question content edits** — any change to `data/questions.json` `o[]` text, `c` index, or `e` explanation must quote the source (Harrison 22e / Goldman / GRS) in the chat or commit message before the edit lands. Never paraphrase or fabricate option text.

---

## Exam Data

| Session | Questions | Year Tag |
|---------|-----------|----------|
| 2020 | 151 | `2020` |
| June 2021 | 149 | `2021-Jun` |
| June 2022 | 148 | `2022-Jun` |
| June 2023 | 150 | `2023-Jun` |
| May 2024 | 99 | `2024-May` |
| October 2024 | 100 | `2024-Oct` |
| June 2025 | 151 | `2025-Jun` |
| Exam (misc) | 20 | `Exam` |
| Harrison (AI) | 589 | `Harrison` |
| **Total** | **1557** | |

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
| Source modules | 32 (under src/) |
| Source LOC | ~5,780 |
| Functions | ~180 |
| ES imports | 98 |
| Window bindings | 16 (API surface; down from 72) |
| Questions | 1,557 (all with explanations) |
| AI-generated | 589 (tagged `Harrison`) |
| Topics | 24 |
| Notes | 24 |
| Flashcards | 155 |
| Drugs | 53 |
| Question images | 162 (Supabase-hosted) |
| Past exams | 7 sessions (2020–2025) |
| Harrison chapters | ~69 PDFs |
| Articles | 10 |
| Test files | 54 |
| Tests | 838 |
| CI workflows | 5 (ci, integrity-guard, weekly-audit, deploy, notify-auto-audit) |

---

## CI Workflows

| Workflow | Trigger | Checks |
|----------|---------|--------|
| `ci.yml` | Push/PR to main | JSON validation, question schema, SW version sync, topic coverage, no geriatrics content, innerHTML audit, tests, Vite build |
| `integrity-guard.yml` | Push/PR to main | JS syntax (all 32 modules), critical functions, required files, function count regression, truncated code patterns, SW file refs |
| `weekly-audit.yml` | Sunday 06:00 UTC | Full data audit + security (eval, innerHTML) + version drift + tests + build |
| `deploy.yml` | Push to main | Install → test → build → deploy dist/ to GitHub Pages |
| `notify-auto-audit.yml` | Push to main | Fires `repository_dispatch` (event `watched-repo-merge`) to `Eiasash/auto-audit` so its probe runs seconds-after-merge instead of waiting on the 30-min cron; no-op if `AUTO_AUDIT_DISPATCH_PAT` is unset |

---

## Branch Policy

- `main` — production, deployed via GitHub Actions
- Feature branches: `claude/<description>` or `refactor/<description>`
- All PRs target `main`
