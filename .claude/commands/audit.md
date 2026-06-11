---
description: Full read-only audit of Pnimit Mega — find bugs, wrong answers, schema drift, UX issues, version mismatches.
---

Perform a comprehensive read-only audit of the Pnimit Mega app (Israeli Internal Medicine board prep, P0064-2025, Harrison's 22e). Vite + ES modules; entry `pnimit-mega.html` → `src/ui/app.js`.

Check:

1. **Question integrity.** Sample ~20 questions from `data/questions.json`. For each, re-derive the correct answer from Harrison 22e (or the item's cited source) and confirm the stored `c` is plausible. Honor any `c_accept` array. Never assume `c` is correct.
2. **Schema conformance.** Every question: `o` has exactly 4 options, `c` ∈ 0..3 indexes a real option, `ti` ∈ 0..23, `t` is a string. Spot-check `notes.json` (`topic`+`notes`), `drugs.json` (`name,heb,acb,beers,cat,risk`), `flashcards.json` (`f`+`b`).
3. **Topic mapping.** All `ti` values map to valid `TOPICS` indices (0..23) in `src/core/constants.js`, and each topic has ≥ 5 questions (CI gate).
4. **Version trinity.** `package.json` version (`X.Y.Z.0`) ⟷ `APP_VERSION` in `src/core/constants.js` (`X.Y.Z`) ⟷ `sw.js` `CACHE='pnimit-v<X.Y.Z>'` all aligned. This is enforced by `tests/regressionGuards.test.js`.
5. **AI explain path.** `callAI` exists (`src/ai/`), handles errors gracefully, and routes through the Toranot proxy (`AI_PROXY` in constants). No raw API keys in source.
6. **Module structure.** The integrity-guard required-files + critical-functions still present (read `integrity-guard.yml` for the live list); `data-loader.js` fetches `questions.json`; `app.js` sets `G.render`.
7. **JS errors.** `node --check` clean across `src/**/*.js` + `shared/*.js`; no truncated-async patterns.
8. **innerHTML safety.** No interpolated `innerHTML` assignment without `sanitize(`.
9. **Hebrew RTL / mixed-script.** Hebrew renders RTL; embedded English/drug-name token order intact; no machine-translated phrasing.
10. **Service worker.** `sw.js` references all six `data/*.json` files + `pnimit-mega.html` + `shared/fsrs.js`, and its version matches APP_VERSION.
11. **No geriatrics leakage.** `src/**/*.js` clean of the CI-banned geriatrics terms (read the list from `ci.yml`).

Output: numbered findings, priority HIGH/MED/LOW, with `file:line` (or `idx <N>` for questions) and a one-line fix recommendation. This command is read-only — report, do not edit or deploy.
