---
name: handoff-format
description: Canonical format for Pnimit (InternalMedicine) `.cowork/<slug>.md` handoff files. Load whenever writing or reading a handoff.
---

# cowork handoff format (Pnimit / InternalMedicine)

Handoff files live at `.cowork/<slug>.md`, one per active branch, committed.

## Required sections

### Header
```
# <slug>

**Branch:** cowork/<slug>
**Last session:** YYYY-MM-DD (model)
**Status:** in-progress | blocked: <reason> | ready-to-land
```

### Goal
One paragraph. Never edit after the first session — this is the anchor.

### Baseline
Snapshot from `/cowork:start`:
- `data/questions.json` length at branch-off.
- `data/flashcards.json` length at branch-off.
- `data/notes.json` length at branch-off.
- (optional) topic-coverage numbers at branch-off.

### Claimed  (optional, for tandem sessions)
Paths this branch is actively editing. Managed by `/cowork:claim` and surfaced by `/cowork:collisions`. Format:
```
### Claimed
- data/questions.json   (2026-04-19T08:15Z)
- src/ui/quiz-view.js   (2026-04-19T08:15Z)
```
A parallel cowork branch touching a claimed path is a hard warning (not an auto-fail — overlaps in `data/questions.json` are common and usually resolvable). Missing this section is fine for solo work.

### Done
Concrete bullets with artifact + scope. Examples:
- `data/questions.json` +12 (topic: nephrology, ids: q0612–q0623).
- `src/ui/quiz-view.js`: fixed RTL stray LTR mark in quiz-nav.
- NOT allowed: “improved quiz”, “cleaned up”.

### Next
One or two concrete actions with file paths. Imperative. Examples:
- `[ ] Add 4 questions for topic "electrolytes" (ti=8) to data/questions.json`.
- NOT allowed: `[ ] Continue`, `[ ] Review`.

### Tests
One line per suite, current state:
- `npm test -- quiz` : PASS
- `npm run lint` : FAIL (3, pre-existing)

### Notes for the next Claude
Non-obvious only:
- Skipped test + reason to re-enable.
- A distractor left deliberately weak pending review.
- Hebrew term waiting on glossary clarification.
- A `window.fn` binding left in place pending a circular-import fix.
- Why a claim was released early (e.g. “sibling branch owns this path now”).

## Not allowed
- Conversational summary — use commits.
- Restating the diff — use `git diff`.
- Follow-up ideas unrelated to this branch — open an issue instead.
