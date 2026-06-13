// CHANGELOG — split out of constants.js for code-splitting.
// Dynamically imported from showHelp() so this large export doesn't
// load in the critical path. Sibling of FM #78.
//
// IMPORTANT: drift guards (tests/changelogDrift.test.js) read this file
// directly, so the 'export const CHANGELOG={' marker must stay literal.

export const CHANGELOG = {
  '10.4.54': [
    'ui(quiz): replace the crowded Quiz filter wall with a compact summary plus an advanced Filters drawer. Visible controls are now Quiz, Mock, Full 150q, Filters, and conditional Review wrong; year/topic/source/hard/slow/weak/due/traps/NBS/timed/cover-options live in the drawer with 44px touch targets and dark-mode parity. Dormant Pomodoro, Sudden Death, and On-Call code paths/state/CSS were removed from active IM code. No question content, answer keys, explanations, source mappings, or audit queues changed. Trinity 10.4.53 to 10.4.54.',
  ],
  '10.4.53': [
    'ui(ia): align visible navigation with the shared board-app shell. Bottom tabs are Quiz, Study, Track, Settings; Study now exposes Today, Read, Notes, and Tools while legacy search, chat, cards, and more links redirect into Study or Settings. No question content, answer keys, explanations, source mappings, or audit queues changed. Trinity 10.4.52 to 10.4.53.',
  ],
  '10.4.52': [
    'ui(study): deepen the Study dashboard button cleanup. The Today Study Plan now uses classed step rows with full-width mobile tap targets instead of tiny inline Start/Open chips, Study Plan row actions use shared grid button classes, and Study Plan tiers default collapsed so the screen no longer opens as a wall of repeated action buttons. Added regression guards for daily-plan actions, Study Plan action classes, mobile tap targets, and compact tier defaults. No question content, answer keys, explanations, source mappings, or audit queues changed. Trinity 10.4.51 to 10.4.52.',
  ],
  '10.4.51': [
    'ui(quiz-mobile): keep the primary answer actions above the fixed bottom tab bar on phones. The Quiz check / give-up row is now class-driven and sticky at mobile width with extra content-bottom clearance plus dark-mode parity, so the bottom nav no longer covers the action buttons on long first-screen questions. Added regression guards for the action classes and mobile clearance CSS. No question content, answer keys, explanations, source mappings, or audit queues changed. Trinity 10.4.50 to 10.4.51.',
  ],
  '10.4.50': [
    'ui(quiz): polish Quiz filter controls after the Study/Track IA pass. Interactive filter pills now render as real buttons with pressed state, native button chrome reset, stable touch sizing, and keyboard semantics. The Due review pill is emitted only from the live due-count path, preventing duplicate Due controls in the filter row. Added regression guards for semantic filter buttons, single Due source, and pill button reset styling. No question content, answer keys, explanations, source mappings, or audit queues changed. Trinity 10.4.49 to 10.4.50.',
  ],
  '10.4.49': [
    'ui(ia): move active study workflows out of Track and into Study Today. Study now opens Today by default with plan, due review, exam-date/daily-plan, rescue drill, cheat-sheet export, reading due, bookmarks, syllabus, and journal; Track is analytics-only with progress/stats/plan/exam analytics and no Reference workflow tab. Share App Link now lives in Settings About, and visible Pomodoro / Sudden Death / On-call launch controls were removed while Mock and exam workflows remain. No question content, answer keys, explanations, or audit queues changed. Trinity 10.4.48 to 10.4.49.',
  ],
  '10.4.48': [
    'fix(track): clarify the stats donut semantics — the headline accuracy is now current question-status accuracy (correct / answered) while historical attempt accuracy remains a secondary detail, both computed from G.S.sr. Trinity 10.4.47 to 10.4.48.',
  ],
  '10.4.47': [
    'feat(track): add a Hebrew סטטיסטיקה sub-tab with a correct/wrong/unanswered progress donut and attempt accuracy computed from G.S.sr; wired through the existing Track sub-tab dispatcher and track event delegation without duplicating the heatmap or priority matrix. Trinity 10.4.46 to 10.4.47.',
  ],
  '10.4.46': [
    'ui(theme): medexams-style retheme — teal/turquoise primary (--sky #13a99c, --em #0e8c81, pnimit-skin --app-primary #0e8c81) + warm-gold accent (--amb #e8a13a) + medexams red (--red #d6453d), teal-tinted selected-answer + hover, softer 12px cards, teal focus ring. The two pnimit-skin a11y overrides (.pill.on bg + .tabs button.on text) and the skip-link moved from blue-700 to dark teal #0a5d54 (7.76:1, still AAA). No layout/markup/content change. Sibling of Geri v10.64.167 / FM. Trinity 10.4.45 to 10.4.46.',
  ],
  '10.4.45': [
    'fix(account): sync the Anthropic API key to the account at save time (#353 sibling, Geri v10.64.160). The v10.4.44 security fix removed _apikey from the cloud backup, which also severed the only WRITE path into app_users.api_key (the sync_api_key_from_backup trigger fed off backup writes) — a key saved or rotated after .44 stayed localStorage-only, so auth_login_user restored a stale or null key on the next device (the Codex P2 on #167). Now settings-save-api-key / settings-remove-api-key save locally FIRST (never network-blocked), then for logged-in users sync via the existing auth_set_api_key RPC (SECURITY DEFINER, re-auth required — password collected with window.prompt, the _handleChangePassword pattern). Cancel = device-only with explicit toast; RPC failure keeps the local save and warns; guests keep the old behavior. Empty key clears the account copy. Round-2 Codex P2s folded in: (a) the legacy backup _apikey restore in applyRestorePayload is now FILL-ONLY (a backup _apikey is pre-.44-stale by definition, so it never clobbers a present key); (b) the has-key settings state gained a logged-in-only sync-to-account button (settings-sync-api-key) so a key saved before this release can be pushed to the account without remove + re-enter. tests/apikeyAccountSync.test.js pins wiring + ordering + both P2 fixes + the .44 regression locks. Trinity 10.4.44 to 10.4.45.',
  ],
  '10.4.44': [
    'fix(security): stop cloud-syncing the Anthropic API key. backup_get/backup_set are SECURITY DEFINER with no caller-identity check, so the synced backup blob (which included _apikey) was readable by anyone who could guess a username id using only the public anon key. Since auth_login_user already returns api_key on a password-checked login, syncing it in the backup was redundant. Removed _apikey from the cloudBackup payload (_bundled) so new backups no longer carry the secret; the restore-read path stays for backward compatibility and login still restores the key, so no feature is lost. Existing rows scrubbed server-side separately. New tests/apikeyExposureGuard.test.js pins both halves. Sibling of Geri v10.64.158 / FM v1.26.1. Trinity 10.4.43 to 10.4.44.',
  ],
  '10.4.43': [
    'content(highyield): +236 AI-generated high-yield board MCQs in a NEW separate bank (data/highyield.json, tag AI-2026-hy) loaded additively by data-loader.js and labeled AI High-Yield in the quiz UI for transparency. Deliberately NOT merged into data/questions.json, so the count-lock + the cross-repo corpus-manifest/Geri-syllabus contract stay untouched (questions.json still 1556). Pipeline: scripts/gen_highyield.mjs (Toranot proxy, Harrison 22e) then scripts/verify_questions.mjs key/explanation judge (0/310 conflicts) then scripts/audit_keys_blind.mjs blind board-evidence audit (opus); 74 disagreement/low-confidence flags HELD OUT pending human key review. Trinity 10.4.42 to 10.4.43.',
  ],
  '10.4.42': [
    'chore(a11y/docs): sibling-parity polish from the 2026-06-05 audit. (1) Converted 5 hard-coded dir="rtl" containers to dir="auto" (study_plan/index.js x4, ui/quiz-view.js loading text x1) — pure-Hebrew today so zero visual change, but matches the Geri/FM a11y convention so a future English/drug-name interpolation derives its own base direction instead of inheriting forced RTL. (2) Documented the EXAM_YEARS comment: the bare 2020 token is an intentional source-data gap (month not printed on the available booklet), not a stale TODO, and the t field legitimately carries Harrison + Exam (20 curated supplemental Qs) tags outside EXAM_YEARS. 0 data/answer-key changes; 1556 unchanged. Trinity 10.4.41->10.4.42.',
  ],
  '10.4.41': [
    'fix(data): repair 4 intra-word spaced-Hebrew FRACTURES — a lone NON-prefix Hebrew letter wedged inside a word (a class the a/b detector rules missed) — verified against the source exam-booklet VISUAL renders (fitz): idx334 "צ נתורים"→"צנתורים" (catheters, Q102/2022-Jun), idx442 "לאר ת ריטיס"→"לארתריטיס" (septic arthritis, Q66/2023-Jun), idx752 "א הי"→"היא" (trazodone is the drug of choice, Q41/2025-Jun — a multiset-preserving reorder), idx860 "בס י כוי"→"בסיכוי" (ARTESIA no difference in chance, Q149/2025-Jun). All pure-despace or Hebrew-letter-multiset-preserved; 0 answer-key changes; Q count unchanged (1556). Extended spacedHebrewGuard with rule (c) — a lone word-final-form letter (ךםןףץ) is always a fractured word-final letter (zero false positives; sibling-parity with Geriatrics/FamilyMedicine). ALLOWLIST stays EMPTY. tests/fractureRepair.test.js pins the 4. Trinity 10.4.40->10.4.41.',
  ],
  '10.4.40': [
    'fix(data): RECONSTRUCT all 14 quarantined ו/ה-ambiguous + scrambled spaced-Hebrew questions from their source exam booklets (InternalMedicine/exams/) via the render-the-clean-visual-layer method (Geriatrics PR #316) — each page rendered @300–600 DPI, the clean visual Hebrew read directly, stem + every option transcribed verbatim. Repairs went beyond the flagged span where the booklet dictated: ו word-final reorders ("ו איז"→"איזו", idx 776/789/836/851/855), ה suffix backward-glue ("מחלק ה"→"מחלקה" idx 759, "באיז ה"→"באיזה" idx 833), a displaced ה ("מ ה בין טיפולים"→"מבין הטיפולים" idx 824), BIDI punctuation regrouping ("(Death Rattle)" idx 779, \'"רפליקטיבי"?\' idx 836, ע"י idx 807, period idx 851), a parser-bleed (idx 851 o[3] "Prednisone שאלות על מאמרים"→"Prednisone" — a section header had merged into the option), and a letter scramble (idx 1544 o[2] "י לי ע ת"→"עליית"). idx 836 keeps "חיוביות" exactly as the booklet prints it (visual wins over grammar). Answer keys (c) UNCHANGED for all 14; Hebrew-letter multiset preserved everywhere except the 851 bleed; Q count unchanged (1556). spacedHebrewGuard ALLOWLIST now EMPTY — the dataset is fully clean of spaced-Hebrew. Trinity 10.4.39->10.4.40.',
  ],
  '10.4.39': [
    'fix(data): repair 11 more intra-word spaced-Hebrew questions via surgical PURE de-spacing — a single UNAMBIGUOUS Hebrew prefix (ב/ל/מ/כ) cleaved from its word, e.g. "ב טיפול"→"בטיפול", "מ בין"→"מבין", "ל גרום"→"לגרום". Provably space-only: 0 character changes, 0 answer-key changes, Q count unchanged (1556). idx 84/205/398/413/517/714/723/761/834/860/861. Surfaced by Codex IM #157 P2 — the prior >=2-consecutive-singles detector missed single-prefix splits; tests/spacedHebrewGuard.test.js now flags both patterns. Only ב/ל/מ/כ are auto-glued: ו and ה are AMBIGUOUS (ו can be word-final, e.g. "ו איז"=split of "איזו"; ה can be a SUFFIX, e.g. "מחלק ה"→"מחלקה", "באיז ה"→"באיזה") so gluing them forward makes non-words — Codex IM #158 P2 caught three. The 14 ו/ה-ambiguous + scrambled cases (451/499/743/759/776/779/789/807/824/833/836/851/855/1544) are QUARANTINED for source-PDF reconstruction + sign-off (Geri #316). Trinity 10.4.38->10.4.39.',
  ],
  '10.4.38': [
    'fix(data): repair intra-word spaced-Hebrew (PDF/BIDI extraction artifact) in 3 questions via surgical PURE de-spacing — only spaces removed, 0 character changes, 0 answer-key (c) changes: idx 415 "ציטוגנטי ו ת"→"ציטוגנטיות", idx 743 "מ י ימת"→"מיימת", idx 800 "ת ו פע ו ת"→"תופעות" + "ל טיפול"→"לטיפול". New tests/spacedHebrewGuard.test.js ratchet (ported from Geriatrics v10.64.145) flags any future spaced-Hebrew. 3 entangled cases (idx 807 \'ע י\'→\'ע"י\', 824 \'מ ה בין\'→\'מבין\', 1544 scrambled letters before "נוגדנים") are QUARANTINED in the guard allowlist pending reconstruction from the source exam PDFs (InternalMedicine/exams/) — a verbatim-source read needing sign-off, like Geriatrics #316. Question count unchanged (1556).',
  ],
  '10.4.37': [
    'fix(dark): core content was invisible in dark mode. The Harrison in-app reader prose, study notes, flashcard fronts, and section headings hardcode a dark inline color (#1e293b/#0f172a) that collides 1:1 with the dark `.card`/`.fc`/body background → text colour == background → invisible. A light-island scan (hunting hardcoded *light* backgrounds) structurally cannot see this inverse bug, so the 2026-05-31 dark-mode audit missed it (it was live since long before). theme.css now rescues the hardcoded dark inline colours to light text under `body.dark`, with `:not([style*=background])` skipping legitimate light-islands (code blocks, note editors, overlays). Verified on the live deployed reader (real chapter prose flips #1e293b→#e2e8f0). Suite-wide P1; companion to FamilyMedicine v1.25.6 + Geriatrics.',
  ],
  '10.4.36': [
    'chore: code hygiene — (1) the toast helper used the invalid CSS `direction:auto` (no such keyword → the declaration is dropped → English toasts inherited the page RTL); replaced with `unicode-bidi:plaintext`. (2) the loading skeleton referenced undefined `--fg2` / `--fg3` CSS custom properties (invalid color → dropped); replaced with literal slate. (3) removed the frozen BUILD_HASH constant (hardcoded to 2026-04-15, shown as a misleading "build 20260415" in Settings) — the app version already identifies the build. From the 2026-05-31 read-only audit.',
  ],
  '10.4.35': [
    'fix(events): handler hygiene — killed the #ct double-fire class. All five initXxxEvents bind to the same #ct container, so any data-action handled in two of them fired twice per click (outcome order-dependent). Renamed the library "jump to quiz by year" action (filter-year -> goto-quiz-year) so it no longer collides with the quiz year-filter toggle; removed the redundant duplicate handlers in track-view (share-app / dismiss / start-mini-exam — the quiz-view and app.js body listeners already catch them via bubbling); and removed 4 dead handler cases never emitted (submit-report, ai-autopsy, toggle-autopsy, goto-quiz-topic). New delegationCollision.test.js guards that no data-action is handled in >1 init. From the 2026-05-31 read-only audit.',
  ],
  '10.4.34': [
    'fix(dark): dark-mode light-island fixes — several surfaces shipped inline light backgrounds (#fff / #fef2f2 / #fffbeb) that overrode body.dark .card or inherited a light bg, so in dark mode they rendered as bright islands: the general-notes textarea + panel, the per-question note cards (More tab), the "questions due" alert (Track tab), and the chat error bubble. Added body.dark overrides in theme.css (with gnotes-panel / qnote-card / due-alert class hooks), matching the existing v10.4.2 attribute-selector idiom. From the 2026-05-31 read-only audit.',
  ],
  '10.4.33': [
    'fix(bidi): Harrison reader renders English chapter prose/titles LTR — the chapter title, section headings, and body <p> carried no dir, so English text inherited the page dir="rtl" (right-anchored, justify-from-right, punctuation/number reordering). Added dir="auto" + unicode-bidi:plaintext (text-align:start on the prose) so each block derives its own base direction from content — English now reads left-to-right. From the 2026-05-31 read-only audit.',
  ],
  '10.4.32': [
    'a11y: accessible names for icon-only controls — the image-remove ✕ button (data-action=remove-img) gained aria-label/title="הסר תמונה" (it deletes the attached question image; previously announced only as "✕"), and the two unlabeled ⓘ tooltip toggles in the quiz builder (cover-answers + 90s-timer) gained aria-labels, matching the sudden-death / pomodoro ⓘ siblings that were already labeled. From the 2026-05-31 read-only audit.',
  ],
  '10.4.31': [
    'fix(ui): sticky header restored — removed the inline style="position:relative" on the .hdr div that was overriding the stylesheet .hdr{position:sticky;top:0}. The relative positioning was a leftover from the v10.4.28 flexbox refactor (it was needed when .dm-btn used position:absolute; .dm-btn is now position:static, so the inline relative was both unnecessary and harmful). The toolbar (dark/settings/help/account) now stays pinned while scrolling a long quiz+explanation page. From the 2026-05-31 read-only audit.',
  ],
  '10.4.30': [
    'fix(ref): source-link wrong-chapter fix — 6 topics (Hypertension, Dermatology, Allergy/Immunology, Perioperative, Toxicology, Vascular) had TOPIC_REF.ch=56 (Fluid & Electrolyte) — a placeholder unrelated to the topic — so the "📖 Source" chip + "read chapter" button + daily-plan "Open" opened the WRONG Harrison chapter on ~300 questions. The in-app reader holds only a 69-chapter curated subset with no covering chapter for these 6 topics, so per "no source > wrong source" the refs were REMOVED (resolveSource→null → no chip) rather than re-pointed to another guess. The correct ch:56 topics (Electrolytes, Fluids/Volume) are unchanged. From the 2026-05-31 read-only audit. No question content touched.',
  ],
  '10.4.29': [
    '⚡ ביצועים: הוסר preload מיותר של shared/fsrs.js שגרם לאזהרת "preloaded but not used" ×4 בכל טעינה בקונסול. הסקריפט החוסם שמטעין את fsrs.js וסדר הטעינה (fsrsLoadOrder) נשמרו ללא שינוי; הקונסול נקי מאזהרות.',
  ],
  '10.4.28': [
    '🧱 הכותרת נבנתה מחדש (flexbox) — אייקוני הכלים (חשבון / עזרה / הגדרות / מצב כהה) עברו משכבה אבסולוטית לשורת flex, כך שאינם חופפים עוד לכותרת "Pnimit Mega" ולשורת התאריך/גרסה.',
  ],
  '10.4.27': [
    'fix(data): q137 (microcytic-anemia vignette, idx 137) had a duplicate answer option — both option C and option D read Thalassemia Minor. Replaced option C with Anemia of chronic disease so all four options are distinct; the correct answer is unchanged (Thalassemia Minor). No other questions touched.',
  ],
  '10.4.26': [
    'תוקן באג קריטי שגרם לקריסה (is not a function) בכפתור בדוק ובחישובי מנוע החזרה FSRS. ספריית fsrs.js המשותפת נטענה בעיכוב ורצה אחרי קוד האפליקציה במקום לפניו, כך שהפונקציות של מנוע החזרה לא היו זמינות. כעת היא נטענת לפני האפליקציה. תיקון זהה לזה שבוצע באפליקציית Mishpacha.',
  ],
  '10.4.25': [
    'Silent auto-update — fixes the stale-bundle trap where a new version label appeared (HTML served network-first) while old cache-first JS/CSS kept running. A freshly-installed service worker now auto-activates (skipWaiting) while an old one controls the page, and the resulting controllerchange triggers one automatic reload onto the new assets. Guards: no reload on first install, and no reload loop. The manual update banner is kept only as a fallback. Ported from the FM fix (mishpacha v1.21.38). One last manual update lands users on this version, then every future update is automatic.',
  ],
  '10.4.24': [
    '♿ Header toolbar dark-on-dark fix — 3 of 4 `.dm-btn` toolbar buttons (🌓 ⚙️ ❓) were rendering at default browser ButtonText color (typically `rgb(0,0,0)`) on the .hdr dark slate gradient (#0f172a→#1e293b). Contrast ~1:1 → invisible buttons. Only the 👤 account button had explicit `color:#fff` inline. Browser-tested 2026-05-10 at 390×844 via Playwright. Fix: added `color:#fff; background:rgba(255,255,255,0.12); border-radius:50%; width:32px; height:32px;` to the .dm-btn rule + a `:hover` opacity bump. Sibling-aligned with Geri v10.64.90 (slate-800 text on slate-800 gradient end-stop) + FM v1.21.27 (PR shipped alongside). Trinity bumped 10.4.23 → 10.4.24 (3-part APP_VERSION + sw.js, 4-part package.json per IM convention).',
  ],
  '10.4.23': [
    '♿ Mobile out-of-bounds fix — `.skip-link` no longer uses `left:-9999px`. Browser-tested 2026-05-10 against the FM/Geri sibling at 390×844 viewport via Playwright: legacy off-screen-positioning inflated `documentElement.scrollWidth` to 10385px (= 9999 abs(x) + 386 body width, exact). Body had `overflow-x:hidden` so users did not see lateral scroll, but `<html>` had `overflow-x:visible` so the phantom width still affected Lighthouse audits, pinch-zoom math, and any JS reading scrollWidth. Switched `src/styles/utilities.css` to the WCAG canonical visually-hidden clip pattern (`width:1px; height:1px; clip:rect(0,0,0,0); overflow:hidden; white-space:nowrap`); `:focus` restores `width:auto; height:auto; clip:auto`. Sibling-aligned with Geri v10.64.89 + FM v1.21.26. 3 new regression guards in tests/a11yContrast2026-05-10.test.js asserting (1) no `left:-\\d{3,}` literal in `.skip-link` rule, (2) `clip:rect(0,0,0,0)` present, (3) `:focus` restores width/height/clip. Trinity: APP_VERSION + sw.js + package.json (4-part) all aligned at 10.4.23.',
  ],
  '10.4.22': [
    '♿ Accessibility — v10.4.21 follow-up clearing 5 residual contrast violations. Three minimum-code edits: (1) ✎ note + ☆ bookmark button color slate-500 (#64748b) → slate-600 (#475569) when in unset state — was 4.34:1 against slate-100 bg, now 6.04:1 (AAA). Set states (note exists / bookmarked) unchanged. (2) Pnimit-skin scoped override `html[data-skin="pnimit"] .tabs button.on { color: #1d4ed8 }` — selected bottom-tab text was sky-500 #3b82f6 at 4.71:1 hairline; blue-700 hits 8.6:1 (AAA). (3) Pnimit-skin scoped override `html[data-skin="pnimit"] .pill.on { background: #1d4ed8 }` — selected pill bg was sky-500 paired with white text at 3.81:1, fails AA; blue-700 with white = 8.6:1 (AAA). Both scoped overrides preserve dark mode via body.dark[data-skin="pnimit"] fallback to --app-primary (sky-blue stays as accent on dark slate, fine). Trinity bumped 10.4.21 → 10.4.22. Closes IM a11y campaign at 0 actionable contrast violations on the home screen.',
  ],
  '10.4.21': [
    '♿ Accessibility — port of Geri v10.64.82-87 + FM v1.21.20-21 a11y patterns to IM. Live playwright re-audit on v10.4.20 found 26 contrast violations (gradient-blindspot dm-btn false positives excluded). Ten minimum-code edits: (1) <html dir="rtl"> added (was lang="he" without dir). (2) Skip-link bg #3b82f6 → #2563eb (3.68→4.78:1 AA). (3) .hdr p clock color #64748b → #cbd5e1 (slate-500 on dark gradient ~3:1 → slate-300 ~12:1). (4) .tabs button:not(.on) color #94a3b8 → #64748b (slate-400 on white 2.69:1 → slate-500 4.65:1 AA). (5) #headerVer inline color #475569 → #cbd5e1 (slate-600 on dark gradient ~2:1 → slate-300 ~12:1). (6) .tt-icon was bg slate-200 (#e2e8f0) + color slate-500 (3.77:1) → bg slate-300 (#cbd5e1) + color slate-700 (#475569) at 5.65:1 AA. (7) Quiz counter inline `<span style="color:#94a3b8">${qi+1}/${pool.length}` → #64748b (line ~333). (8) Stats wrapper inline color:#94a3b8 → #64748b on the ✅qOk ❌qNo 📊pct row (line ~501). (9) "👁 לא יודע" give-up button color #d97706 → #92400e (amber-600 on orange-100 ~2.9:1 → amber-800 6.89:1 AAA). (10) "💀 Sudden Death" button color #dc2626 → #b91c1c (red-600 on red-50 4.41:1 → red-700 6.27:1 AA). Trinity bumped 10.4.20 → 10.4.21 (3-part APP_VERSION + sw.js, 4-part package.json per IM convention). Sibling-fork heads-up: this completes the medical-PWA a11y trio (Geri v10.64.82-87, FM v1.21.20-21, IM v10.4.21).',
  ],
  '10.4.20': [
    '🪟 window.submitLeaderboardScore exposed alongside existing window.showLeaderboard — enables programmatic submit (chaos-bot leaderboard hook) without going through the open-modal path that returns early when #leaderboard-box DOM is not mounted. Sibling-aligned with mishpacha v1.21.18.',
  ],
  '10.4.19': [
    '🏆 Leaderboard write goes through SECURITY DEFINER RPC (pnimit_leaderboard_upsert). Direct-POST path was working (table accepts ISO ts via timestamptz auto-cast) but vulnerable to the sb_publishable_* key + RLS failure mode that already broke backups (Track-Q precedent in Geri). RPC bypasses RLS. accuracy is GENERATED ALWAYS in the table schema and is computed automatically — RPC must NOT assign it. Sibling-aligned with mishpacha/shlav RPCs.',
  ],
  '10.4.18': [
    '🛡️ Auth-error UX — _handleChangePassword no longer renders bare `שגיאה`. Maps invalid_password/invalid_credentials → "סיסמה ישנה שגויה", weak_password → bilingual hint, network/bad_response → networking msg with optional server message in parens. Unknown codes still surface code+message (`שגיאה (X): Y`) so users can self-diagnose. Cross-port from ward-helper PR #100 (v1.39.13) — sibling auth UIs share the same flat RPC response shape so the pattern transplants cleanly. No breadcrumb infra in this repo, so the wh `changePassword.start/.ok/.err` traces are intentionally omitted.',
  ],
  '10.4.17': [
    '🔑 _handleLogin reads api_key from auth_login_user response — saves a cloudRestore round-trip on flaky networks. Companion to the 2026-05-06 Supabase migration that added api_key column to app_users + auto-sync trigger from cloudBackup writes. _handleLogin now calls setApiKey(r.api_key) on successful login, AFTER setAuthSession (typeof guard for backwards compat with older RPC versions). Empty string clears (parity with backup-payload-based path which still works in parallel). Sibling-paired with Geri v10.64.50 / Mishpacha v1.21.14 — all three apps share the auth_login_user RPC contract on Supabase project krmlzwwelqvlfslwltol.',
  ],
  '10.4.16': [
    "🛡️ Pre-emptive defensive toLowerCase guards in src/ui/more-view.js. The FM 7-hour chaos run on 2026-05-05 caught 4,890 pageerrors from item.q.toLowerCase()/n.topic.toLowerCase()/d.name.toLowerCase() crashes when any data record had a missing field. Pre-emptively wrapped the same-shape search code with (field||'').toLowerCase() before chaos hits IM. Sibling-shared with FM v1.21.13 (a). One bad data record poisoned every keystroke in FM; this defense ensures IM cannot regress the same way.",
  ],
  '10.4.15': [
    '🐛 P0 fix — startTimedQ ReferenceError in engine.js. The setTimeout closure called bare startTimedQ but engine.js does not import it; on tab-switch + return the timed-quiz countdown threw ReferenceError silently, leaving the question frozen. Fix: bind startTimedQ on G in app.js after import, replace setTimeout(startTimedQ, 100) with setTimeout(()=>G.startTimedQ&&G.startTimedQ(), 100). Same fix shipped sibling-paired in FM v1.21.13 (c).',
  ],
  '10.4.14': [
    '☁️ Cloud-sync API key with user account — Anthropic API key (pnimit_apikey localStorage) is now included in the cloudBackup() payload sent via backup_set RPC, and restored client-side in applyRestorePayload() during cloudRestore / post-login auto-restore. Effect: log in on a new device → API key arrives with the rest of your progress, no manual re-entry. Backwards compat: legacy backup rows without _apikey are ignored (typeof rowData._apikey === "string" guard) so existing users see no behavior change until their next backup. Sibling-paired with Geri v10.64.48 / Mishpacha v1.21.12.',
  ],
  '10.4.13': [
    '☁️ Cloud backup 401 truly fixed — Track-Q sibling propagation. v10.4.12 made the 401 toast actionable (route + focus); this release fixes the root cause. Phase 2 (2026-04-29) migrated reads to SECURITY DEFINER RPC backup_get but left writes on direct POST /rest/v1/pnimit_backups. The new sb_publishable_* key format interacts differently with RLS than the legacy anon JWT — direct INSERTs return 401/PG-42501 even with permissive policies. v10.4.12 misdiagnosed this as "user-scoped ids require auth"; actually a key-format/role-context regression. Same backup_set SECURITY DEFINER RPC that fixed Geriatrics v10.64.42 (deployed in shared Supabase project krmlzwwelqvlfslwltol) — client now POSTs to /rest/v1/rpc/backup_set with p_app:"pnimit". Server-side now() eliminates client clock-skew back-dates. Tested e2e: 200 OK + correct read-back via existing backup_get path.',
  ],
  '10.4.12': [
    '🩹 Supabase auth UX — 3 mobile-session bugs from 2026-05-03 debug report fixed.',
    '   • cloudBackup 401 silent failure — user tapped backup 5× expecting feedback; got nothing because RLS rejection was swallowed. Now toasts "❌ נדרשת התחברות לחשבון לגיבוי לענן / Login required for cloud backup" + routes to More tab and focuses login field. 401 branch added BEFORE the generic else (the 409 fallback was already removed in v10.4.11 with merge-duplicates).',
    '   • API-key vs Supabase-auth confusion — user entered Anthropic API key thinking it would enable cloud backup. Settings overlay now has explicit section headers: "👤 חשבון לגיבוי לענן (Account — for cloud backup)" above the auth controls; "🔑 מפתח API ל-AI (for AI features only — לא נדרש לגיבוי)" above the key input. Visual disambiguation, no auth-flow refactor.',
    '   • Feedback POST 400 — payload/schema mismatch on pnimit_feedback. Now sends BOTH column shapes ({type,text,ts,version,uid} sibling-canonical + {message,app_version} legacy) so the table accepts whichever it has, plus toast on non-OK response: "❌ שליחת המשוב נכשלה / Feedback submission failed". Cleaner schema audit deferred — actual table columns not in repo SQL (only the schema-rename migration is).',
  ],
  '10.4.11': [
    '🩹 Citation audit (2 SEVERE) — staged canonical Harrison 22e TOC (505 chapters) at data/harrison_22e_toc.json (mirror of Geri PR #146). Caught 2 transposed Ch # citations missed by curator: idx=1 (PUD): ch.317 "Cardiac Arrest" → ch.335 "Peptic Ulcer Disease and Related Disorders" (the v10.4.5 Whipple→Crohn fix landed the right answer with the wrong chapter number). idx=9 (Tocilizumab/RA): ch.354 "MASLD/Steatohepatitis" → ch.370 "Rheumatoid Arthritis". Other 21 cited Harrison chapters validated against canonical TOC.',
    '🛡️ CI guards (3 new in tests/textbookChapters.test.js) — every Harrison Ch cited in q.e/q.q/q.ref must exist in harrison_22e_toc.json (catches OOB and unknown); titled citations "Ch X — TITLE" must share ≥1 strong (4+ char, non-stopword) token with canonical title (catches transpositions); same Ch # cited across questions must carry consistent title (catches drift).',
    '🧰 Chaos hardening — clipboard.writeText calls in src/ui/app.js (shareQ, shareApp) wrapped with .catch() to silence iOS Safari NotAllowedError when called outside user gesture; setSelectionRange in app.js focus-restore guarded with try/catch (range/date/checkbox inputs throw); cloud.js cloudBackup POST→409→PATCH retry chain replaced with single atomic POST + Prefer: resolution=merge-duplicates header (race-free upsert).',
  ],
  '10.4.10': [
    '🔤 remapExplanationLetters lookahead generalized — broader `(?=[^א-ת]|$)` pattern from FM v1.21.8 / Geri v10.64.23. Catches "תשובה אcorrect" form (Hebrew letter directly followed by ASCII letter) that v10.4.9\'s narrower char class missed. 2 new regression tests.',
  ],
  '10.4.9': [
    "🔤 remapExplanationLetters fix — explanations referencing options as bare labels (`**א' שגויה**`, `ב' נכונה`) were not remapped after option shuffle, only the explicit `תשובה X'` form was. After shuffle, users saw wrong letter cross-references in the per-option breakdown. Single-pass regex with two-branch alternation now handles both forms; mid-word gershayim (e.g. `מג'ורי`) preserved via lookbehind. Same bug + fix as Geriatrics v10.64.22 (where it was first reported by user). 7 new regression tests in tests/remapExplanationLetters.test.js.",
  ],
  '10.4.8': [
    '🎯 First structured exam-key audit for IM — built dataset→IMA-PDF Q-num mapping using the 2026-05-03 cross-specialty bundle parser as candidate source (token-overlap scoring, ported from Geri v3 augmenter). Mapped 673 of 947 IMA-tagged Qs (71%; remaining 274 are extreme curator paraphrases or sessions where the bundle parser had lower extraction success).',
    '✅ 24 c_accept additions — questions where IMA accepted multiple answers post-appeal (e.g. "א ג", "ג ד") but dataset only had c set. Now correctly accepts either letter. Examples: idx=17 (2020 qn=19) → c_accept=[0,2]; idx=1531 (2024-Oct qn=16, "ב ג ד") → c_accept=[1,2,3].',
    '✅ 4 voided questions (ALL_ACCEPTED) — sessions where the IMA published "all answers accepted" post-appeal. Set c_accept to all option indices so users get marked correct on any pick. Affected: idx=225 (2021-Jun qn=141), idx=337 (2022-Jun qn=105), idx=703 (2024-Oct qn=91), idx=752 (2025-Jun qn=41).',
    '📋 92 single-accept disagreements logged but NOT auto-flipped — per the Geri curator-override pattern (94 c_wrong cases there were deliberate overrides where dataset is medically more correct than IMA). Saved to .audit_logs/im_audit.json for future hand-review.',
  ],
  '10.4.6': [
    '⚡ LCP perf — preload של data/questions.json בעת HTML-parse (link rel=preload as=fetch crossorigin) + skeleton card ב-renderQuiz כש-QZ עדיין נטען. ה-preload מקדים את ה-fetch של data-loader, וה-skeleton נועל את LCP element ב-FCP במקום להתנדנד כשהשאלה האמיתית מוחלפת. ה-`crossorigin` חובה ל-`as=fetch` גם same-origin, אחרת ה-preload יושב בדלי-cache שונה וה-runtime fetch מתעלם ממנו. צפוי mobile LCP ירידה של ~0.5-1.5s. Mirror של Geriatrics v10.63.7.',
    '🪝 Internal — אין שינוי ב-shared/fsrs.js (md5 cea66a0435… byte-identical), אין שינוי ב-engine, ב-data, או ב-tests. שינויים בלבד: pnimit-mega.html (preload tag), src/ui/quiz-view.js (skeleton early-return).',
  ],
  '10.4.5': [
    "🩹 תיקון תוכן (3 SEVERE) — IDX 1 (PUD ללא H. pylori/NSAID): תוקן Whipple→Crohn לפי Harrison 22e ch.317. IDX 8 (CPAP adherence): תוקן 60-70%→40-60% בהסבר (לפי הספרות העדכנית). IDX 9 (RA mechanism): נכתב מחדש ה-explanation להגן על IL-6 receptor (אופציה ב') במקום IL-2 (סתירה פנימית קודמת בין c=1 ל-e).",
    '🛡️ Internal — אין שינוי ב-engine, ב-shared/fsrs.js או ב-tests. תיקון תוכן בלבד ב-data/questions.json (idx 1, 8, 9).',
  ],
  '10.4.4': [
    '📝 Annotate — `IMA_WEIGHTS` constant הוסיף הסבר מפורט (8 שורות) על ה-overlap-by-design: sum=141 בכוונה, ECG dual-counted (ti=0 Cardiology + ti=2 Arrhythmias), do-NOT-normalise. מטרה: מתחזקים עתידיים לא יחשבו שזה bug ויתקנו ל-100. Mirror של ה-comment ב-tests/auditExpansion.test.js שמאמת sum===141.',
    '🧪 Tests — נוסף `tests/auditR2Expansion.test.js` (38 בדיקות, 12 suites) המכסה: buildMockExamPool pairwise ordering · multi-tag intersection (year+topic) · heDir bidi numerics + 25%-threshold boundary · sanitize XSS escape (5 chars) + falsy-input contract · fmtT boundary (00:00 / 59:59 / 1:00:00 / 3:00:00 mock-exam) · isMetaOption mixed-language (Heb/Eng "all of the above") · getOptShuffle deterministic seeding + meta-pin invariant · remapExplanationLetters identity + non-letter no-op · isOk c_accept array support + null defense · backup-restore malformed/partial/version-drift/PROTO_BLOCKLIST extended · sw.js cache-name + activate-eviction + skipWaiting invariants · LS namespace immutability + 9.76 schema-scar guard · IMA_WEIGHTS sum===141 lock. סך הכל: 34 → 35 קבצי בדיקה, 654 → 692 בדיקות.',
    '🪝 Internal — אין שינוי בלוגיקה. אין שינוי ב-shared/fsrs.js (LF-md5 cea66a0435be626eda9c1bf120d2625c, byte-identical עם Geriatrics/FamilyMedicine).',
  ],
  '10.4.3': [
    '🐛 Fix — `HARRISON_PDF_MAP[458]` — הנתיב כלל escape sequence לא חוקי `%23U00e9` (URL-encoded #). הקובץ בפועל הוא `Ch458_Guillain-Barr#U00e9_Syndrome_and_Other_Immune.pdf` (Windows-safe surrogate notation). הכפתור "📖 Open Harrison Ch 458" החזיר 404 שקט. תוקן.',
    '🧪 Tests — נוסף `tests/auditExpansion.test.js` (28 בדיקות) המכסה: 24-topic contract (TOPICS/EXAM_FREQ/IMA_WEIGHTS), HARRISON_PDF_MAP integrity (כל PDF קיים), שומרי URL-encoded leak, 7-tag exam-mode coverage, IMA-bias mock-exam distribution, APP_VERSION trinity, 9.76 backup→restore regression. סך הכל: 33 → 34 קבצי בדיקה, 626 → 654 בדיקות.',
    '🪝 Internal — אין שינוי בלוגיקה. אין שינוי ב-shared/fsrs.js.',
  ],
  '10.4.2': [
    '🎨 תיקון Dark Mode לרכיבי תמונה — Pnimit מציגה 162 שאלות עם תמונות (כולן זמינות ב-Supabase). ה-render עושה שימוש ב-inline styles עם צבעי בהיר בלבד: גבול תמונה `#e2e8f0` (כמעט בלתי-נראה ברקע כהה), כפתור "📷 Attach Image" ב-`#f1f5f9` עם טקסט `#64748b` (כל-קל מדי על דפים כהים), כפתור הסרה (✕) על רקע `rgba(0,0,0,.6)` שנבלע ב-Dark Mode, וכפתור "✓ מאומת" של imgDep בכתום בהיר בלבד.',
    '🪝 התיקון: 5 כללי CSS חדשים ב-theme.css עם attribute selectors (`img[data-action="view-img"]`, `[data-action="upload-img"]`, `[data-action="remove-img"]`, `[data-action="mark-verified"]`) ועם `!important` כדי לגבור על inline styles. אין שינוי בקוד JS, אין שינוי בנתונים. אין הקטנת default contrast במצב Light.',
    'ℹ️ Background — אותו class-of-bug כש-FM v1.15.0 → v1.21.0: רכיבים שמשתמשים ב-inline styles עוקפים את design tokens / `body.dark` selectors, ויוצרים עיוורון ב-Dark Mode. Geri כבר נקייה (משתמשת ב-`rgb(var(--brd))`). FM נקייה (post-v1.20.0 class-based). Pnimit השלימה מעגל היום.',
  ],
  '10.4.1': [
    '🛡️ Defensive — `<html data-theme="light">` נקבע כברירת מחדל סטטית בקובץ HTML. רקע: `shared/tokens.css` כולל `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ... } }` שעלול לשנות את ערכי ה-CSS variables כש-OS המשתמש במצב כהה והדף לא הצהיר במפורש על data-theme. כיום Pnimit לא קורא את design tokens (Pnimit עדיין משתמש ב-body.dark + theme.css הישן), אז אין באג גלוי — אבל ההגנה מונעת רגרסיה אם רכיב עתידי יעבור ל-tokens (כפי שקרה ב-FM v1.15.0→v1.21.0). אין שינוי בלוגיקה, אין שינוי ב-shared/tokens.css. Mirror של FM v1.21.0.',
  ],
  '10.4.0': [
    '☁️ Auto-restore-on-login — מתחבר במכשיר חדש שאין בו עדיין נתונים? אנחנו מציעים לשחזר אוטומטית מהענן (תיבת דו-שיח אחת, שתי כפתורים: "שחזר" / "לא עכשיו"). הצעה מופיעה רק כש-(א) זה login, לא register; (ב) המכשיר ריק לחלוטין — qOk+qNo===0 ואין נתוני SR; (ג) קיים גיבוי בענן עבור שם המשתמש; (ד) לא ביקשנו את אותו דבר במכשיר הזה בעבר. סימון "לא להציג שוב" נשמר ב-localStorage לפי (מכשיר, שם משתמש), אז ההפעלה היא חד-פעמית גם אם בוחרים "לא עכשיו".',
    "🔌 Auth events — auth.js פולט כעת אירועי `pnimit:auth` (CustomEvent על `window`) + API פנימי `subscribeAuthEvents(handler)`. פעולות: login / register / logout / change-password. מאפשר למודולים אחרים להגיב למעברי auth ללא תלות ב-UI. Mirror של ward-helper v1.32.0's `subscribeAuthChanges` ושל Mishpacha v1.18.0 — שמירה על עקביות ה-API בין 4 ה-PWAs.",
    '🪝 Internal — `cloud.js` מייצא כעת `peekCloudBackup()` (RPC backup_get ללא UI) ו-`applyRestorePayload(rowData)` (מיזוג G.S עם הגנת prototype-pollution דרך `filterRestorePayload`). `cloudRestore()` עבר refactor להשתמש ב-`applyRestorePayload`. New module `src/features/post-login-restore.js` + new test `tests/postLoginRestore.test.js` (14 cases). אין שינוי ב-shared/fsrs.js.',
  ],
  '10.3.0': [
    '⚙️ איחוד הגדרות — כל ההגדרות מתאחדות בעמוד מסך-מלא אחד שנפתח מאייקון ה-⚙️ בכותרת. סדר ה-sections: Account · Study Plan · Theme · 🔔 Reminders · API Key · Data · Feedback · About (סך הכל 8).',
    '   • 📅 Study Plan generator + 🔔 FSRS reminder toggle עברו מ-More→Settings ל-overlay (לא יותר שני "בתי הגדרות").',
    '   • צ׳יפ החשבון בכותרת והאייקון ⚙️ פותחים עכשיו את אותו overlay (לפני כן צ׳יפ החשבון קפץ ל-More→Settings).',
    '   • More tab: 5 → 4 sub-tabs. הוסר Settings sub-tab.',
    '   • ה-overlay מאוחד מסך-מלא בכל viewport (הוסר @media min-width:600px שהציג כרטיס מרוכז של 560px במחשב).',
    '🪝 Internal — toggleNotifOptIn + renderSettings עברו מ-more-view.js (הקובץ קוצר ב-69 שורות) ל-settings-overlay.js. regressionGuards.test.js retargeted. אין שינוי ב-shared/fsrs.js.',
  ],
  '10.2.1': [
    '♿ Accessibility — חמישה תיקוני A11Y מבדיקת Lighthouse על האתר החי:',
    '   • meta-viewport: הוסר user-scalable=no + maximum-scale=1.0 → המשתמש יכול עכשיו לזום (חובה לפי תקני נגישות).',
    '   • role="tablist" קיבל role="tab" + aria-selected על כל child button ב-renderTabs() — סטטוס נבחרות נגיש לקוראי-מסך.',
    '   • topic-select ב-Quiz קיבל aria-label="סנן לפי נושא".',
    '   • aria-label="Option N" השגוי הוסר מ-quiz options — הטקסט הנראה משמש כשם הנגיש (label-content-name-mismatch תוקן).',
    '   • header chip + Pomodoro button: ניגודיות צבעים מוגברת (3b82f6→1d4ed8, 64748b→475569, 059669→047857), font-size 9px→10px → AA pass.',
    '🪝 Internal — אין שינוי בלוגיקה, אין שינוי באירועים, אין שינוי ב-shared/fsrs.js. שינויי טקסט/role/ARIA בלבד.',
  ],
  '10.2.0': [
    '🧹 ניקיון סופי של רוויזיית v10 — Track→More התשנה ל-Track→Reference (📚). הקלפים שכפלו את ה-gear (API key · Data Management · Version footer · Force Update) הוסרו. הסיכום הקצר עכשיו: Spaced Reading · Bookmarks · Syllabus · Study Journal · Share · גרסה כצ׳יפ קצר.',
    '   • API key, Export/Import, Cloud Backup/Restore, Reset, Force Update — כולם ב-⚙️ → Settings.',
    '   • Track→Reference מצומצם מ-8 → 5 כרטיסי תוכן + chip גרסה.',
    '🪝 Internal — מאזיני data-action הוסרו מ-initTrackEvents (remove-api-key / save-api-key / export-progress / import-progress / cloud-backup / cloud-restore / reset-all / force-update). share-app נשאר. import unused: BUILD_HASH / LS / safeJSONParse / fmtT / getApiKey / setApiKey / IMA_WEIGHTS / HARRISON_PDF_MAP נמחקו מ-track-view.js. אין שינוי ב-shared/fsrs.js.',
  ],
  '10.1.0': [
    '🔬 Distractor Autopsy ב-front-and-center — אחרי מענה, ה-autopsy מופיע ראשון, מודגש (border 2px, shadow, font גדול יותר). זה הפיצ\'ר הייחודי של האפליקציה ("למה כל מסיח שגוי") ולא צריך להתחבא בין 4 מקורות הסבר.',
    '   המשתמש דיווח: "יש 3-4 מקורות הסבר שונים... יותר מדי מידע בפנים".',
    '📁 ההסברים האחרים (notes-based 💡 + הסבר רשמי 📝 + AI Explain 🤖) קופלו ל-<details> סגור כברירת מחדל ("📝 הסברים נוספים — לחץ להרחבה"). זמינים בלחיצה אחת, לא בפנים.',
    '🪝 Internal — שינוי סדר rendering ב-renderQuiz() אחרי isAnswered: autopsy block קודם, אחר כך accordion. אין שינוי ב-data; אין שינוי בפעולות (data-action="ai-explain" / "mark-e-verified" עדיין עובדים בתוך ה-details).',
  ],
  '10.0.0': [
    '🏛️ ארכיטקטורה מחודשת — 5 טאבים → 4. Learn (📚) הוסר; התוכן עבר ל-Library כשלושה תת-טאבים: Read / Cards / Notes.',
    '   • Read = ה-Library הקיים (Harrison reader · Articles · Past Exams) — בלי שינוי',
    '   • Cards = מועבר מ-Learn→Cards (FSRS spaced repetition) — בלי שינוי בלוגיקה',
    '   • Notes = מועבר מ-Learn→Study (Clinical Study Notes — תוכן קריאה לפי נושא)',
    "🪝 Internal — חדש G.S.libSub (default 'read'). מיגרציה: G.tab==='learn' & learnSub==='flash' → tab='lib', libSub='cards'; אחרת libSub='notes'. data/tabs.json מצומצם ל-4 entries (Quiz / Library / Track / More). תת-טאב נשמר ב-G.S.libSub. data-action=\"lib-sub\" handler ב-#ct delegation. אין שינוי ב-shared/fsrs.js.",
    '🧪 Tests — tabs.length expectations עברו 5 → 4 ב-3 בדיקות (textbookChapters, expandedDataIntegrity ×2). expected core tabs רשימה צומצמה.',
  ],
  '9.97.0': [
    '🗑️ הוסרו תת-טאבים שכפלו אפליקציות אחרות — 🧮 Calc (CrCl / CHA₂DS₂-VASc / CURB-65 / PADUA) ב-Track→More הוסר; 💊 Drug Lookup ב-Learn הוסר. ward-helper וה-formulary של שערי-צדק כבר מספקים את אותו ערך עם הקשר קליני אמיתי. נתוני G.DRUGS עדיין נטענים — חיפוש חוצה-בנק ב-More→Search ממשיך להציג תרופות.',
    "🪝 Internal — נמחקו renderCalc / calcUp / renderDrugs / drugSearch + מאזיני calc-num / calc-check / drug-search. G.S.calcVals הוסר מ-globals defaults. G.moreSub default 'calc' → 'search'. מיגרציה: G.moreSub==='calc' → 'search'; G.learnSub==='drugs' → 'study'. אין שינוי ב-shared/fsrs.js.",
  ],
  '9.96.0': [
    '⚙️ הגדרות חדשות — כפתור גלגל שיניים בכותרת פותח חלון מודאלי שמרכז: חשבון, ערכת נושא, API key, ניהול דאטה (ייצוא/ייבוא/ענן/איפוס), פידבק, אודות. סגירה ב-✕, ESC, או לחיצה ברקע. בסיס למיגרציה הבאה (#69 → להוציא Calc + Drug Lookup; #70 → איחוד Learn ל-Library).',
    '🪝 Internal — חדש src/ui/settings-overlay.js + src/styles/settings.css. ה-overlay חי מחוץ ל-#ct (ב-<div id="settings-overlay">) כך שהוא שורד G.render(). bindSettingsEvents() קוראים פעם אחת ב-boot. אין שינוי ב-shared/fsrs.js.',
  ],
  '9.95.0': [
    '🔥 הוסרו עיצובי Editorial ו-Study (סספיה) — האפליקציה כעת light + dark בלבד. כפתורים 🕯️ ו-📰 הוסרו מהכותרת. קבצי CSS שנמחקו: src/styles/editorial.css (423 שורות). כללי body.study הוסרו מ-theme.css ומה-clinical-kit הפנימי. G.S.studyMode ו-G.S.editorial הוסרו ממצב המערכת.',
    '🪝 Internal — toggleStudyMode() / toggleEditorial() / window bindings הוסרו מ-src/ui/app.js. מאזיני data-action="toggle-study" / "toggle-editorial" הוסרו. אין שינוי ב-shared/fsrs.js. test cloudRestore עודכן.',
  ],
  '9.94.0': [
    '🗂️ Track tab — שכתוב מבנה ל-4 sub-tabs (Progress / Plan / Exam / More). הגלילה האנכית של 12 כרטיסיות הוחלפה במבנה ממוקד שבו כל sub-tab מחזיק 3-4 כרטיסיות ונכנס ב-~1.5 viewports במובייל.',
    "   • Progress: 4 stat tiles · SRS due alert · Topic Mastery Heatmap · Today's Session · Activity (30 days) · Leaderboard",
    '   • Plan: Study Plan tiers · Priority Matrix · Weak Spots Map · Confidence Matrix',
    '   • Exam: Exam date / Daily Plan · Exam Trend · Rescue Drill · Cheat Sheet export · IMA Archive',
    '   • More: Spaced Reading Due · Bookmarks · Syllabus completion · Study Journal · API Key · Data Management · Version footer',
    '🪝 Internal — sub-tab choice נשמר ב-G.S.trackSubtab (משחזר לאחר reload). data-action="track-subtab" handler ב-initTrackEvents. כל 4 ה-themes (light / dark / study / editorial) רנדור תקין — ה-markup ממשיך עם class="card" / "btn" / "topic" כמו שהיה. אין שינוי ב-shared/fsrs.js.',
  ],
  '9.92.0': [
    '🐛 תיקון קריטי — Topic Mastery Heatmap הציג 100% על כל נושא שנגעת בו, גם אם רוב התשובות היו שגויות. השורש: הנוסחה ב-heatmap.js השתמשה ב-FSRS R בלבד, שהוא דעיכת זמן (R≈1 מיד אחרי כל ביקורת — נכונה או שגויה). חישוב חדש: per-card mastery = (ok/tot) × R. תשובה שגויה מורידה מאסטרי ל-0 מיידית; תשובות נכונות ישנות דועכות עם R. Fallback ל-hit-rate גולמי כשמצב FSRS חסר (legacy SM-2). 5 בדיקות חדשות, כולל regression test למקרה "wrong-just-now ≠ 100%".',
    '🐛 תיקון — Est. Score החזיר 60% מטעה כשרק נושאים בודדים נבחנו. השורש: הנוסחה הניחה 60% (neutral default) לכל נושא עם <3 תשובות, אז המשקל הכולל קרס סביב 60% גם אחרי 26 שאלות. תיקון: נושאים עם <3 תשובות מודרים מהסכימה (לא מוטענים ב-default). מחזיר null כשפחות מ-3 נושאים יש להם נתונים — UI מציג "—" עד שיש מספיק כיסוי.',
    '🎨 שיפור Priority Matrix — נושאים שלא נבחנו מסומנים ויזואלית (אופסיטי 0.75, ציון נטוי, כוכבית) עם footnote: "untested, score from exam frequency only". מונע פירוש שגוי של "0q · untested · 70" כמדידה אמיתית.',
    '🪝 Internal — heatmap.js: חדש topicCardMastery() exported. tests/heatmap.test.js: 5 cases חדשים. אין שינוי ב-shared/fsrs.js.',
  ],
  '9.89.0': [
    '🌈 מפת חום נושאים — Topic Mastery Heatmap ב-Track. SVG עם 5 דרגות Viridis (colorblind-safe). מבוסס FSRS R-value (אחזרה ממוצעת לכל נושא, לא % דיוק גולמי). לחיצה על תא פותחת קוויז של אותו נושא. החליף את ה-Topic Mastery Map הישן.',
    '❌ Wrong-answer review mode — מצב חזרה חדש לקוויז שמסנן רק לשאלות שטעיתי בהן, ממוין לפי recency × topic-weight (EXAM_FREQ). Persisted ב-IndexedDB עם fallback ל-localStorage — שורד reload. שאלה יוצאת מהסט אחרי 2 תשובות נכונות רצופות. כפתור "❌ Review wrong (N)" מופיע ב-Quiz tab כשיש שאלות פתוחות.',
    '📖 Source-link in explanations — צ\'יפ קליקבילי מתחת לכל הסבר שאלה ("📖 Harrison Ch X →"). פותח את ה-Harrison reader על הפרק הרלוונטי. מבוסס TOPIC_REF; תומך ב-q.ref override עתידי.',
    '🪝 Internal — new modules src/ui/heatmap.js, src/ui/wrong-review.js, src/ui/source-link.js. אין שינוי ב-shared/fsrs.js.',
  ],
  '9.86.0': [
    "📅 תכנית לימוד בתוך האפליקציה — Settings → 📅 תכנית לימוד. בוחרים תאריך בחינה, שעות לימוד שבועיות (1-20), שבועות חזרה (1-6); המנוע מחלק את 24 הנושאים לפי תדירות אמפירית מ-1,556 שאלות עבר ובונה לוח שבועי. JS port verbatim של allocate_hours + schedule מ-auto-audit/scripts/generate_study_plan.py — fixture חוצה-שפות מאמת התאמה byte-identical (top-5 שעות + week_used לכל תא ≤ 1e-9). שמירה בענן דרך RPC SECURITY DEFINER (study_plan_upsert / study_plan_get) על טבלה משותפת public.study_plans (key (username, app)); אורחים יוצרים תכנית מקומית עם רמז להתחבר. ייצוא .ics צד-לקוח לכל לוחות השנה (Google / Outlook / Apple) — אירועי שבוע + 3 מוקים + יום הבחינה. Mirror של Mishpacha v1.9.1; הטבלה + ה-RPCs כבר רצים על הפרויקט המשותף krmlzwwelqvlfslwltol (האפליקציה רק קוראת להם עם app='pnimit').",
  ],
  '9.85.0': [
    '👤 חשבונות משתמש — שם משתמש + סיסמה לחברי הצוות. Powered by Supabase pgcrypto bcrypt דרך RPC SECURITY DEFINER (auth_register_user / auth_login_user / auth_change_password). שם המשתמש הופך ל-uid: ההתקדמות, לוח התוצאות והגיבוי בענן עוקבים אחריך בין מכשירים. משתמשים אורחים (uid אקראי) ממשיכים לעבוד כרגיל — אין מיגרציה הכרחית. Lockout אחרי 5 נסיונות כושלים. Settings → 👤 חשבון. Mirror של Mishpacha v1.8.0 — נחלק את ה-app_users table באותו פרויקט Supabase, אז חשבון אחד פותח את שלוש האפליקציות.',
  ],
  '9.84.1': [
    '🐛 callAI singleton AbortController fix (mirror of Geriatrics v10.38.2). G._aiAbortController הוחלף ב-per-call AbortController + 30s safety timeout. בקשות מקבילות (bulk callers, רצף קליקים מהיר) לא מבטלות זו את זו יותר. preventive port — לא דווח באג ב-Pnimit אך אותו שורש קוד = אותו פגם.',
  ],
  9.84: [
    '🐞 Debug console polish: report format עבר ל-=== DEBUG REPORT === בסגנון plain-text section headers (במקום markdown #/##), כולל URL ו-time ISO. הוספת window.__debug API: __debug.show() / __debug.report() / __debug.buffer / __debug.clear(). MAX_NETWORK 50→100, MAX_ACTIONS 50→100. לוגיקת click-action מזהה כעת data-action ו-onclick=fnName(...) ומדגים אותם בלוג. tests/debugConsole.test.js + docs/DEBUG_CONSOLE.md מקובץ סטנדרטי לכל שלושת ה-PWAs.',
  ],
  9.83: [
    '🐛 Built-in debug console: 5 הקשות ברצף (תוך 3 שניות) על הפינה הימנית-עליונה של המסך פותחות panel דיבוג חי. מציג: APP/SW versions, מצב נוכחי (tab/libSec/pool/qi/QZ), 10 שגיאות אחרונות עם stack traces, 50 שורות console (בצבעים לפי level), 20 קריאות fetch אחרונות (status+ms+URL), 30 פעולות משתמש אחרונות. כפתור "📋 Copy" מעתיק הכל כ-markdown ללוח. מצמצם את צורך USB-debugging מהטלפון.',
    '🪝 Hooks: src/debug/console.js — first import ב-src/ui/app.js כך ש-console.{log,info,warn,error,debug} + window.fetch + onerror + unhandledrejection נעטפים לפני יתר ה-modules. document click capture (capture phase) רושם target+data-action+text. window.__debug_open() זמין מ-DevTools console.',
    '🔧 Sibling-port (matches Geriatrics v10.38.0). אין שינוי בלוגיקת האפליקציה — רק תוספת observability טהורה. Bundle size delta ≈ 7KB gz.',
  ],
  9.82: [
    '🔬 Sanity-check correction על v9.81: התיקון הכירורגי על idx 510 (Q142 ב-2023-Jun, "מה הפרעת החומצה-בסיס") יצר distractor פיקטיבי במקום לשחזר מ-PDF המקור. cross-reference מול exams/2023_jun_questions.pdf חשף שהאופציה האמיתית היא "metabolic acidosis" (פשוט), לא "high AG metabolic acidosis בלבד" שהוצע על בסיס reasoning קליני בלבד.',
    '✅ אומת מול answer_key המקורי: Q142 → ב, תואם ל-bank c=1. שלוש האופציות האחרות (o[1..3]) תואמות ל-PDF ב/ג/ד מילה-במילה. רק o[0] היה פיקטיבי, וכעת תוקן.',
    '⚠️ הלקח: בעתיד, אם מקור PDF זמין ב-exams/, יש לחלץ ממנו לפני reconstruction מ-context קליני. הכלל "פיו ר היגיינה, לא יצירה" צריך להיות מחייב גם בתיקונים נקודתיים.',
    '📝 פערים שנותרו ב-Q142 (out-of-scope לתיקון הזה): stem חסר labs (Albumin 3.2, pCO2 53, Lactate תקין) שהיו ב-PDF המקור, וטמפרטורה 38°C במקום 39°C — באגי parser מקוריים שדורשים מעבר מקיף יותר.',
  ],
  9.81: [
    "🔍 ביקורת רוחב היסטורית של Parser Bleed (תאומת ל-Geriatrics v10.34, commit ca12e96). אותו פייפליין parsing עברי IMA RTL מזין את שני המאגרים — אם השגיאה התרחשה שם, חזקה שהתרחשה גם כאן. הסריקה מצאה רק שאלה אחת (idx 510, t=2023-Jun): שאלה על הפרעת חומצה-בסיס שבה תוצאות בדיקה גופנית + מעבדה + פרגמנט שאלה התמזגו לאופציה א'. תיקון כירורגי: הטקסט הזולג הועבר ל-stem, אופציה א' הוחלפה ב-distractor פלאוסבילי.",
    '🛡️ tests/parserBleedGuard.test.js: 3 טסטים חדשים — (a) אין שאלת past-exam עם next-Q-stem-bleed pattern אחרי תו 30 (b) אין footer cruft (date+exam-header) (c) אין אופציה past-exam מעל 250 תווים. הטסט נועל את הבנק הנקי ולא יאפשר לבאג להופיע בייבוא בחינות עתידיות.',
    '📊 Scope of damage: 1 אופציה זוהמה (לעומת 318 ב-Geriatrics) — Pnimit הרבה יותר נקייה. ספירות לא השתנו (1556 שאלות, אותם ti, אותם c). זוהי ניקוי data-integrity טהור.',
    '🔢 No whitelist needed: LEGIT_LONG_OPTION_INDICES = empty set. אם בעתיד נוסיף שאלת השוואת-מטופלים לגיטימית, יש להוסיף את ה-index שלה לסט עם תיעוד בקומנט.',
  ],
  '9.80': [
    '🔇 Sibling-drift fix (matches § C FamilyMedicine v1.5.0) — DEV-gated 3 production console.log calls: data-loader.js × 2 ("Loaded N user-generated questions" + "Data loaded: N questions, N notes"), sw-update.js × 1 ("Deleted old cache: X"). Mishpacha already shipped this pattern; Pnimit was still leaking. All three now quiet in production, still visible under `import.meta.env.DEV`.',
  ],
  9.79: [
    "🔤 BIDI hygiene pass (matches § C FamilyMedicine v1.3.4) — .heb class no longer force-sets direction:rtl; now uses unicode-bidi:plaintext + text-align:start. Each paragraph's base direction is computed from its own first strong character per the Unicode Bidi Algorithm. Hebrew stays right-aligned, English-majority content (AI explanations, drug names) no longer reflows RTL inside Hebrew-font containers.",
    '🔤 Quiz chrome — AI-flag banner + imgDep banner + teach-back textarea + teach-back header: dir="rtl" → dir="auto" + unicode-bidi:plaintext. Interpolated eFlag text wrapped in <bdi> so English error strings don\'t reorder into surrounding Hebrew.',
  ],
  9.78: [
    '🔑 Rotated SUPA_ANON from legacy JWT anon to new-format publishable key (sb_publishable_*) — matches § B Toranot, § C FamilyMedicine, § D Geriatrics on the shared Supabase project. Drift-prevention comment added.',
  ],
  9.76: [
    '↩ הוחזרו כתובות Supabase לסכמת public (internal_medicine schema לא היה חשוף ב-PostgREST, כתיבות החזירו 406 מאז merge של PR #42 ב-17:45 UTC). כל פיצ׳רי הגיבוי, הפידבק והליידרבורד פעילים שוב.',
    '🔒 תיקון במקביל לגריאטריה (v10.2) — אותה בעיה, אותו פיתרון.',
  ],
  9.73: [
    '🔧 Oct24: 4 שאלות עם stem corrupt תוקנו (Q29 "הנ" strays + "נפיחות"→"מיימת", Q38 "נערה" מיותר, Q66 "בן 14" שהיה צריך להיות "תמונה 14", Q67 bidi spacing).',
    '✅ תמיכה בתשובות כפולות (c_accept): 5 שאלות Oct24 עם multi-accept לפי מפתח התשובות הרשמי — Q22 EGPA (א+ד), Q23 סרקואיד (ב+ג), Q37 דימום דליות (ב+ד), Q41 C.septicum (ג+ד), Q67 טחול (כל 4 התשובות — נפסלה).',
    '⏳ Oct24 חסר שאלה אחת (Q90, IPF/PFT) — ממתין ל-ingestion מה-PDF.',
  ],
  9.72: [
    '🧹 ניקיון: 3 placeholder תמונות פגומות (data:image/svg+xml עם viewBox ריק) הוסרו משדה img. משתמשים ראו תמונות שבורות ב-2 שאלות Jun2025 + 1 Harrison עד עכשיו.',
    '📊 Audit תמונות: 160/1541 (10.4%) עם img אמיתי. Gap של 18 שאלות עם reference תמונה בטקסט אך ללא img — לא ניתן לפתור ללא PDF source images.',
    '📚 +11 missing IMA Q2020 questions (Q28,41,50,57,64,81,106-110) reconstructed from official PDFs via Sonnet 4.5 — 2020 session now complete 150/150',
    '✅ Tests: 456 pass, version 9.71 → 9.72.',
  ],
  9.71: [
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
  9.69: [
    '🔍 תמונות נפתחות בזום מלא בלחיצה (היה חסר CSS ל-overlay).',
    '↔️ תיקון BIDI מקיף: כיוון טקסט מחושב לפי יחס עברית/אנגלית (heDir) במקום dir="auto". קלפי Distractor Autopsy, הסברים המתחילים ב-IgG4/MEN1/CT, שאלות ב-Library preview — כולם שומרים כעת על כיוון טקסט נכון.',
  ],
  9.68: [
    '⚡ FSRS now deadline-aware: once an exam date is set, card intervals are capped by difficulty bucket (weak 30% / normal 60% / strong 85% of remaining days) so every card gets a pre-exam review.',
    '🎯 מבחן סימולציה — בחירת שנה ספציפית (2020/2021-Jun/2022-Jun/2023-Jun/2024-May/2024-Oct/2025-Jun) בנוסף לתמהיל המציאותי.',
    '🔁 Replay wrong answers from the most recent mock — one-tap drill from the mock result modal and from the daily plan.',
    '☁️ Cloud backup now bundles mock history + session snapshots, so cross-device restore preserves your mock trend.',
  ],
  9.67: [
    '⬆️ כפתור "הבאה" הועבר לראש אזור התשובה',
    '✎ אייקון הערה ו-★ אייקון סימניה ברורים יותר (עיגולים צבעוניים)',
    '📊 אייקון טאב Track תוקן (היה מוצג פגום)',
    '📓 עמוד יומן לימוד — עוצב מחדש, כפתור "תרגל הכל"',
  ],
  9.66: ['📋 עזרה ורשימת שינויים בעברית מלאה', '🔢 ספירות דינמיות (שאלות, פלאשקארדים)'],
  9.65: [
    '📝 הערות אישיות — כפתור בכל שאלה פותח הערה פרטית',
    '📓 פנקס כללי ב-Notes עם ייצוא לקובץ',
    '🔖 רשימת כל ההערות עם מעבר לשאלה',
  ],
  9.64: ['🔔 התראות לא חוסמות במקום חלוניות מערכת', '🧹 ניקוי handlers יתומים ו-imports לא בשימוש'],
  9.63: ['🔀 חצי "קודמת" ו"הבאה" תוקנו לכיוון עברי', '📱 סיום מבחן במודאל מעוצב'],
  9.62: ['🌙 מצב כהה ומצב לימוד — תיקוני צבע לכל הכפתורים אחרי מענה'],
  9.61: [
    '⬅️ כפתור "קודמת" נוסף — אפשר לחזור לשאלה קודמת ולראות את התשובה שבחרת',
    '🍎 תאימות iOS — שורת סטטוס כהה, מניעת זום לא רצוי',
    '🔤 גופן Heebo ראשי לרינדור עברי איכותי',
  ],
  '9.60': [
    '🚫 הפרומפט לדירוג ביטחון הוסר — זרימת המענה ישירה',
    '📏 כפתורים גדולים יותר (44 פיקסל) למגע במובייל',
  ],
  9.59: [
    '🐛 פריסה אחרי מענה — הכפתורים לא נדחסים לעמודה צרה',
    '🗺️ הסבר הנושא הנכון מוצג אחרי תשובה',
    '⬆️ כפתור "הבאה" ברור ובולט',
  ],
  9.58: [
    '🎨 מערכת עיצוב חדשה — ערכת צבעים כחול/ירוק לפנימית',
    '🔤 גופנים מקומיים (ללא תלות ב-Google Fonts, עובד אופליין)',
    '🛡️ הידוק CSP',
    '♿ כיבוד prefers-reduced-motion',
  ],
  9.57: [
    '🙈 מצב מבחן לא חושף תשובה עד הסוף',
    '📊 Exam Trend כולל 2023-Jun',
    '🗺 Weak Spots Map — תאים עם ניסיון אחד מוצגים באפור',
    '🍎 תאימות iOS למכשירים עם notch',
  ],
  9.56: ['🔒 הגנת דה-דופ חזקה יותר', '📮 דיווחי פידבק כוללים hash לזיהוי דיווחים חוזרים'],
  9.55: [
    '🔬 Distractor Autopsy — פעיל תמיד: אחרי כל תשובה רואים למה כל דיסטרקטור שגוי',
    'נתונים מוכנים מראש לאופליין',
    'גיבוי AI לשאלות ללא ניתוח מוכן',
  ],
  9.54: [
    '"Why did I get it wrong?" — כבר לא חוסם את כפתור "הבאה"',
    'טסט חדש: בדיקת כיסוי TOPIC_REF',
    'Pre-push hook לבדיקות innerHTML',
    'ניקוי הערות ישנות',
  ],
  9.53: [
    'UX: "How sure are you?" (😬 🤔 😎) כבר לא חוסם את כפתור בדוק — הפך לאופציונלי. אפשר עדיין ללחוץ על אחת האמוג\'ים כדי לעקוב אחרי ביטחון, אבל לא חייבים.',
    'תיקון: כפתור "Read: Harrison Ch X — you\'re weak here" מנווט עכשיו ישירות לפרק הספציפי (נפתח Harrison chapter viewer עם התוכן) במקום סתם לפתוח את מדף הספרייה',
  ],
  9.52: [
    'סטנדרטיזציית תגיות מבחן לפורמט קנוני YYYY-Mon (Jun21→2021-Jun, Jun22→2022-Jun, Jun23→2023-Jun, May24→2024-May, Oct24→2024-Oct, Jun25→2025-Jun)',
    'מיגרציית localStorage אוטומטית עם סנטינל __tagMigrationV1 — משתמשים קיימים לא מאבדים נתונים',
    'סנכרון canonical JSONs תחת scripts/exam_audit/canonical/ לתגיות החדשות',
    'עדכון pills סינון ב-quiz-view + Track heatmap בהתאם',
    'בדיקות רגרסיה מעודכנות ל-PAST_EXAM_TAGS החדש',
  ],
  9.51: [
    'תיקון קריטי: שוחזרו 603 שאלות נוספות במבחנים ישנים (2020, Jun21-Jun25) — רווחים חסרים, ספרות הפוכות, שברי שאלות שקרו לשאלה הבאה',
    'הסרת שאלה כפולה ב-2020 (Q35/Q1531 עם תשובות נכונות סותרות)',
    'אבטחת Supabase: הוסרה הרשאת DELETE על pnimit_backups ו-samega_backups — מונע מחיקה זדונית של גיבויי משתמשים',
    'אבטחת Supabase: איחוד פוליסות כפולות ב-shlav_feedback (3→1)',
    'תוספת 36 בדיקות רגרסיה חדשות ב-CI — תופסות פגמים כמו mojibake, כפילויות, שבר שאלות, סנכרון canonical',
    'Canonical JSONs חודשו מ-data/questions.json הנקיה',
  ],
  '9.50': [
    'תיקון קריטי: 192 שאלות במבחני May24 ו-Oct24 היו מושחתות (הקידוד של ð במקום נ) — כולן שוחזרו במלואן בעברית נקייה',
    'הסרת שאלה כפולה ב-Oct24 (Tumor Lysis Syndrome)',
    'סה"כ שאלות: 1,542 (מ-1,543, אחת כפולה הוסרה)',
  ],
  9.49: [
    'תיקון באג "setFilt is not defined" — טאבי מבחנים שוב עובדים',
    'בחירה מרובה של שנות מבחן — ניתן לסמן כמה שנים יחד (Jun22+Jun23+May24…)',
    'סנכרון גרסת cache של SW עם APP_VERSION בזמן build',
    'תיקון imports חסרים ב-quiz-view.js (10+ פונקציות)',
  ],
  9.48: [
    '39 תמונות נוספות קושרו לשאלות (Pnimit 7.9% → 10.5% צפיפות)',
    'Oct24 אלבום: 22 עמודים הועלו ל-Supabase, 18 שאלות עם תמונה כעת',
    'Jun25: 3 תמונות חדשות (שאלות 124, 136, 138)',
    'May24: 12 תמונות מ-orphaned uploads קושרו',
    'Jun23: 5 תמונות מ-orphaned uploads קושרו (ECG, פריחות, ספירומטריה, CXR+ECG)',
  ],
  9.47: [
    'Leaderboard: מיון לפי דיוק אמיתי (accuracy) במקום readiness',
    'Leaderboard: שליפת accuracy מ-Supabase (generated column)',
    'ניקוי Supabase: הסרת שורות עם פחות מ-20 תשובות',
  ],
  9.46: [
    'Leaderboard: הצגת דיוק אמיתי (correct/answered) במקום readiness מטעה',
    'Leaderboard: guard — דורש ≥20 תשובות + est. score תקף לפני submit',
    'Leaderboard: הקשחת קריאת שדות + res.ok check',
  ],
  9.45: ['תיקון לולאת עדכון — באנר "עדכון זמין" לא נעלם', 'תיקון מחיקת cache לפני reload'],
  9.44: [
    'ניקוי window bindings — הסרת renderTabs מיותר (17 → 16)',
    'עדכון README ו-CLAUDE.md למבנה מודולרי',
  ],
  9.43: ['העברת כל התמונות המקומיות ל-Supabase', 'כל 116 התמונות מוגשות כעת מ-Supabase'],
  9.42: [
    'קישור תמונות מבחנים ל-Supabase (Jun21 + Jun24)',
    'העברת תמונות מקומיות ל-Supabase URLs',
    '14 תמונות חדשות ממבחן יוני 2024',
  ],
  '9.40': [
    '🖼️ +20 image-based questions from Jun 2021 past exam (ECG, smear, CXR, CT-PE, fundoscopy, derm, echo) — 73 → 93 images (6.3%)',
    '📚 +143 Harrison-based questions across 10 weak topics (Valvular, ICU, Derm, Allergy, Fluids, Pain, Periop, Tox, Onc, Vascular) — total 1452',
    '🔧 Fixed 4 questions with duplicate/empty options (Q135, Q280, Q308, Q342)',
    '🗑️ OSCE dead code removed, dead Med Basket/Lab/Aging CSS removed (~2.3KB)',
    '🧪 Test coverage +33 — AI proxy routing, sanitization, SRS/FSRS, CSP tests',
  ],
  9.39: [
    '🔒 XSS: sanitize AI-generated question fields in quizMeOnChapter',
    '🔒 XSS: sanitize leaderboard data from Supabase',
    '🐛 Cloud backup: check PATCH response status before showing success',
    '🧹 Remove 7 dead functions: queueBackgroundSync, toggleAskAI, submitAskAI, copyDiagnostics, togOT, togOck, renderSyllabus',
  ],
  9.38: [
    '🛡️ Fix: guarded all localStorage parses — corrupted state no longer bricks boot',
    '🔧 Fix: user-generated questions persist across reload',
    '🔧 Fix: service worker skips POST, uses navigate mode, no wrong JSON fallback',
  ],
  9.37: [
    '🔧 FSRS-4.5 extracted to shared/fsrs.js — shared engine Phase 1',
    '📦 shared/fsrs.js loaded as external script, cached by SW',
    '🔗 isChronicFail() now shared between apps',
    '⚡ srScore() upgraded: fsrsRating parameter for confidence-based scheduling',
  ],
  9.36: ['🚨 Fix syntax error in getWeakTopics — app was stuck loading'],
  9.35: [
    '🚨 Critical fix: restore data loader — app was showing blank screen',
    '🔄 Revert accidental deletion of boot sequence, version check, background sync',
  ],
  9.34: [
    '🐛 Fix: calcEstScore was using 40-topic Geriatrics FREQ array instead of 24-topic EXAM_FREQ — scores now accurate',
    '📊 Analytics key metrics row (Est. Score, Streak, Answered, Accuracy) at top of Track tab',
    '🗺️ Topic Mastery Heatmap — clickable tiles showing per-topic accuracy',
    '📈 SRS due alert with quick-review button',
    '🔧 Added getStudyStreak() for accurate streak from dailyAct',
  ],
  9.33: [
    '🐛 Changelog Fix — תצוגת changelog תקינה במקום קוד גולמי',
    '🐛 Quiz Fix — תיקון stats.map crash שגרם לשגיאות בכפתורים',
    '🐛 IDB Init Fix — תיקון _dataPromise hoisting error',
  ],
  9.31: [
    '📊 1,169 \u05e9\u05d0\u05dc\u05d5\u05ea \u2014 All questions tagged by 24 subspecialties',
    '💊 Drugs Tab \u2014 Drug checker with ACB scores, Beers flags, STOPP interactions',
    '🔒 Security \u2014 AI response sanitization for XSS protection',
    '📄 Articles \u2014 10 required NEJM/Lancet articles',
    '\u2705 AI Proxy \u2014 All AI features work without a personal API key',
  ],
  9.32: [
    '🚨 Rescue Drill \u2014 Focused practice on your 3 weakest topics',
    '📅 Activity Calendar \u2014 30-day question activity heatmap',
    '📖 Spaced Reading \u2014 Track chapter reads + 30-day re-read reminders',
    '🏆 Leaderboard \u2014 Anonymous global rankings via Supabase',
    '💡 Feedback System \u2014 Submit feedback with AI acknowledgment',
    '🗂️ Tab Consolidation \u2014 10 \u2192 5 tabs: Quiz, Learn, Library, Track, More',
    '📋 Dynamic Changelog \u2014 Version history in help overlay',
  ],
};
