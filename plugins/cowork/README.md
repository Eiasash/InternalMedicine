# cowork (Pnimit / InternalMedicine)

Claude Code plugin that formalizes the `cowork/<topic>` branch workflow for the InternalMedicine question bank + app, mirroring the Geriatrics cowork plugin.

One plugin = consistent start / handoff / resume / status / land commands + tandem-session safety (claim/collisions) + a SessionStart hook that loads the current handoff automatically.

**v0.2.0** — adds Pnimit-tuned reviewers (`distractor-autopsy`, `schema-guard`, `topic-coverage`, `hebrew-sweep`) on top of the v0.1.0 thin port.

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
| `/cowork:distractor-autopsy <index>` | Deep review one MCQ's distractors (by 0-based array index) before approving |
| `/cowork:topic-coverage` | Report question density per Pnimit topic (ti 0–23); flag gaps and overweighted topics |
| `/cowork:hebrew-sweep` | Eyeball-review recently-touched Hebrew strings for terminology consistency |

## Agents

- `distractor-autopsy` — second-opinion reviewer for MCQ quality (homogeneity, plausibility, absolute-term red flags, answer-key stability, topic coherence, geriatrics-only leak).
- `schema-guard` — verifies any change to `data/questions.json` / `notes.json` / `drugs.json` / `flashcards.json` against the Pnimit schema (`ti` 0–23, year tags, no Hazzard/GRS/geriatrics leak, no `q`/`a` legacy flashcard shape).

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
| Question identity | `id` field | 0-based array index in `data/questions.json` |
| Content red flags | GRS leak, Hazzard-excluded chapters | Hazzard / P005-2026 / גריאטריה / CFS leak (wrong app) |
| Build | no build step | `npm run build` (Vite) runs in `/land` |
| Hebrew glossary skill | `hebrew-medical-glossary` (geriatrics-scoped) | none yet — `/hebrew-sweep` falls back to heuristics |
| Question-schema skill | external `question-schema` skill | inline schema in agents (self-contained) |
