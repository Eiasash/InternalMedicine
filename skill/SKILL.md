---
name: pnimit-mega-dev
description: >
  Complete development skill for Pnimit Mega (שלב א מגה — פנימית), an Israeli internal medicine
  board exam PWA. ALWAYS use this skill when: modifying Pnimit Mega code, fixing bugs, adding
  features, parsing new exam PDFs, adding questions/flashcards/notes, pushing to GitHub, or
  anything related to the InternalMedicine repo. Also trigger on: "pnimit", "internal medicine
  board", "פנימית מגה", "P0064-2025", references to eiasash.github.io/InternalMedicine,
  "parse exam", "add questions", "pnimit bug", or any mention of the InternalMedicine repo.
  Contains repo structure, data formats, deployment pipeline, exam parsing patterns, and
  content creation conventions. Always read this before touching any Pnimit code.
---

# Pnimit Mega — Development Skill

## Identity

- **App**: Pnimit Mega (שלב א מגה — רפואה פנימית)
- **URL**: https://eiasash.github.io/InternalMedicine/
- **Repo**: github.com/Eiasash/InternalMedicine
- **Version**: v9.36
- **Stack**: Single-file HTML PWA, vanilla JS, GitHub Pages
- **Syllabus**: P0064-2025 (Israeli Internal Medicine Stage A)
- **Sibling app**: Shlav A Mega (geriatrics) at Eiasash/Geriatrics — same engine, different syllabus & data

## Critical: This Is NOT the Geriatrics App

| Aspect | Pnimit Mega (THIS) | Shlav A Mega (sibling) |
|--------|-------------------|----------------------|
| Specialty | Internal Medicine (פנימית) | Geriatrics (גריאטריה) |
| Syllabus | P0064-2025 | P005-2026 |
| Textbooks | Harrison's 22e ONLY | Hazzard's 8e + Harrison's 22e |
| Laws/regulations | None | 15 Israeli laws |
| Topics | 24 (IM subspecialties) | 40 (geriatric syndromes) |
| localStorage key | `pnimit_mega` | `samega` |
| IndexedDB | `pnimit_mega_db` | `shlav_mega_db` |
| SW cache | `pnimit-v9.30` | `shlav-a-v9.30` |
| Questions | 913 | 1,470 |
| Articles | 10 (NEJM/Lancet) | 6 (geriatric) |

## P0064-2025 Syllabus — Internal Medicine Stage A

### Exam Structure
The exam is MCQ-based, held twice yearly (May/June and October). ~100 questions per session.
All questions are in Hebrew with 4 options (א–ד). Some include clinical images.

### Core Textbook
**Harrison's Principles of Internal Medicine, 22nd Edition** — selected chapters per syllabus.
NO Hazzard's, NO GRS, NO Israeli laws (those are geriatrics-only).

### Harrison's 22e Required Chapters (P0064-2025)
Symptoms & Signs: 14 (Pain), 15 (Chest), 16 (Abdominal Pain), 17 (Headache), 18 (Low Back), 20 (Fever), 22 (FUO), 30 (Coma), 39 (Dyspnea), 40 (Cough), 41 (Hemoptysis), 42 (Hypoxia), 43 (Edema)
GI: 48 (N/V), 49 (Diarrhea/Constipation), 50 (Weight Loss), 51 (GI Bleeding), 52 (Jaundice), 53 (Ascites), 332 (GI Disease), 347 (Liver Function), 355 (Cirrhosis)
Renal: 55 (Azotemia), 56 (Fluids/Lytes), 57 (Calcium), 58 (Acid-Base), 319 (Renal Disease), 321 (AKI), 322 (CKD)
Heme/Onc: 66 (Anemia), 67 (Granulocytes), 69 (Bleeding/Thrombosis), 70 (Lymph/Spleen), 79 (Infections in Cancer), 80 (Onc Emergencies), 102 (Iron Deficiency), 120 (Platelet Disorders), 121 (Coag Disorders)
ID: 127 (Acutely Ill Febrile), 133 (Endocarditis), 136 (Osteomyelitis), 142 (Encephalitis), 143 (Meningitis), 147 (HAIs)
Cards: 243 (CV Disease), 247 (ECG), 285 (NSTEMI/UA), 286 (STEMI)
Pulm: 295 (Respiratory Disease), 305 (Pleura)
Critical Care: 311 (Critical Illness), 314 (Shock), 315 (Sepsis), 316 (Cardiogenic Shock), 317 (Cardiac Arrest)
Rheum: 375 (Vasculitis), 379 (Sarcoidosis), 382 (Articular/MSK), 384 (Gout/Crystal), 387 (Periarticular)
Neuro: 26 (Neurologic Weakness), 433 (Neurologic Disease), 436 (Seizures), 437 (Cerebrovascular), 438 (Ischemic Stroke), 439 (ICH), 458 (GBS), 459 (Myasthenia)
Endo: 388 (Endocrine Disorders)

### Required Articles (10)
| # | Article | Trial/Topic | File |
|---|---------|-------------|------|
| 1 | Digitoxin in HFrEF | DIGIT-HF | 01_digitoxin_hfref.pdf |
| 2 | cfDNA Blood Test for CRC Screening | ECLIPSE | 02_cfdna_crc_screening.pdf |
| 3 | BSI 7 vs 14 Days | BALANCE | 03_bsi_7vs14_days.pdf |
| 4 | Aspirin + OAC in Chronic Coronary Syndrome | — | 04_aspirin_ccs_oac.pdf |
| 5 | Baxdrostat for Resistant HTN | — | 05_baxdrostat_htn.pdf |
| 6 | Apixaban Extended VTE Treatment | — | 06_apixaban_vte.pdf |
| 7 | Upadacitinib for GCA | SELECT-GCA | 07_upadacitinib_gca.pdf |
| 8 | Sarcoidosis Prednisone vs MTX | FIRE | 08_sarcoidosis_pred_mtx.pdf |
| 9 | Sotatercept for PAH | STELLAR | 09_sotatercept_pah.pdf |
| 10 | ECST-2 Carotid Stenosis | ECST-2 | 10_ecst2_carotid.pdf |

## Repo Structure

```
InternalMedicine/
├── index.html                  # Redirect → pnimit-mega.html
├── pnimit-mega.html            # THE APP (~253KB, single file, all JS/CSS inline)
├── manifest.json               # PWA manifest
├── sw.js                       # Service worker (cache: pnimit-v9.30)
├── CLAUDE.md                   # Dev instructions for Claude
├── README.md
├── data/
│   ├── questions.json          # 913 MCQs with explanations
│   ├── drugs.json              # 53 drugs (ACB scores, Beers flags, STOPP interactions)
│   ├── flashcards.json         # 100 flashcards
│   ├── notes.json              # 24 study notes
│   ├── topics.json             # 24 topic keyword arrays
│   └── tabs.json               # 10 tab definitions
├── articles/                   # 10 required article PDFs
├── exams/                      # 7 raw past exams (2020–2025)
├── harrison/                   # 69 Harrison's 22e chapter PDFs
├── harrison_chapters.json      # Harrison's 22e in-app reader (~3.8MB)
├── questions/
│   ├── image_map.json
│   └── images/                 # 128 exam images
├── syllabus/
│   └── P0064-2025.pdf
├── skill/
│   └── SKILL.md                # This file
└── tests/                      # Vitest test suite (TBD)
```

## Data Formats

### questions.json
```json
{
  "q": "שאלה בעברית...",
  "o": ["א. אפשרות", "ב. אפשרות", "ג. אפשרות", "ד. אפשרות"],
  "c": 2,           // 0-based correct index
  "t": "Jun23",     // exam session tag
  "e": "הסבר...",    // AI explanation
  "img": "questions/images/img_Jun23_5.jpg",  // optional
  "ti": 12          // topic index (0-23)
}
```

**Exam tags**: `2020`, `Jun21`, `Jun22`, `Jun23`, `May24`, `Oct24`, `Jun25`

### drugs.json
```json
{"name": "Oxybutynin", "heb": "דיטרופן", "acb": 3, "beers": true, "cat": "Anticholinergic/Bladder", "risk": "..."}
```

### Topic Index (ti: 0–23)
0=Cardiology/CAD  1=Heart Failure  2=Arrhythmias  3=Valvular  4=Hypertension
5=Pulmonology/VTE  6=GI/Hepatology  7=Nephrology  8=Electrolytes/Acid-Base
9=Endocrinology  10=Hematology  11=Oncology  12=Infectious Disease
13=Rheumatology  14=Neurology  15=Critical Care  16=Dermatology
17=Allergy/Immunology  18=Fluids/Volume  19=Pain/Palliative  20=Perioperative
21=Toxicology  22=Clinical Approach  23=Vascular

## AI Integration

### Proxy (shared with Geriatrics sibling)
- Endpoint: `https://toranot.netlify.app/api/claude`
- Header: `x-api-secret: shlav-a-mega-2026`
- Model: `sonnet` (maps to claude-sonnet-4-6)
- Flow: Proxy first → fallback to user's personal API key
- Friends can use the app WITHOUT their own API key (proxy covers it)

### AI features in-app
- Question explanations (on-demand, per question)
- Chat assistant (general medical study questions)
- Exam analysis and weak-topic identification

## Development

### Version bumping — update TWO places:
1. `pnimit-mega.html`: `const APP_VERSION='X.Y';`
2. `sw.js`: `const CACHE='pnimit-vX.Y';`

### Deployment
```bash
git add -A && git commit -m "message" && git push origin main
```
GitHub Pages auto-deploys in ~60s. No build step.

### Exam Parsing Pipeline
1. Parse answer key PDF → Hebrew letter mapping (א=0, ב=1, ג=2, ד=3)
2. Parse question PDF → segment by standalone number lines
3. Extract images from image PDF → PyMuPDF 200 DPI JPEG
4. Generate explanations via proxy
5. Append to `data/questions.json`, update `questions/image_map.json`

## Content Stats

| Content | Count |
|---------|-------|
| MCQ questions | 1011 (all with explanations) |
| Questions with images | 73 |
| Exam images | 128 |
| Drugs | 53 |
| Flashcards | 155 |
| Study notes | 24 |
| Article PDFs | 10 |
| Harrison chapter PDFs | 69 |
| Past exams (raw) | 7 sessions (2020–2025) |
| Topics | 24 |
