// App constants — extracted from pnimit-mega.html
// Load this BEFORE the main script via <script src>

export const LS='pnimit_mega';

// IMA syllabus topic weights (approx % from P0064-2025)
export const IMA_WEIGHTS=[8,7,6,5,7,10,8,7,6,8,7,6,9,6,7,5,3,3,4,4,3,3,5,4];

// Harrison 22e chapter → PDF path mapping
export const HARRISON_PDF_MAP={"14":"harrison/Ch14_Pain_Pathophysiology_and_Management.pdf","15":"harrison/Ch15_Chest_Discomfort.pdf","16":"harrison/Ch16_Abdominal_Pain.pdf","17":"harrison/Ch17_Headache.pdf","18":"harrison/Ch18_Low_back_pain.pdf","20":"harrison/Ch20_Fever.pdf","22":"harrison/Ch22_Fever_of_Unknown_Origin.pdf","26":"harrison/Ch026_Neurologic_Causes_of_Weakness_and_Paralysis.pdf","30":"harrison/Ch30_Coma.pdf","39":"harrison/Ch39_Dyspnea.pdf","40":"harrison/Ch40_Cough.pdf","41":"harrison/Ch41_Hemoptysis.pdf","42":"harrison/Ch42_Hypoxia_and_Cyanosis.pdf","43":"harrison/Ch43_Edema.pdf","48":"harrison/Ch48_Nausea_Vomiting_and_Indigestion.pdf","49":"harrison/Ch49_Diarrhea_and_Constipation.pdf","50":"harrison/Ch50_Unintentional_Weight_Loss.pdf","51":"harrison/Ch51_Gastrointestinal_Bleeding.pdf","52":"harrison/Ch52_Jaundice.pdf","53":"harrison/Ch53_Abdominal_Swelling_and_Ascites.pdf","55":"harrison/Ch55_Azotemia_and_Urinary_Abnormalities.pdf","56":"harrison/Ch56_Fluid_and_Electrolyte_Disturbances.pdf","57":"harrison/Ch57_Hypercalcemia_and_Hypocalcemia.pdf","58":"harrison/Ch58_Acidosis_and_Alkalosis.pdf","66":"harrison/Ch66_Anemia_and_Polycythemia.pdf","67":"harrison/Ch67_Disorders_of_Granulocytes_and_Monocytes.pdf","69":"harrison/Ch69_Bleeding_and_Thrombosis.pdf","70":"harrison/Ch70_Enlargement_of_Lymph_Nodes_and_Spleen.pdf","79":"harrison/Ch79_Infections_in_Patients_with_Cancer.pdf","80":"harrison/Ch80_Oncologic_Emergencies.pdf","102":"harrison/Ch102_Iron_Deficiency_and_Other_Hypoproliferat.pdf","120":"harrison/Ch120_Disorders_of_Platelets_and_Vessel_Wall.pdf","121":"harrison/Ch121_Coagulation_Disorders.pdf","127":"harrison/Ch127_Approach_to_the_Acutely_Ill_Infected_Febrile_.pdf","133":"harrison/Ch133_Infective_Endocarditis.pdf","136":"harrison/Ch136_Osteomyelitis.pdf","142":"harrison/Ch142_Encephalitis.pdf","143":"harrison/Ch143_Acute_Meningitis.pdf","147":"harrison/Ch147_Infections_Acquired_in_Health_Care_Facilities.pdf","243":"harrison/Ch243_Approach_to_the_Patient_with_Possible_Cardiov.pdf","247":"harrison/Ch247_Electrocardiography.pdf","285":"harrison/Ch285_Non-ST-Segment_Elevation_Acute_Coronary_Syndr.pdf","286":"harrison/Ch286_ST-Segment_Elevation_Myocardial_Infarction.pdf","295":"harrison/Ch295_Approach_to_the_Patient_with_Disease_of_the_R.pdf","305":"harrison/Ch305_Disorders_of_the_Pleura.pdf","311":"harrison/Ch311_Approach_to_the_Patient_with_Critical_Illness.pdf","314":"harrison/Ch314_Approach_to_the_Patient_with_Shock.pdf","315":"harrison/Ch315_Sepsis_and_Septic_Shock.pdf","316":"harrison/Ch316_Cardiogenic_Shock_and_Pulmonary_Edema.pdf","317":"harrison/Ch317_Cardiovascular_Collapse,_Cardiac_Arrest,_and_.pdf","319":"harrison/Ch319_Approach_to_the_Patient_with_Renal_Disease_or.pdf","321":"harrison/Ch321_Acute_Kidney_Injury.pdf","322":"harrison/Ch322_Chronic_Kidney_Disease.pdf","332":"harrison/Ch332_Approach_to_the_Patient_with_Gastrointestinal.pdf","347":"harrison/Ch347_Approach_to_the_Patient_with_Liver_Disease.pdf","355":"harrison/Ch355_Cirrhosis_and_Its_Complications.pdf","375":"harrison/Ch375_The_Vasculitis_Syndromes.pdf","379":"harrison/Ch379_Sarcoidosis.pdf","382":"harrison/Ch382_Approach_to_Articular_and_Musculoskeletal_Dis.pdf","384":"harrison/Ch384_Gout_and_Other_Crystal-Associated_Arthropathi.pdf","387":"harrison/Ch387_Periarticular_Disorders_of_the_Extremities.pdf","388":"harrison/Ch388_Approach_to_the_Patient_with_Endocrine_Disord.pdf","433":"harrison/Ch433_Approach_to_the_Patient_with_Neurologic_Disea.pdf","436":"harrison/Ch436_Seizures_and_Epilepsy.pdf","437":"harrison/Ch437_Introduction_to_Cerebrovascular_Diseases.pdf","438":"harrison/Ch438_Ischemic_Stroke.pdf","439":"harrison/Ch439_Intracerebral_Hemorrhage.pdf","458":"harrison/Ch458_Guillain-Barr%23U00e9_Syndrome_and_Other_Immune.pdf","459":"harrison/Ch459_Myasthenia_Gravis_and_Other_Diseases_of_the_N.pdf"};

// Historical exam topic frequency weights (9 real exams, recency-weighted)
export const EXAM_FREQ=[50,45,40,30,45,60,50,40,35,50,45,35,55,35,40,30,15,15,20,20,15,15,25,20];

// Past-exam session tokens (question `t` field). Order matches filter-pill display.
// Canonical format YYYY-Mon. `2020` kept bare — month unresolved (TODO: confirm from source).
export const EXAM_YEARS=['2020','2021-Jun','2022-Jun','2023-Jun','2024-May','2024-Oct','2025-Jun'];

// Supabase (shared Toranot project — shared w/ Toranot / FamilyMedicine / Geriatrics)
// DO NOT drift: this URL + key must match FamilyMedicine/src/core/constants.js, Geriatrics/shlav-a-mega.html, and toranot's env.
// New-format publishable key (sb_publishable_*) — public client key by design, safe to ship.
// Legacy JWT anon rotated out 2026-04 (matches § B/C/D on same project).
export const SUPA_URL='https://krmlzwwelqvlfslwltol.supabase.co';
export const SUPA_ANON='sb_publishable_tUuqQQ8RKMvLDwTz5cKkOg_o_y-rHtw';

// 24 subspecialty display names (P0064-2025)
export const TOPICS=['Cardiology — Coronary','Heart Failure','Arrhythmias & ECG','Valvular & Endocarditis','Hypertension','Pulmonology & VTE','Gastroenterology & Hepatology','Nephrology','Electrolytes & Acid-Base','Endocrinology & Diabetes','Hematology & Coagulation','Oncology & Screening','Infectious Disease','Rheumatology & Autoimmune','Neurology & Stroke','Critical Care & Shock','Dermatology','Allergy & Immunology','Fluids & Volume','Pain & Palliative','Perioperative','Toxicology','Clinical Approach & Diagnostics','Vascular Disease'];

// Version & changelog
export const APP_VERSION='9.80';
export const CHANGELOG={
    '9.80': [
      '🔇 Sibling-drift fix (matches § C FamilyMedicine v1.5.0) — DEV-gated 3 production console.log calls: data-loader.js × 2 ("Loaded N user-generated questions" + "Data loaded: N questions, N notes"), sw-update.js × 1 ("Deleted old cache: X"). Mishpacha already shipped this pattern; Pnimit was still leaking. All three now quiet in production, still visible under `import.meta.env.DEV`.',
    ],
    '9.79': [
      '🔤 BIDI hygiene pass (matches § C FamilyMedicine v1.3.4) — .heb class no longer force-sets direction:rtl; now uses unicode-bidi:plaintext + text-align:start. Each paragraph\'s base direction is computed from its own first strong character per the Unicode Bidi Algorithm. Hebrew stays right-aligned, English-majority content (AI explanations, drug names) no longer reflows RTL inside Hebrew-font containers.',
      '🔤 Quiz chrome — AI-flag banner + imgDep banner + teach-back textarea + teach-back header: dir="rtl" → dir="auto" + unicode-bidi:plaintext. Interpolated eFlag text wrapped in <bdi> so English error strings don\'t reorder into surrounding Hebrew.',
    ],
    '9.78': [
      '🔑 Rotated SUPA_ANON from legacy JWT anon to new-format publishable key (sb_publishable_*) — matches § B Toranot, § C FamilyMedicine, § D Geriatrics on the shared Supabase project. Drift-prevention comment added.',
    ],
    '9.76': [
      '↩ הוחזרו כתובות Supabase לסכמת public (internal_medicine schema לא היה חשוף ב-PostgREST, כתיבות החזירו 406 מאז merge של PR #42 ב-17:45 UTC). כל פיצ׳רי הגיבוי, הפידבק והליידרבורד פעילים שוב.',
      '🔒 תיקון במקביל לגריאטריה (v10.2) — אותה בעיה, אותו פיתרון.',
    ],
    '9.73': [
      '🔧 Oct24: 4 שאלות עם stem corrupt תוקנו (Q29 "הנ" strays + "נפיחות"→"מיימת", Q38 "נערה" מיותר, Q66 "בן 14" שהיה צריך להיות "תמונה 14", Q67 bidi spacing).',
      '✅ תמיכה בתשובות כפולות (c_accept): 5 שאלות Oct24 עם multi-accept לפי מפתח התשובות הרשמי — Q22 EGPA (א+ד), Q23 סרקואיד (ב+ג), Q37 דימום דליות (ב+ד), Q41 C.septicum (ג+ד), Q67 טחול (כל 4 התשובות — נפסלה).',
      '⏳ Oct24 חסר שאלה אחת (Q90, IPF/PFT) — ממתין ל-ingestion מה-PDF.',
    ],
    '9.72': [
      '🧹 ניקיון: 3 placeholder תמונות פגומות (data:image/svg+xml עם viewBox ריק) הוסרו משדה img. משתמשים ראו תמונות שבורות ב-2 שאלות Jun2025 + 1 Harrison עד עכשיו.',
      '📊 Audit תמונות: 160/1541 (10.4%) עם img אמיתי. Gap של 18 שאלות עם reference תמונה בטקסט אך ללא img — לא ניתן לפתור ללא PDF source images.',
      '📚 +11 missing IMA Q2020 questions (Q28,41,50,57,64,81,106-110) reconstructed from official PDFs via Sonnet 4.5 — 2020 session now complete 150/150',
      '✅ Tests: 456 pass, version 9.71 → 9.72.',
    ],
    '9.71': [
      '🔬 AI scan של 1,541 שאלות — 206 סומנו ב-eFlag (ההסבר אולי לא מתאים לתשובה הנכונה). באדג׳ אדום עם סיבת ה-AI + כפתור ✓ לניקוי לאחר בדיקה ידנית.',
      '⚠️ 8 שאלות תלויות-תמונה (imgDep) מסומנות גם הן עם כפתור ✓ מאומת.',
    ],
    '9.71-dup': [
      '🔍 AI audit על 1,541 הסברים: 206 סומנו עם eFlag (ההסבר לא תואם לתשובה הנכונה). באדג\' אדום + כפתור "✓ אמת" לאחר חשיפת התשובה.',
      '⚠️ 8 שאלות תלויות-תמונה סומנו עם באדג\' אמבר (imgDep) + כפתור "✓ מאומת" לניקוי.',
      '✓ Mark-verified buttons: imgDep + eFlag — לחיצה אחת לניקוי הסימון.',
    ],
    '9.70': [
      '↔️ BIDI audit מקיף: heDir מיושם בכל render site של תוכן עברית/אנגלית מעורב — flashcards, אופציות quiz + on-call, הסברים q.e, AI explain, autopsy cards + fallback, chat (user + assistant), teach-back, qnotes, library preview, search results, note previews.',
      '🔒 סיבוב unicode-bidi:plaintext על בלוקים רב-פסקתיים כדי שפסקאות המתחילות באנגלית (IgG4-RD, MEN1, CT) לא יהפכו את הצד של שאר הפסקה.',
    ],
    '9.69': [
      '🔍 תמונות נפתחות בזום מלא בלחיצה (היה חסר CSS ל-overlay).',
      '↔️ תיקון BIDI מקיף: כיוון טקסט מחושב לפי יחס עברית/אנגלית (heDir) במקום dir="auto". קלפי Distractor Autopsy, הסברים המתחילים ב-IgG4/MEN1/CT, שאלות ב-Library preview — כולם שומרים כעת על כיוון טקסט נכון.',
    ],
    '9.68': [
      '⚡ FSRS now deadline-aware: once an exam date is set, card intervals are capped by difficulty bucket (weak 30% / normal 60% / strong 85% of remaining days) so every card gets a pre-exam review.',
      '🎯 מבחן סימולציה — בחירת שנה ספציפית (2020/2021-Jun/2022-Jun/2023-Jun/2024-May/2024-Oct/2025-Jun) בנוסף לתמהיל המציאותי.',
      '🔁 Replay wrong answers from the most recent mock — one-tap drill from the mock result modal and from the daily plan.',
      '☁️ Cloud backup now bundles mock history + session snapshots, so cross-device restore preserves your mock trend.',
    ],
    '9.67': [
      '⬆️ כפתור "הבאה" הועבר לראש אזור התשובה',
      '✎ אייקון הערה ו-★ אייקון סימניה ברורים יותר (עיגולים צבעוניים)',
      '📊 אייקון טאב Track תוקן (היה מוצג פגום)',
      '📓 עמוד יומן לימוד — עוצב מחדש, כפתור "תרגל הכל"'
    ],
    '9.66': [
      '📋 עזרה ורשימת שינויים בעברית מלאה',
      '🔢 ספירות דינמיות (שאלות, פלאשקארדים)'
    ],
    '9.65': [
      '📝 הערות אישיות — כפתור בכל שאלה פותח הערה פרטית',
      '📓 פנקס כללי ב-Notes עם ייצוא לקובץ',
      '🔖 רשימת כל ההערות עם מעבר לשאלה'
    ],
    '9.64': [
      '🔔 התראות לא חוסמות במקום חלוניות מערכת',
      '🧹 ניקוי handlers יתומים ו-imports לא בשימוש'
    ],
    '9.63': [
      '🔀 חצי "קודמת" ו"הבאה" תוקנו לכיוון עברי',
      '📱 סיום מבחן במודאל מעוצב'
    ],
    '9.62': [
      '🌙 מצב כהה ומצב לימוד — תיקוני צבע לכל הכפתורים אחרי מענה'
    ],
    '9.61': [
      '⬅️ כפתור "קודמת" נוסף — אפשר לחזור לשאלה קודמת ולראות את התשובה שבחרת',
      '🍎 תאימות iOS — שורת סטטוס כהה, מניעת זום לא רצוי',
      '🔤 גופן Heebo ראשי לרינדור עברי איכותי'
    ],
    '9.60': [
      '🚫 הפרומפט לדירוג ביטחון הוסר — זרימת המענה ישירה',
      '📏 כפתורים גדולים יותר (44 פיקסל) למגע במובייל'
    ],
    '9.59': [
      '🐛 פריסה אחרי מענה — הכפתורים לא נדחסים לעמודה צרה',
      '🗺️ הסבר הנושא הנכון מוצג אחרי תשובה',
      '⬆️ כפתור "הבאה" ברור ובולט'
    ],
    '9.58': [
      '🎨 מערכת עיצוב חדשה — ערכת צבעים כחול/ירוק לפנימית',
      '🔤 גופנים מקומיים (ללא תלות ב-Google Fonts, עובד אופליין)',
      '🛡️ הידוק CSP',
      '♿ כיבוד prefers-reduced-motion'
    ],
    '9.57': [
      '🙈 מצב מבחן לא חושף תשובה עד הסוף',
      '📊 Exam Trend כולל 2023-Jun',
      '🗺 Weak Spots Map — תאים עם ניסיון אחד מוצגים באפור',
      '🍎 תאימות iOS למכשירים עם notch'
    ],
    '9.56': [
      '🔒 הגנת דה-דופ חזקה יותר',
      '📮 דיווחי פידבק כוללים hash לזיהוי דיווחים חוזרים'
    ],
    '9.55': [
      '🔬 Distractor Autopsy — פעיל תמיד: אחרי כל תשובה רואים למה כל דיסטרקטור שגוי',
      'נתונים מוכנים מראש לאופליין',
      'גיבוי AI לשאלות ללא ניתוח מוכן'
    ],
    '9.54': [
      '"Why did I get it wrong?" — כבר לא חוסם את כפתור "הבאה"',
      'טסט חדש: בדיקת כיסוי TOPIC_REF',
      'Pre-push hook לבדיקות innerHTML',
      'ניקוי הערות ישנות'
    ],
    '9.53': [
      'UX: "How sure are you?" (😬 🤔 😎) כבר לא חוסם את כפתור בדוק — הפך לאופציונלי. אפשר עדיין ללחוץ על אחת האמוג\'ים כדי לעקוב אחרי ביטחון, אבל לא חייבים.',
      'תיקון: כפתור "Read: Harrison Ch X — you\'re weak here" מנווט עכשיו ישירות לפרק הספציפי (נפתח Harrison chapter viewer עם התוכן) במקום סתם לפתוח את מדף הספרייה'
    ],
    '9.52': [
      'סטנדרטיזציית תגיות מבחן לפורמט קנוני YYYY-Mon (Jun21→2021-Jun, Jun22→2022-Jun, Jun23→2023-Jun, May24→2024-May, Oct24→2024-Oct, Jun25→2025-Jun)',
      'מיגרציית localStorage אוטומטית עם סנטינל __tagMigrationV1 — משתמשים קיימים לא מאבדים נתונים',
      'סנכרון canonical JSONs תחת scripts/exam_audit/canonical/ לתגיות החדשות',
      'עדכון pills סינון ב-quiz-view + Track heatmap בהתאם',
      'בדיקות רגרסיה מעודכנות ל-PAST_EXAM_TAGS החדש'
    ],
    '9.51': [
      'תיקון קריטי: שוחזרו 603 שאלות נוספות במבחנים ישנים (2020, Jun21-Jun25) — רווחים חסרים, ספרות הפוכות, שברי שאלות שקרו לשאלה הבאה',
      'הסרת שאלה כפולה ב-2020 (Q35/Q1531 עם תשובות נכונות סותרות)',
      'אבטחת Supabase: הוסרה הרשאת DELETE על pnimit_backups ו-samega_backups — מונע מחיקה זדונית של גיבויי משתמשים',
      'אבטחת Supabase: איחוד פוליסות כפולות ב-shlav_feedback (3→1)',
      'תוספת 36 בדיקות רגרסיה חדשות ב-CI — תופסות פגמים כמו mojibake, כפילויות, שבר שאלות, סנכרון canonical',
      'Canonical JSONs חודשו מ-data/questions.json הנקיה'
    ],
    '9.50': [
      'תיקון קריטי: 192 שאלות במבחני May24 ו-Oct24 היו מושחתות (הקידוד של ð במקום נ) — כולן שוחזרו במלואן בעברית נקייה',
      'הסרת שאלה כפולה ב-Oct24 (Tumor Lysis Syndrome)',
      'סה"כ שאלות: 1,542 (מ-1,543, אחת כפולה הוסרה)'
    ],
    '9.49': [
      'תיקון באג "setFilt is not defined" — טאבי מבחנים שוב עובדים',
      'בחירה מרובה של שנות מבחן — ניתן לסמן כמה שנים יחד (Jun22+Jun23+May24…)',
      'סנכרון גרסת cache של SW עם APP_VERSION בזמן build',
      'תיקון imports חסרים ב-quiz-view.js (10+ פונקציות)'
    ],
    '9.48': [
      '39 תמונות נוספות קושרו לשאלות (Pnimit 7.9% → 10.5% צפיפות)',
      'Oct24 אלבום: 22 עמודים הועלו ל-Supabase, 18 שאלות עם תמונה כעת',
      'Jun25: 3 תמונות חדשות (שאלות 124, 136, 138)',
      'May24: 12 תמונות מ-orphaned uploads קושרו',
      'Jun23: 5 תמונות מ-orphaned uploads קושרו (ECG, פריחות, ספירומטריה, CXR+ECG)'
    ],
    '9.47': [
      'Leaderboard: מיון לפי דיוק אמיתי (accuracy) במקום readiness',
      'Leaderboard: שליפת accuracy מ-Supabase (generated column)',
      'ניקוי Supabase: הסרת שורות עם פחות מ-20 תשובות'
    ],
    '9.46': [
      'Leaderboard: הצגת דיוק אמיתי (correct/answered) במקום readiness מטעה',
      'Leaderboard: guard — דורש ≥20 תשובות + est. score תקף לפני submit',
      'Leaderboard: הקשחת קריאת שדות + res.ok check'
    ],
    '9.45': [
      'תיקון לולאת עדכון — באנר "עדכון זמין" לא נעלם',
      'תיקון מחיקת cache לפני reload'
    ],
    '9.44': [
      'ניקוי window bindings — הסרת renderTabs מיותר (17 → 16)',
      'עדכון README ו-CLAUDE.md למבנה מודולרי'
    ],
    '9.43': [
      'העברת כל התמונות המקומיות ל-Supabase',
      'כל 116 התמונות מוגשות כעת מ-Supabase'
    ],
    '9.42': [
      'קישור תמונות מבחנים ל-Supabase (Jun21 + Jun24)',
      'העברת תמונות מקומיות ל-Supabase URLs',
      '14 תמונות חדשות ממבחן יוני 2024'
    ],
'9.40':[
'🖼️ +20 image-based questions from Jun 2021 past exam (ECG, smear, CXR, CT-PE, fundoscopy, derm, echo) — 73 → 93 images (6.3%)',
'📚 +143 Harrison-based questions across 10 weak topics (Valvular, ICU, Derm, Allergy, Fluids, Pain, Periop, Tox, Onc, Vascular) — total 1452',
'🔧 Fixed 4 questions with duplicate/empty options (Q135, Q280, Q308, Q342)',
'🗑️ OSCE dead code removed, dead Med Basket/Lab/Aging CSS removed (~2.3KB)',
'🧪 Test coverage +33 — AI proxy routing, sanitization, SRS/FSRS, CSP tests',
],
'9.39':[
'🔒 XSS: sanitize AI-generated question fields in quizMeOnChapter',
'🔒 XSS: sanitize leaderboard data from Supabase',
'🐛 Cloud backup: check PATCH response status before showing success',
'🧹 Remove 7 dead functions: queueBackgroundSync, toggleAskAI, submitAskAI, copyDiagnostics, togOT, togOck, renderSyllabus',
],
'9.38':['🛡️ Fix: guarded all localStorage parses — corrupted state no longer bricks boot','🔧 Fix: user-generated questions persist across reload','🔧 Fix: service worker skips POST, uses navigate mode, no wrong JSON fallback'],
'9.37':['🔧 FSRS-4.5 extracted to shared/fsrs.js — shared engine Phase 1','📦 shared/fsrs.js loaded as external script, cached by SW','🔗 isChronicFail() now shared between apps','⚡ srScore() upgraded: fsrsRating parameter for confidence-based scheduling'],
'9.36':['🚨 Fix syntax error in getWeakTopics — app was stuck loading'],
'9.35':['🚨 Critical fix: restore data loader — app was showing blank screen','🔄 Revert accidental deletion of boot sequence, version check, background sync'],
'9.34':['🐛 Fix: calcEstScore was using 40-topic Geriatrics FREQ array instead of 24-topic EXAM_FREQ — scores now accurate','📊 Analytics key metrics row (Est. Score, Streak, Answered, Accuracy) at top of Track tab','🗺️ Topic Mastery Heatmap — clickable tiles showing per-topic accuracy','📈 SRS due alert with quick-review button','🔧 Added getStudyStreak() for accurate streak from dailyAct'],
'9.33':[
'🐛 Changelog Fix — תצוגת changelog תקינה במקום קוד גולמי',
'🐛 Quiz Fix — תיקון stats.map crash שגרם לשגיאות בכפתורים',
'🐛 IDB Init Fix — תיקון _dataPromise hoisting error'
],
'9.31':[
'📊 1,169 \u05e9\u05d0\u05dc\u05d5\u05ea \u2014 All questions tagged by 24 subspecialties',
'💊 Drugs Tab \u2014 Drug checker with ACB scores, Beers flags, STOPP interactions',
'🔒 Security \u2014 AI response sanitization for XSS protection',
'📄 Articles \u2014 10 required NEJM/Lancet articles',
'\u2705 AI Proxy \u2014 All AI features work without a personal API key'
],
'9.32':[
'🚨 Rescue Drill \u2014 Focused practice on your 3 weakest topics',
'📅 Activity Calendar \u2014 30-day question activity heatmap',
'📖 Spaced Reading \u2014 Track chapter reads + 30-day re-read reminders',
'🏆 Leaderboard \u2014 Anonymous global rankings via Supabase',
'💡 Feedback System \u2014 Submit feedback with AI acknowledgment',
'🗂️ Tab Consolidation \u2014 10 \u2192 5 tabs: Quiz, Learn, Library, Track, More',
'📋 Dynamic Changelog \u2014 Version history in help overlay'
]
};
export const SYLLABUS_VERSION='P0064-2025';
export const SYLLABUS_DATE='2025-01-01';

export const BUILD_HASH=(()=>{const d=new Date('2026-04-15T00:00:00Z');return d.toISOString().slice(0,10).replace(/-/g,'');})();

// AI proxy
export const AI_PROXY='https://toranot.netlify.app/api/claude';
export const AI_SECRET='shlav-a-mega-2026';
