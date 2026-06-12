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
export const HARRISON_PDF_MAP={"14":"harrison/Ch14_Pain_Pathophysiology_and_Management.pdf","15":"harrison/Ch15_Chest_Discomfort.pdf","16":"harrison/Ch16_Abdominal_Pain.pdf","17":"harrison/Ch17_Headache.pdf","18":"harrison/Ch18_Low_back_pain.pdf","20":"harrison/Ch20_Fever.pdf","22":"harrison/Ch22_Fever_of_Unknown_Origin.pdf","26":"harrison/Ch026_Neurologic_Causes_of_Weakness_and_Paralysis.pdf","30":"harrison/Ch30_Coma.pdf","39":"harrison/Ch39_Dyspnea.pdf","40":"harrison/Ch40_Cough.pdf","41":"harrison/Ch41_Hemoptysis.pdf","42":"harrison/Ch42_Hypoxia_and_Cyanosis.pdf","43":"harrison/Ch43_Edema.pdf","48":"harrison/Ch48_Nausea_Vomiting_and_Indigestion.pdf","49":"harrison/Ch49_Diarrhea_and_Constipation.pdf","50":"harrison/Ch50_Unintentional_Weight_Loss.pdf","51":"harrison/Ch51_Gastrointestinal_Bleeding.pdf","52":"harrison/Ch52_Jaundice.pdf","53":"harrison/Ch53_Abdominal_Swelling_and_Ascites.pdf","55":"harrison/Ch55_Azotemia_and_Urinary_Abnormalities.pdf","56":"harrison/Ch56_Fluid_and_Electrolyte_Disturbances.pdf","57":"harrison/Ch57_Hypercalcemia_and_Hypocalcemia.pdf","58":"harrison/Ch58_Acidosis_and_Alkalosis.pdf","66":"harrison/Ch66_Anemia_and_Polycythemia.pdf","67":"harrison/Ch67_Disorders_of_Granulocytes_and_Monocytes.pdf","69":"harrison/Ch69_Bleeding_and_Thrombosis.pdf","70":"harrison/Ch70_Enlargement_of_Lymph_Nodes_and_Spleen.pdf","79":"harrison/Ch79_Infections_in_Patients_with_Cancer.pdf","80":"harrison/Ch80_Oncologic_Emergencies.pdf","102":"harrison/Ch102_Iron_Deficiency_and_Other_Hypoproliferat.pdf","120":"harrison/Ch120_Disorders_of_Platelets_and_Vessel_Wall.pdf","121":"harrison/Ch121_Coagulation_Disorders.pdf","127":"harrison/Ch127_Approach_to_the_Acutely_Ill_Infected_Febrile_.pdf","133":"harrison/Ch133_Infective_Endocarditis.pdf","136":"harrison/Ch136_Osteomyelitis.pdf","142":"harrison/Ch142_Encephalitis.pdf","143":"harrison/Ch143_Acute_Meningitis.pdf","147":"harrison/Ch147_Infections_Acquired_in_Health_Care_Facilities.pdf","243":"harrison/Ch243_Approach_to_the_Patient_with_Possible_Cardiov.pdf","247":"harrison/Ch247_Electrocardiography.pdf","285":"harrison/Ch285_Non-ST-Segment_Elevation_Acute_Coronary_Syndr.pdf","286":"harrison/Ch286_ST-Segment_Elevation_Myocardial_Infarction.pdf","295":"harrison/Ch295_Approach_to_the_Patient_with_Disease_of_the_R.pdf","305":"harrison/Ch305_Disorders_of_the_Pleura.pdf","311":"harrison/Ch311_Approach_to_the_Patient_with_Critical_Illness.pdf","314":"harrison/Ch314_Approach_to_the_Patient_with_Shock.pdf","315":"harrison/Ch315_Sepsis_and_Septic_Shock.pdf","316":"harrison/Ch316_Cardiogenic_Shock_and_Pulmonary_Edema.pdf","317":"harrison/Ch317_Cardiovascular_Collapse,_Cardiac_Arrest,_and_.pdf","319":"harrison/Ch319_Approach_to_the_Patient_with_Renal_Disease_or.pdf","321":"harrison/Ch321_Acute_Kidney_Injury.pdf","322":"harrison/Ch322_Chronic_Kidney_Disease.pdf","332":"harrison/Ch332_Approach_to_the_Patient_with_Gastrointestinal.pdf","347":"harrison/Ch347_Approach_to_the_Patient_with_Liver_Disease.pdf","355":"harrison/Ch355_Cirrhosis_and_Its_Complications.pdf","375":"harrison/Ch375_The_Vasculitis_Syndromes.pdf","379":"harrison/Ch379_Sarcoidosis.pdf","382":"harrison/Ch382_Approach_to_Articular_and_Musculoskeletal_Dis.pdf","384":"harrison/Ch384_Gout_and_Other_Crystal-Associated_Arthropathi.pdf","387":"harrison/Ch387_Periarticular_Disorders_of_the_Extremities.pdf","388":"harrison/Ch388_Approach_to_the_Patient_with_Endocrine_Disord.pdf","433":"harrison/Ch433_Approach_to_the_Patient_with_Neurologic_Disea.pdf","436":"harrison/Ch436_Seizures_and_Epilepsy.pdf","437":"harrison/Ch437_Introduction_to_Cerebrovascular_Diseases.pdf","438":"harrison/Ch438_Ischemic_Stroke.pdf","439":"harrison/Ch439_Intracerebral_Hemorrhage.pdf","458":"harrison/Ch458_Guillain-Barr#U00e9_Syndrome_and_Other_Immune.pdf","459":"harrison/Ch459_Myasthenia_Gravis_and_Other_Diseases_of_the_N.pdf"};

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
export const APP_VERSION='10.4.52';
// CHANGELOG moved to ./changelog.js for code-splitting. Dynamically
// imported in showHelp() so the large export doesn't load in the
// critical path. Sibling of FM #78.
export const SYLLABUS_VERSION='P0064-2025';
export const SYLLABUS_DATE='2025-01-01';

// AI proxy
export const AI_PROXY='https://toranot.netlify.app/api/claude';
export const AI_SECRET='shlav-a-mega-1f97f311d307-2026';
