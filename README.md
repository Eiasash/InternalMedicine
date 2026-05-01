# Internal Medicine Board Prep — Shlav A

*Pnimit Mega — sibling of [Geriatrics Board Prep](https://github.com/Eiasash/Geriatrics) and [Family Medicine Board Prep](https://github.com/Eiasash/FamilyMedicine).* 🏥

Israeli Internal Medicine (רפואה פנימית) Stage A Board Exam preparation PWA.

**Syllabus:** P0064-2025 (IMA Scientific Council)
**Live:** https://eiasash.github.io/InternalMedicine/

## Architecture

Modular ES module PWA with Vite build tooling.

- **Entry point:** `pnimit-mega.html` (HTML shell) → `src/ui/app.js` (ES module)
- **State:** Single shared object `G` in `src/core/globals.js`
- **Events:** Delegated via `data-action` attributes (no inline handlers in views)
- **SRS:** FSRS-4.5 via `shared/fsrs.js` (shared with sibling Geriatrics app)
- **Persistence:** IndexedDB (primary) + localStorage (fallback) + Supabase (cloud backup)
- **Deployment:** Push to `main` → GitHub Actions → Vite build → GitHub Pages

## Content

| Resource | Count |
|----------|-------|
| Questions | 1,472 MCQs |
| Topics | 24 subspecialties |
| Study Notes | 24 |
| Flashcards | 155 |
| Drugs | 53 (Beers/ACB/STOPP) |
| Past Exams | 7 sessions (2020–2025) |
| Harrison Chapters | 69 (in-app reader) |
| Articles | 10 (NEJM/Lancet) |

## Development

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server (port 3737)
npm test             # Vitest (~309 tests)
npm run build        # Production build → dist/
```

## Deployment

Push to `main` triggers `deploy.yml`: install → test → build → deploy `dist/` to GitHub Pages.

## CI

| Workflow | Purpose |
|----------|---------|
| `ci.yml` | Data validation, schema, SW version sync, tests, build |
| `integrity-guard.yml` | JS syntax, critical functions, function count regression |
| `weekly-audit.yml` | Full weekly health audit |
| `deploy.yml` | Build + deploy to GitHub Pages |

## File Structure

```
src/
├── core/       # globals, constants, utils, state, data-loader
├── sr/         # FSRS bridge, spaced repetition engine
├── quiz/       # Quiz engine, study modes
├── ai/         # AI proxy client, explain/autopsy/teach-back
├── features/   # Cloud backup, leaderboard, feedback
├── ui/         # App shell + 5 content views (delegated events)
└── styles/     # 8 CSS files
shared/fsrs.js  # FSRS-4.5 (shared with Geriatrics repo)
data/           # Runtime JSON (questions, topics, notes, drugs, flashcards)
```

See `CLAUDE.md` for full architecture documentation.

---
صدقة جارية الى من نحب — Ceaseless Charity, To the People That We Love
