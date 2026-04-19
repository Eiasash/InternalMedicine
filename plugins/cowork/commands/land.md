---
description: Land the current cowork branch onto main with schema + build enforcement
---

1. `git rev-parse --abbrev-ref HEAD` — must be `cowork/*`. Abort otherwise.
2. `git fetch origin main && git rebase origin/main`. Conflicts → STOP, print them.
3. **Schema guard** (inline check — no dedicated agent in the thin port):
   - Any change to `data/questions.json` must obey Pnimit question schema: `q` (string), `o` (array ≥ 2), `c` (0-based integer < o.length), `t` (valid year tag: `2020`, `Jun21`, `Jun22`, `Jun23`, `May24`, `Oct24`, `Jun25`, `Exam`, `Harrison`), `ti` (integer 0–23).
   - Any change to `data/notes.json` must cite a real Harrison's 22e chapter; **no Hazzard/GRS/geriatrics-only references**.
   - Any change to `data/flashcards.json` uses the `f`/`b` schema (not `q`/`a`); no `ti` field.
   - Run the CI grep-equivalent: search diffs for the strings `Hazzard`, `P005-2026`, `גריאטריה` — any hit is a hard fail (wrong app).
4. Hebrew guard (soft): sample 5 Hebrew strings from the diff and eyeball for obvious medical-term slips. Report, do not auto-fix.
5. `npm test --silent`. Then `npm run build` (Vite) — must succeed. Then any lint script in `package.json`.
6. Read `.cowork/<slug>.md`. Draft squash message: title `<type>(scope): <goal>`; body = **Done** bullets; footer `Cowork-branch: cowork/<slug>`.
7. Print the draft message + the git commands. Do NOT merge/push.
