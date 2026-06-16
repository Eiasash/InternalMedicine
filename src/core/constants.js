// App constants — extracted from pnimit-mega.html
// Load this BEFORE the main script via <script src>

export const LS='pnimit_mega';

// IMA syllabus topic weights (approx % from P0064-2025)
// reason: overlap by design — sum=141 (>100). ECG content is intentionally
// dual-counted under both Cardiology — Coronary (ti=0) and Arrhythmias & ECG
// (ti=2); a few other clinical-overlap cells are weighted higher than a strict
// disjoint partition would allow because the IMA syllabus itself lists the
// same topic under multiple subspecialties. Do NOT normalise to 100 — the
// mock-exam weighted picker assumes these raw weights and re-deriving them
// would shift the topic mix away from the published P0064-2025 distribution.
// Test guard: tests/auditExpansion.test.js asserts sum===141 and length===24.
export const IMA_WEIGHTS=[8,7,6,5,7,10,8,7,6,8,7,6,9,6,7,5,3,3,4,4,3,3,5,4];

// Harrison 22e chapter → PDF path mapping
export const HARRISON_PDF_MAP={};

// Historical exam topic frequency weights (9 real exams, recency-weighted)
export const EXAM_FREQ=[50,45,40,30,45,60,50,40,35,50,45,35,55,35,40,30,15,15,20,20,15,15,25,20];

// Past-exam session tokens (question `t` field). Order matches filter-pill display.
// Canonical format YYYY-Mon. `2020` kept bare intentionally — the month is not
// printed on the 2020 IMA booklet available to us, so it stays unsuffixed (this
// is a documented source-data gap, not a code action item).
// NOTE: the `t` field also carries values OUTSIDE this list and that is by
// design: `Harrison` (textbook-derived Qs) and `Exam` (20 curated supplemental
// board-style Qs, each with a valid ti + st). EXAM_YEARS is only the 7 dated
// IMA sessions used for the year filter-pills; it is NOT the full tag universe.
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
export const APP_VERSION='10.4.57';
// CHANGELOG moved to ./changelog.js for code-splitting. Dynamically
// imported in showHelp() so the large export doesn't load in the
// critical path. Sibling of FM #78.
export const SYLLABUS_VERSION='P0064-2025';
export const SYLLABUS_DATE='2025-01-01';

// AI proxy
export const AI_PROXY='https://toranot.netlify.app/api/claude';
export const AI_SECRET='shlav-a-mega-1f97f311d307-2026';
