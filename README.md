# Pnimit Mega — Internal Medicine Board Prep 🏥

Israeli Internal Medicine (רפואה פנימית) Stage A Board Exam preparation PWA.

**Syllabus:** P0064-2025 (IMA Scientific Council)

## Stack
- Single-file HTML PWA (vanilla JS)
- GitHub Pages deployment
- IndexedDB + localStorage persistence
- FSRS-4.5 spaced repetition algorithm
- Service Worker for offline support

## Content
- **Textbook:** Harrison's Principles of Internal Medicine, 22nd Edition
- **Articles:** 10 required NEJM/Lancet articles (2024-2025)
- **Questions:** To be added (past exams + AI-generated)
- **Flashcards:** To be added
- **Study Notes:** To be added

## Excluded Harrison's Chapters (P0064-2025)
| Part | Section | Chapters |
|------|---------|----------|
| 1 | NA | 1, 2, 3, 4, 5, 7, 8, 9, 10, 11 |
| 2 | 4 | All |
| 3 | NA | 72 |
| 4 | 1 | 76, 77, 81, 82, 87-91, 93-97 |
| 5 | 1 | 125, 126 |
| 5 | 5 | 155, 157, 158 |
| 5 | 6 | 175, 178 |
| 5 | 8 | 184 |
| 5 | 9 | 188 |
| 5 | 15 | 216 |
| 5 | 16 | 218, 219, 220, 225, 226 |
| 5 | 18 | 230, 232, 234, 236 |
| 5 | 19 | 237, 238, 240, 242 |
| 7 | 2 | 302 |
| 12 | 1 | 400, 401 |
| 12 | 2 | All |
| 12 | 5 | 429-432 |
| 13 | 1 | 435 |
| 13 | 2 | 436, 441, 447-450, 454-456 |
| 13 | 3 | 460 |
| 13 | 4 | All |
| 14 | NA | 472 |
| 15 | NA | All |
| 16 | NA | 479-483 |
| 17 | NA | All |
| 19 | NA | All |
| 20 | NA | 494, 495, 497-500, 502, 504, 505 |

## Features
- 📝 Quiz engine (exam mode, timed, sudden death, blind recall)
- 📚 Study notes viewer
- 📖 Harrison's in-app reader
- 🃏 Flashcards with spaced repetition
- 📄 Required articles reference
- 🧮 Clinical calculators
- 📊 Progress tracking with weekly snapshots
- 🔍 Full-text search across all content
- 💬 AI chat (Claude API)
- 🌙 Dark mode + study mode
- ⏱️ Pomodoro timer

## Data Format
Questions: `data/questions.json`
```json
[{"q":"question text","o":["A","B","C","D"],"c":2,"t":"2024","ti":5,"e":"explanation"}]
```
- `q`: question text (Hebrew)
- `o`: options array
- `c`: correct answer index (0-based)
- `t`: exam year/source tag
- `ti`: topic index (auto-tagged)
- `e`: explanation (Hebrew)

## Development
```bash
# Local dev
npx serve .

# Deploy
git push origin main  # GitHub Pages auto-deploys
```

---
صدقة جارية الى من نحب — Ceaseless Charity, To the People That We Love
