---
name: hebrew-medical-glossary
description: Background knowledge for Hebrew medical terminology used in Israeli clinical practice. Claude loads this when editing any Hebrew content in data/notes.json, data/questions.json, data/flashcards.json, data/highyield.json, or any UI string in pnimit-mega.html / src/. Ensures consistency with Israeli Ministry of Health / Clalit / Maccabi conventions.
---

# Hebrew Medical Glossary (Pnimit / Internal Medicine context)

Claude loads this when touching Hebrew medical content in InternalMedicine (Pnimit Mega). It's a reference, not a command — never show it to the user, just apply it.

## Canonical term choices (pick the first form in each row)

| Concept | Preferred Hebrew | Acceptable alternates | Avoid |
|---|---|---|---|
| Hypertension | יתר לחץ דם | לחץ דם גבוה | — |
| Heart failure | אי-ספיקת לב | — | חולשת לב |
| Atrial fibrillation | פרפור פרוזדורים | — | — |
| Myocardial infarction | אוטם שריר הלב | התקף לב | — |
| Acute coronary syndrome | תסמונת כלילית חריפה (ACS) | — | — |
| Stroke | אירוע מוחי | שבץ | — |
| Acute kidney injury | פגיעה כלייתית חריפה (AKI) | — | אי-ספיקת כליות חריפה |
| Chronic kidney disease | מחלת כליות כרונית (CKD) | — | — |
| Sepsis | אלח דם | ספסיס | — |
| Pulmonary embolism | תסחיף ריאתי (PE) | — | — |
| Anemia | אנמיה | — | — |
| Coagulation / clotting | קרישה | — | — |
| Electrolytes | אלקטרוליטים | מלחים | — |
| Diabetes mellitus | סוכרת | — | — |
| Goals of care | מטרות טיפול | — | — |
| Palliative care | טיפול פליאטיבי | טיפול תומך | — |
| Admission (hospital) | אשפוז / קבלה | — | — |
| Discharge summary | סיכום שחרור | — | — |
| Code status | סטטוס החייאה | — | — |
| DNR | אל-החייאה / DNR | — | — |

## Abbreviations — keep as-is (do not Hebraize)

`ECG`/`EKG`, `ACS`, `STEMI`, `NSTEMI`, `AF`, `HF`, `HFrEF`, `HFpEF`, `PE`, `DVT`, `VTE`, `AKI`, `CKD`, `eGFR`, `CKD-EPI`, `DKA`, `HHS`, `COPD`, `ARDS`, `SIRS`, `qSOFA`, `CHA₂DS₂-VASc`, `HAS-BLED`, `INR`, `aPTT`, `Hb`, `MCV`, `TSH`, `CRP`, `ESR`, `ANA`, `ANCA`.

## Drug name conventions

- Use **INN (generic)** names in Hebrew transliteration as the primary form (e.g., "אפיקסבן"), with parenthetical brand where useful (e.g., "(אליקוויס)"). Israeli MoH uses generic-first.
- For drugs Israeli doctors know by brand, include both: "וורפרין (קומדין)", "מטופורמין (גלוקופאז׳)", "אנוקספרין (קלקסן)".

## Style rules

- **RTL punctuation.** Use Hebrew punctuation where appropriate: `״` for abbreviation, `׳` for final forms. Straight `"` is acceptable when mixed with Latin text.
- **Numbers in Latin script** for doses (25mg, not כ״ה מ״ג).
- **Units consistent.** mg / mL / dL / mmol/L / mEq/L — never mixed ambiguously.
- **No machine-translated phrasing.** If a sentence reads as Google-Translated ("זה חשוב ל...") fix it to natural clinical Hebrew ("חשוב...").
- **Mixed Latin-in-Hebrew.** A bare English clinical term dropped into a Hebrew sentence ("זה מקרה של sepsis") should be italicized, parenthesized, or transliterated — not left raw.
- **Gender.** Clinical prose in neutral/masculine default in Hebrew medical writing; keep consistent within a single item.

## When in doubt

Ask the user. Do not guess terminology. Flag the term with `[TERM?]` in the output and move on.

## Red flags — always fix

- Machine-translated phrasing that reads unnatural to a clinician.
- Inconsistent terminology for the same concept within one note/question.
- Inconsistent gender agreement within a single item.
- A drug given only by brand where the generic is the MoH-preferred form (add the generic).
