---
description: Question density per Pnimit topic (ti 0-23); flag gaps and overweighting
---

1. Read `data/questions.json`.
2. For each Pnimit topic (`ti` 0–23):
   - count questions tagged to that topic.
3. Print a table sorted ascending: `ti | topic name | count | % of total`.

Topic name lookup:
```
0=Cardiology      1=HF              2=Arrhythmias     3=Valvular
4=HTN             5=Pulmonology     6=GI              7=Nephrology
8=Electrolytes    9=Endocrinology   10=Hematology     11=Oncology
12=ID             13=Rheumatology   14=Neurology      15=Critical Care
16=Dermatology    17=Allergy/Immun  18=Fluids/Volume  19=Pain/Palliative
20=Perioperative  21=Toxicology     22=Clinical Appr  23=Vascular
```

4. Flag:
   - **Gaps**: topic with < 5 questions (matches the CI threshold in `.github/workflows/ci.yml`).
   - **Overweight**: any topic > 15% of total.
   - **Out-of-range**: any question with `ti` ≥ 24 or `ti` < 0 (must be 0; if not, hard fail and list the array indices).
   - **Wrong-app leak**: any question whose stem matches `Hazzard|P005-2026|גריאטריה|CFS\\b|STOPP/START` (must be 0; hard fail with array indices).
5. End with a one-line recommendation: which gap to fill first in the current cowork branch.

Useful one-liner for the count:
```bash
jq -r 'group_by(.ti) | map({ti: .[0].ti, n: length}) | sort_by(.ti) | .[] | "\(.ti)\t\(.n)"' data/questions.json
```
