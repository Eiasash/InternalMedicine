# cowork (Pnimit / InternalMedicine)

Claude Code plugin that formalizes the `cowork/<topic>` branch workflow for the InternalMedicine question bank + app, mirroring the Geriatrics cowork plugin.

One plugin = consistent start / handoff / resume / status / land commands + tandem-session safety (claim/collisions) + a SessionStart hook that loads the current handoff automatically.

This is the **thin port**: content-agnostic coordination commands only. Pnimit-specific reviewers (distractor-autopsy, topic-coverage, schema-guard) are intentionally omitted — add them per Pnimit's schema (`ti` 0–23, Harrison's 22e) when the need arises.

## Install

Symlink into the repo's `.claude/plugins/`:

```bash
mkdir -p .claude/plugins
ln -sfn "$PWD/plugins/cowork" .claude/plugins/cowork
```

## Commands

| Command | Purpose |
|---|---|
| `/cowork:start <slug>` | Cut `cowork/<slug>` from main, scaffold `.cowork/<slug>.md` |
| `/cowork:handoff` | Refresh handoff: question count delta, failing vitest suites, next step |
| `/cowork:resume` | Read handoff, verify `npm test`, restate next action |
| `/cowork:status` | Every cowork branch: ahead/behind, handoff age, data delta |
| `/cowork:land` | Rebase, run vitest + Vite build, draft squash message |
| `/cowork:claim <path…>` | Declare paths the current branch is editing so parallel sessions can see it |
| `/cowork:collisions` | Report file overlap and claim violations across all active cowork/* branches |

## Hook

`SessionStart` — if HEAD is `cowork/*`, prints the handoff file + last 5 commits.

## Handoff file

Lives at `.cowork/<slug>.md`, committed. See `skills/handoff-format/SKILL.md`.

## Tandem safety

When multiple Claude sessions run cowork branches in parallel:

1. `/cowork:claim data/questions.json src/ui/quiz-view.js` at session start. This writes a timestamped **Claimed** block into `.cowork/<slug>.md` and pushes it.
2. Before a long edit, run `/cowork:collisions` — fetches all cowork branches and reports files touched by ≥2 branches, plus any branch editing paths claimed elsewhere.
3. Resolve by rebase or by yielding the newer branch. Never auto-resolve.

## Differences from Geriatrics cowork

| Concern | Geriatrics | Pnimit |
|---|---|---|
| Main file | `shlav-a-mega.html` (monolith) | `pnimit-mega.html` shell + `src/**/*.js` modules |
| Topic range | `ti` 0–39 (Hazzard scope) | `ti` 0–23 (Harrison scope) |
| Content red flags | GRS leak, Hazzard-excluded chapters | geriatrics-only content leak |
| Build | no build step | `npm run build` (Vite) runs in `/land` |
| Hebrew glossary skill | used in `/land` | not wired; hook available for future |
