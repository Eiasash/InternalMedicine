---
description: Land the current cowork branch onto main with schema + build enforcement
---

1. `git rev-parse --abbrev-ref HEAD` — must be `cowork/*`. Abort otherwise.
2. `git fetch origin main && git rebase origin/main`. Conflicts → STOP, print them.
3. **Schema guard** — delegate to the `schema-guard` agent. It verifies any change to `data/questions.json`, `data/notes.json`, `data/drugs.json`, `data/flashcards.json` against the Pnimit schema (`ti` 0–23, year tags, Harrison citations, no `q`/`a` legacy flashcard shape) and flags wrong-app leaks (`Hazzard`, `P005-2026`, `גריאטריה`, `CFS`, `STOPP/START`). If verdict = fail, STOP and surface the agent's blocker list to the user.
4. Hebrew guard (soft): sample 5 Hebrew strings from the diff and eyeball for obvious medical-term slips. Report, do not auto-fix.
5. `npm test --silent`. Then `npm run build` (Vite) — must succeed. Then any lint script in `package.json`.
6. Read `.cowork/<slug>.md`. Draft squash message: title `<type>(scope): <goal>`; body = **Done** bullets; footer `Cowork-branch: cowork/<slug>`.
7. Print the draft message + the git commands. Do NOT merge/push.
