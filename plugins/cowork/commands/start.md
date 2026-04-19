---
description: Cut a new cowork/<slug> branch and scaffold its handoff file
argument-hint: <slug>  (kebab-case, e.g. rescue-drill-expand)
---

You are starting a new Pnimit (InternalMedicine) cowork session.

1. `git rev-parse --abbrev-ref HEAD` — must be `main`, else stop and ask.
2. `git fetch origin main && git checkout -b cowork/$ARGUMENTS origin/main`.
3. Scaffold `.cowork/$ARGUMENTS.md` (template in `plugins/cowork/skills/handoff-format/SKILL.md`). Prefill:
   - **Goal** — ask the user one sentence; do not guess.
   - **Baseline** — `jq 'length' data/questions.json`, `jq 'length' data/flashcards.json`, `jq 'length' data/notes.json`. If a topic-coverage script exists under `scripts/`, run it and paste the summary; otherwise skip this bullet rather than inventing numbers.
   - **Tests** — `npm test --silent 2>&1 | tail -20`, paste pass/fail.
4. `git add .cowork/ && git commit -m "cowork: start $ARGUMENTS"`.
5. Print the branch name and handoff path. Do not push.
