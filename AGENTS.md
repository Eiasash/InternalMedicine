# AGENTS.md — Pnimit Mega (Internal Medicine, שלב א)

Israeli internal-medicine board-exam study PWA. Live: https://eiasash.github.io/InternalMedicine/
Stack: Vite + ES modules (vanilla JS). Entry: `pnimit-mega.html` → `src/ui/app.js`. Hebrew RTL. Sibling of FamilyMedicine (mirror its patterns).

## Setup & commands
```bash
npm ci
npm run dev        # local dev
npm test           # vitest (838 tests)
npm run build      # bash scripts/build.sh → dist/
npm run verify     # full pre-push gate (sync-sw-version, tests, build). MUST pass before any PR.
```
Node ≥ 18. Windows/git-bash: `encoding='utf-8'` for Python; no `VAR=x cmd` npm prefix.

## HARD RULES (do not violate)
1. **Branch `codex/<slug>` → PR. NEVER push to `main`** (Pages deploys `main`).
2. **Version sync — bump together:** `package.json` "version" is **4-part** (`X.Y.Z.0`); `sw.js` `CACHE='pnimit-v<X.Y.Z>'`; `APP_VERSION` in `src/core/constants.js` is 3-part (`X.Y.Z`). The 3-part values must match; CI `regressionGuards.test.js` enforces.
3. **Question/answer edits:** quote the source (Harrison 22e primary) before the edit — never fabricate/paraphrase option text. **NEVER import medexams or any paywalled bank — PUBLIC repo = unlawful republication.**
4. **Hebrew RTL:** UTF-8 as-is, never transliterate; `dir="auto"` + `unicode-bidi:plaintext`.
5. **Shared files** `shared/fsrs.js` + `harrison_chapters.json` are byte-identical across the 3 medical PWAs — don't diverge.

## Data & state
- `data/questions.json` (1,556 Qs) schema: `{q, o[], c, t, e, ti, st}`. Topics: `TOPICS[24]` in `src/core/constants.js`; `q.ti` = topic index.
- State: `G.S` (IndexedDB `pnimit_mega_db`, localStorage fallback `pnimit_mega`). `G.S.sr[qIdx]` = FSRS `{tot, ok, ef, fsrsS, fsrsD, ...}` keyed by question array index (shared `shared/fsrs.js`).
- Views: `G.tab` switch in `src/ui/app.js`; Track view `src/ui/track-view.js` has a sub-tab bar (`progress/plan/exam/more`) + heatmap + priority matrix.

## Adding questions (only legit path)
`scripts/gen_highyield.mjs` (Toranot proxy, grounded in Harrison + guidelines, tag `AI-2026-hy`) → untracked output → `verify_questions.mjs` + blind audit (Opus) → physician review before merge. NEVER copy external/paywalled questions.

## Good first tasks
Mobile-RTL UI fixes (overflow/contrast-AA/tap-targets/dark mode); add a new Track sub-tab `{id:'stats', l:'סטטיסטיקה'}` whose body is a correct/wrong/unanswered progress **donut** + accuracy %, computed from `G.S.sr` (wire into the existing track-subtab dispatcher + `initTrackEvents()`). Do NOT duplicate the heatmap/priority-matrix. Report each change.
