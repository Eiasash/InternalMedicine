---
description: Pre-generate Hebrew AI explanations for high-frequency Pnimit questions via the Toranot proxy, grounded in Harrison's 22e.
---

# /explain-batch

Generate Hebrew explanations for the top-N questions, prioritizing the highest-yield topics and most recent sessions.

## Steps

1. Read `data/questions.json`. Prioritize by:
   - Most recent dated session in `t` (e.g. `2025-Jun`, `2024-Oct`).
   - Highest-weight topics per `EXAM_FREQ` / `IMA_WEIGHTS` in `src/core/constants.js` (24-topic vectors).
   - Items whose `e` (explanation) is missing or thin.
2. For each selected question, call the AI through the **Toranot proxy** (`AI_PROXY` in `src/core/constants.js`) — never a raw provider endpoint, never a hardcoded key. Send: the Hebrew stem, the 4 options, the correct index `c` (and `c_accept` if present), and the topic. Request:
   - Hebrew explanation of why `c` is correct (mechanism / decisive discriminator),
   - why each of the other three options fails,
   - a one-line board pearl,
   - the Harrison 22e chapter citation.
3. Keep explanations consistent with the stored `c` (and `c_accept`). If the generated explanation argues for a different option, flag the item for `clinical-accuracy-reviewer` instead of writing a contradictory `e`.
4. Write results back into the item's `e` field (or the explanation store the app reads), preserving the question schema. Run `npm run verify` afterward.

## Rules

- Route only through the Toranot proxy. Do NOT embed any API key in source — the proxy holds the credential.
- Hebrew UTF-8 as-is; follow `.claude/skills/hebrew-medical-glossary/SKILL.md`.
- Ground every explanation in Harrison 22e (or the item's own cited source). Do not fabricate citations.
