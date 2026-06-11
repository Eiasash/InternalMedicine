---
description: Run the full local CI mirror — npm run verify and/or the schema-guardian subagent. Non-destructive; reports pass/fail only.
allowed-tools: Task, Bash, Read
---

# /validate

Runs this repo's validation chain locally so you don't wait on GitHub Actions.

## Execution

Claude should:

1. Run the repo's own verify chain and surface the result verbatim:
   ```bash
   npm run verify
   ```
   This runs (per package.json): `regen_manifest.cjs --check`, `sync-sw-version.cjs`, the two innerHTML checks, the Harrison-Hebrew baseline (strict), `npm test` (vitest), and `scripts/build.sh`.
2. If you want the granular CI/integrity-guard breakdown (which check failed and why), launch the `schema-guardian` subagent with: "Read ci.yml + integrity-guard.yml, then run every check they run against the current working tree and report pass/fail with specifics."
3. Surface the full report to the user.
4. If everything passes → say so plainly.
5. If anything fails → do NOT suggest deploying; point at the specific failure (file:line / count).

## Rules

- Never auto-fix anything. The failures are the user's signal.
- Never deploy automatically, even on all-green — that's a human decision.
- Report exact failing output, not a summary.
