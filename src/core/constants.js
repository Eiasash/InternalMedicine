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

// Supabase
export const SUPA_URL='https://krmlzwwelqvlfslwltol.supabase.co';
export const SUPA_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtybWx6d3dlbHF2bGZzbHdsdG9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NjQxMDksImV4cCI6MjA4NzU0MDEwOX0.PFSuFgHA-WBnrgs4stmloxvOORSX0CiXDPsW2dinAAQ';

// 24 subspecialty display names (P0064-2025)
export const TOPICS=['Cardiology — Coronary','Heart Failure','Arrhythmias & ECG','Valvular & Endocarditis','Hypertension','Pulmonology & VTE','Gastroenterology & Hepatology','Nephrology','Electrolytes & Acid-Base','Endocrinology & Diabetes','Hematology & Coagulation','Oncology & Screening','Infectious Disease','Rheumatology & Autoimmune','Neurology & Stroke','Critical Care & Shock','Dermatology','Allergy & Immunology','Fluids & Volume','Pain & Palliative','Perioperative','Toxicology','Clinical Approach & Diagnostics','Vascular Disease'];

// Version & changelog
export const APP_VERSION='9.62';
export const CHANGELOG={
    '9.61': [
      '⬅️ כפתור "קודמת" נוסף — אפשר לחזור לשאלה קודמת ולראות את התשובה שבחרת (לא במצב מבחן)',
      '🍎 iOS: status bar black-translucent, text-size-adjust:100% — מונע זום לא רצוי',
      '🔤 גופן הגוף Heebo-first ב-base.css'
    ],
    '9.60': [
      '🐛 הסר פרומפט "How sure are you?" שחסם את זרימת המענה — האפקרציה כעת עוברת ישר מבחירה ל-"בדוק"',
      '📏 כפתורי Why-wrong, Difficulty ו-Read-chapter: גדלים מותאמים ל-44px מינימום למגע — ניתנים ללחיצה בקלות',
      '📏 כפתורי Easy/Medium/Hard: פונט 11px (היה 9px), padding גדול יותר, flex-wrap למקרי overflow'
    ],
    '9.59': [
      '🐛 תיקון קריטי: פריסת flex אחרי מענה — Why-wrong, Read-chapter, Difficulty וכפתור הבאה היו נדחסים לעמודות בנות תו אחד בגלל display:flex ללא flex-direction:column',
      '🐛 תיקון קריטי: הסבר ה-💡 היה מראה נושא שגוי ב-21 מתוך 24 נושאים (notes.json לא מסודר לפי TOPICS[]). בניית מפה NOTES_BY_TI בעת טעינת הנתונים',
      '⬆️ כפתור הבאה ← עכשיו רוחב מלא, גובה 44px, פונט 13px מודגש — ברור לזיהוי',
      '⬆️ שורת בדוק+"לא יודע" עוטפה ב-flex-row משלה כדי לעבוד עם הפריסה החדשה'
    ],
    '9.58': [
      '🎨 SZMC Clinical Kit — token layer — sky/emerald skin via data-skin="pnimit"',
      '🔤 Self-hosted Heebo + Inter (removed Google Fonts dep, offline-ready)',
      '🛡️ CSP tightened: style-src + font-src both \'self\'-only',
      '♿ Respects prefers-reduced-motion globally'
    ],
    '9.57': [
      '🙈 מצב מבחן לא חושף תשובה עד הסוף — Mock ו-Full. האפשרות שנבחרה מודגשת, אבל ירוק/אדום/הסבר מוצגים רק בסיום. תקלה גם ב-Distractor Autopsy highlighting (פרץ דרך examMode guard).',
      '📊 Exam Trend כולל עכשיו 2023-Jun ב-OLD cohort. הטווח הוא 2020-23 מול 2024-25.',
      '🗺 Weak Spots Map: תאים עם n=1 מוצגים באפור עם תגית 1q במקום אדום מטעה. n≥2 מציג גם את מספר הניסיונות.',
      '🍎 תאימות iOS: viewport-fit=cover ו-apple-mobile-web-app-status-bar-style — תמיכה מלאה במכשירים עם notch.'
    ],
    '9.56': [
      '🔒 Dedup guard normalized-stem + cross-tag tripwire (parity with Geri v9.71).',
      '📮 Feedback reports לוכדים [hash:xxxxxxxx] — 8-char content-hash יציב לזיהוי דיווחים חוזרים.'
    ],
    '9.55': [
      '🔬 Distractor Autopsy — ALWAYS ON: after every reveal you see why each wrong answer is wrong + when it would be correct',
      'Pre-generated offline (data/distractors.json) via Claude Haiku 4.5 — works offline, zero latency',
      'AI fallback for any question without cached distractor rationale'
    ],
    '9.54': [
      'UX: "Why did I get it wrong?" (📚 👓 ⚖️ 🤦) כבר לא חוסם את כפתור "הבאה" — הפך לאופציונלי. בסוויט הקודם הפכנו את "How sure are you" לאופציונלי; עכשיו גם שורת ה-why-wrong שלמטה אופציונלית.',
      'טסט חדש: topicRefCoverage — מוודא שכל entry ב-TOPIC_REF מצביע לפרק שקיים ב-harrison_chapters.json. מונע באגי ניווט כמו זה שתוקן ב-9.53.',
      'Pre-push hook חדש: `scripts/git-hooks/pre-push` מריץ את שני בודקי innerHTML לפני כל push. התקנה ב-`npm run hooks:install`.',
      'ניקוי: הוסרה הערה ישנה על src/clock.js ב-sw.js (הבנדלר כבר מטפל).'
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
