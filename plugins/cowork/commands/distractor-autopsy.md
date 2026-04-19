---
description: Deep review of a single MCQ's distractors before approval (Pnimit / InternalMedicine)
argument-hint: <index>  (0-based array index into data/questions.json)
---

Invoke the `distractor-autopsy` agent with question at index `$ARGUMENTS`.

Pnimit questions don't have `id` fields — they're identified by 0-based array index in `data/questions.json`.

Before invoking, look up the question:

```bash
jq --argjson i "$ARGUMENTS" '.[$i]' data/questions.json
```

If the index is out of range or returns `null`, stop and report:
```bash
jq 'length' data/questions.json   # confirm corpus size
```

Pass to the agent:
1. The full question object at index `$ARGUMENTS`.
2. Up to 8 sibling questions sharing the same `ti` (so it can check answer-key independence and distractor recycling across the topic):

```bash
jq --argjson i "$ARGUMENTS" '
  . as $all | $all[$i].ti as $topic |
  [$all[] | select(.ti == $topic)][0:8]
' data/questions.json
```

3. The topic name from the topic index (0=Cardiology, 1=HF, … 23=Vascular).

The agent will not modify the question — it only critiques.
