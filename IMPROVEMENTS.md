# IMPROVEMENTS — InternalMedicine (Pnimit Mega)

Rolling audit log for `audit-fix-deploy` runs. Most recent at top.

---

## 2026-05-01 — v10.4.4 audit-fix-deploy Round 2 (deeper-dig)

**Trigger:** user-requested R2 deeper-dig run after R1 (commit `688afab`, v10.4.3). Same day; v10.4.3 was already live (Actions green, sw.js `pnimit-v10.4.3`).

### R1 followups — resolution

| R1 followup | R2 resolution |
|---|---|
| Skill file blocked at `~/.claude/skills/` and `.claude/skills/` | `.claude/skills/internal-medicine-dev/` directory existed but empty. Created in-repo `SKILL.md` (snapshot + audit primer). |
| RLS sanity pass on Supabase | Still requires interactive OAuth; deferred to Round 3 cross-repo task (Toranot/ward-helper sessions are the canonical owners of the shared `krmlzwwelqvlfslwltol` schema). |
| IMA_WEIGHTS sum=141 dual-count needs annotation | Added 8-line comment to `src/core/constants.js` explaining ECG dual-count + do-not-normalise rule. New test asserts the annotation persists (anti-bitrot guard). |
| Identify 4 lightest topics | Hypertension (30), Arrhythmias & ECG (34), Neurology & Stroke (36), Endocrinology & Diabetes (41). All ≥30 — no authoring task needed; documented for human awareness. |

### R2 deeper findings

| Surface | Finding | Action |
|---|---|---|
| **Dependency** | 1 moderate `postcss <8.5.10` XSS via npm audit. Auto-fixable but Vite 6 pinned. | Documented; not blocking deploy. Will be auto-resolved on next Vite minor. |
| **Dependency** | Vite 6 → 8 major available. Vitest 4.1.4→4.1.5 patch. ESLint 9→10 major. | Major bumps are coordinated cross-repo; defer. Skip patch unless verify drift. |
| **Bundle** | Total `dist/` 114 MB (Harrison PDFs 59 MB dominate). Main JS chunk = 309 kB (uncompressed). CSS 22 kB. SW 3.7 kB. | Baseline locked for future regression. |
| **Coverage** | `@vitest/coverage-v8` is installed but `vitest.config.js` has no `coverage` block. Skipped — no actionable signal without enabling. | Future R3+ candidate: enable coverage in `vitest.config.js`. |
| **Window-bindings** | Counted exactly **16** API-surface bindings (all listed below). No drift from documented contract. | OK |
| **HARRISON_PDF_MAP integrity (extended)** | 69 entries, 0 missing PDFs, 0 question-orphans (every `q.ch` resolves), 0 disk-orphans (every PDF in `harrison/` is mapped). All 69 mapped chapters are *unreferenced by Qs* — they exist as a curated reader atlas accessed via "Open Ch X" buttons. | OK |
| **Per-topic-per-year coverage matrix** | 38 of 168 cells (24×7) are zero. Most-affected topics: Allergy & Immunology (7/7 zero), Toxicology (7/7), Pain & Palliative (7/7), Perioperative (5/7), Dermatology (5/7), Vascular Disease (5/7). | Logged as content-authoring backlog (R3+). |
| **Backup/restore extended** | New tests cover: malformed JSON parse-error path, partial backup (missing keys), version-drift (older `__v` schema keys silently ignored), full PROTO_BLOCKLIST (`__proto__`/`constructor`/`prototype`). | OK — `filterRestorePayload` contract holds. |
| **9.76 schema-rollback scar** | Verified `grep -rn "internal_medicine\." src/` empty. Cloud writes use bare `/rest/v1/pnimit_*` (= `public` schema). Test guard added. | OK |
| **fsrs.js dual hash** | git-hash-object: `9f91faaf4f814c5747318f8f6bcf2157b883582d` · LF-md5: `cea66a0435be626eda9c1bf120d2625c` ✅ matches canonical. | OK — no sibling drift. |
| **IMA_WEIGHTS overlap annotation** | Inline 8-line comment added explaining ti=0 (Cardiology) ↔ ti=2 (Arrhythmias & ECG) dual-count, sum=141 by design, do-NOT-normalise. Test guard locks the annotation persistence. | Resolved. |

### Window-bindings list (exactly 16 — matches CLAUDE.md contract)

Set in `src/ui/app.js` (`_w = window` shorthand). API surface:

```
go, render                                      // core nav (HTML shell + render-time onclick)
setTopicFilt                                    // quiz topic filter
openHarrisonChapter                             // library chapter navigation
showLeaderboard, cloudBackup, cloudRestore      // track-view delegation (circular)
sendChatStarter                                 // track-view → chat starter
exportProgress, importProgress                  // track-view (data import/export)
toggleDark, showHelp                            // header onclick (HTML shell)
applyUpdate                                     // dynamic update banner (created via JS)
shareQ                                          // quiz-view → window.shareQ() in delegation
shareApp                                        // body-level delegation (dynamic UI)
updateAccountChip                               // auth → header chip refresh
```

Internal flags (NOT API surface, documented for completeness): `G`, `APP_VERSION`, `__pnimitLastMockWrong`, `__authBound`, `__studyPlanBound`, `_idbSaveTimer`, `_lsWarnShown`, `__debug`, `save` (legacy alias).

### Per-topic-per-year coverage matrix (zero cells)

```
ti  Topic                              Missing years
 3  Valvular & Endocarditis            2025-Jun
11  Oncology & Screening               2020, 2023-Jun, 2024-May, 2025-Jun
14  Neurology & Stroke                 2022-Jun, 2025-Jun
15  Critical Care & Shock              2024-Oct
16  Dermatology                        2021-Jun, 2022-Jun, 2023-Jun, 2024-May, 2024-Oct
17  Allergy & Immunology               (all 7 years zero)
18  Fluids & Volume                    2020, 2021-Jun, 2022-Jun, 2023-Jun, 2024-May
19  Pain & Palliative                  (all 7 years zero)
20  Perioperative                      5 years zero
21  Toxicology                         (all 7 years zero)
23  Vascular Disease                   5 years zero
```

Topics 17/19/21 (Allergy, Pain/Palliative, Toxicology) have zero per-year overlap — questions exist but are tagged `Harrison`/`Exam`/no-tag, not session-tagged. Not a bug per se; reflects how those topics surfaced from cross-source AI generation rather than past Israeli exams. Surface for content-authoring R3+.

### Bundle baseline (post-build)

| Asset | Size |
|---|---|
| `dist/` total | 114 MB |
| `dist/data/questions.json` | (within `dist/data/` 6.2 MB) |
| `dist/assets/pnimit-mega-*.js` (main chunk) | 309,839 bytes (303 kB) |
| `dist/assets/pnimit-mega-*.css` | 22 kB |
| `dist/sw.js` | 3.7 kB |
| `dist/harrison/` (PDF atlas) | 59 MB |
| `dist/exams/` | 21 MB |
| `dist/questions/` (images) | 18 MB |

### Test count delta

R1: 654 / 34 files → R2: **692 / 35 files** (+38 tests, target was +25). New file: `tests/auditR2Expansion.test.js` (12 suites, 38 cases). Surfaces covered (different from R1):

1. buildMockExamPool pairwise ordering + multi-tag intersection (Year × Topic)
2. heDir Hebrew bidi numerics + 25%-threshold mutation guard
3. sanitize 5-char escape + falsy-input contract
4. fmtT seconds boundary (00:00 / 59:59 / 1:00:00 / 3:00:00)
5. isMetaOption Hebrew + English meta-option detection (with false-positive guard)
6. getOptShuffle determinism + meta-pin-to-end invariant
7. remapExplanationLetters identity + non-letter no-op
8. isOk c_accept array + null-defense (mutation-resistant)
9. Backup/restore extended: malformed / partial / version-drift / full PROTO_BLOCKLIST
10. Service worker: cache-name version, activate-eviction, skipWaiting, JSON_DATA_URLS pattern
11. localStorage namespace immutability + 9.76 schema-scar regression guard
12. IMA_WEIGHTS annotation persistence + sum===141 lock

### Open R3+ candidates

- **RLS pass on shared Supabase project** — interactive OAuth required; coordinate from Toranot session.
- **Per-topic-per-year content gaps** — 38 zero cells; topic 17/19/21 fully bare on session tags. Authoring task.
- **Coverage instrumentation** — `@vitest/coverage-v8` installed but `vitest.config.js` has no `coverage` block. Add it; identify untested files in `src/`.
- **Dependency majors** — Vite 6→8, ESLint 9→10. Coordinate cross-repo before bumping.
- **postcss XSS advisory** — auto-fixable; will resolve on next Vite minor patch.
- **Mutation testing** — `stryker-mutator` would extend the "mutation-feel" tests added here to actual coverage.
- **shared/fsrs.js cross-repo guard** — currently each repo asserts canonical md5 in tests; consider `.shared/` workspace symlink approach.

---

## 2026-05-01 — v10.4.3 audit-fix-deploy cycle (HARRISON_PDF_MAP fix + test expansion)

**Trigger:** user-requested deep-audit pass on all 6 medical repos. Pnimit was on `v10.4.1` after PR #78 (settings consolidation) + post-v10.3.0 IMPROVEMENTS commit `b9581bb`. Synced to `67a1515` (v10.4.1 with `post-login-restore.js` + `postLoginRestore.test.js` already merged) before audit. **Sibling concurrency:** during the cycle, a parallel session shipped `v10.4.2` (`c4c8a60`, "dark-mode CSS for image rendering surfaces"). Rebased and bumped to `v10.4.3` to coexist.

### Audit findings

| Severity | Finding | Action |
|---|---|---|
| **Medium** | `HARRISON_PDF_MAP[458]` had URL-encoded `%23U00e9` instead of literal `#U00e9` — file on disk is `harrison/Ch458_Guillain-Barr#U00e9_Syndrome_and_Other_Immune.pdf`. The "📖 Open Harrison Ch 458" button silently 404'd. | Fixed in `src/core/constants.js`. Regression-locked by `tests/auditExpansion.test.js`. |
| **Low** | `IMA_WEIGHTS` sum = 141, not 100 (categories double-count, e.g. ECG ↔ Cardiology+Arrhythmias). Not strictly a bug but worth documenting. | Documented in test bounds (100..150). |
| **Info** | RLS sanity pass on `krmlzwwelqvlfslwltol` deferred — Supabase MCP requires interactive OAuth. Sibling repos (Geriatrics § B, FamilyMedicine § C, Toranot § A) are responsible for shared-schema migrations and have already audited the project this cycle. | Skipped per autonomy policy; flagged for next interactive session. |
| **Pass** | 24-topic contract: TOPICS / EXAM_FREQ / IMA_WEIGHTS all length 24 | OK |
| **Pass** | All 24 topics have ≥30 questions (no <5 gaps) | OK |
| **Pass** | All 7 EXAM_YEARS have ≥99 questions each | OK |
| **Pass** | 1556 questions, 0 ti orphans (all 0..23) | OK |
| **Pass** | HARRISON_PDF_MAP: 69 entries, 0 missing on disk after fix | OK |
| **Pass** | `console.log` leaks: 0 ungated (all 3 properly behind `import.meta.env.DEV`) | OK |
| **Pass** | `shared/fsrs.js` LF-normalized md5 = `cea66a0435be626eda9c1bf120d2625c` (canonical) | No drift vs § B/C |

### Per-topic Q distribution (24 topics — all ≥30)

```
 0 Cardiology — Coronary             131       12 Infectious Disease            64
 1 Heart Failure                      68       13 Rheumatology & Autoimmune     79
 2 Arrhythmias & ECG                  34       14 Neurology & Stroke            36
 3 Valvular & Endocarditis            59       15 Critical Care & Shock         57
 4 Hypertension                       30       16 Dermatology                   54
 5 Pulmonology & VTE                 105       17 Allergy & Immunology          53
 6 Gastroenterology & Hepatology      88       18 Fluids & Volume               52
 7 Nephrology                         62       19 Pain & Palliative             53
 8 Electrolytes & Acid-Base           52       20 Perioperative                 54
 9 Endocrinology & Diabetes           41       21 Toxicology                    56
10 Hematology & Coagulation           93       22 Clinical Approach            130
11 Oncology & Screening               52       23 Vascular Disease              53
```

Lightest topics (consider expansion in future cycles): Hypertension (30), Arrhythmias & ECG (34), Neurology & Stroke (36), Endocrinology & Diabetes (41).

### Per-EXAM_YEAR breakdown

| Tag | Q count |
|---|---|
| 2020 | 150 |
| 2021-Jun | 149 |
| 2022-Jun | 148 |
| 2023-Jun | 150 |
| 2024-May | 99 |
| 2024-Oct | 100 |
| 2025-Jun | 151 |
| Harrison (AI) | 589 |
| Exam (misc) | 20 |
| **Total** | **1556** |

### Fixes (commit shipped this cycle)

- `v10.4.3` — single bump for HARRISON_PDF_MAP[458] fix + new test file. Trinity locked: `package.json` 10.4.3.0 ↔ `APP_VERSION` 10.4.3 ↔ `sw.js` `pnimit-v10.4.3`. (10.4.2 already taken by sibling-shipped Dark Mode CSS fix on `c4c8a60`.)

### Tests

- **New file:** `tests/auditExpansion.test.js` (28 tests). Targets: 24-topic contract, HARRISON_PDF_MAP integrity (PDF-on-disk + no URL-encoded leaks), EXAM_YEARS 7-tag coverage, IMA-bias mock-exam picker distribution, APP_VERSION trinity, 9.76 backup→restore regression (5 sub-cases including `__proto__` pollution + empty-allowed-set 9.76 scenario).
- **Delta:** 626 → 654 tests, 33 → 34 files. (Baseline in skill body said `488/21`; the repo had grown organically. New baseline: **654/34**.)

### Window-bindings audit

16 documented API-surface bindings (per CLAUDE.md table). Internal flags (`_idbSaveTimer`, `_lsWarnShown`, `__authBound`, `__studyPlanBound`, `__pnimitLastMockWrong`, `save`, `updateAccountChip`, `__debug`, `G`, `APP_VERSION`) all unchanged. No new bindings introduced this cycle.

### Sibling drift check

- `shared/fsrs.js` LF-normalized md5 `cea66a0435be626eda9c1bf120d2625c` ✅ matches canonical (Geriatrics § B, FamilyMedicine § C). Not modified this cycle.

### Open items / future work

- Consider expanding lightest 4 topics (Hypertension, Arrhythmias & ECG, Neurology & Stroke, Endocrinology & Diabetes) toward ≥50 Q each to better reflect IMA exam distribution.
- IMA_WEIGHTS double-counts (sum=141) is intentional (categories overlap) but consider documenting the overlap mapping inline.
- Resolve TODO at `src/core/constants.js:16` — `'2020'` exam-tag month unresolved.

---

## 2026-04-30 — post-v10.3.0 deploy verification

**Trigger:** v10.3.0 ("settings consolidation") shipped via PRs #77 + #78 (merge commits `28698a0` and `2e40531`). Audit run after merge to confirm health.

### CI / Deploy

- All 4 GitHub Actions workflows on `2e40531`: PASS
  - `CI` ✅ · `Notify auto-audit` ✅ · `Integrity Guard` ✅ · `Deploy to GitHub Pages` ✅
- Live URL HTTP 200: https://eiasash.github.io/InternalMedicine/
- Live `sw.js` first line: `const CACHE='pnimit-v10.3.0';` ✅
- Live `package.json` from raw GitHub: `"version": "10.3.0.0"` ✅
- No open `auto-audit`-labelled issues on the repo

### Trinity (sync-sw-version.cjs)

| File | Value |
|---|---|
| `package.json` | `"version": "10.3.0.0"` |
| `src/core/constants.js` | `APP_VERSION='10.3.0'` |
| `sw.js` | `CACHE='pnimit-v10.3.0'` |

`node scripts/sync-sw-version.cjs` → `OK: version 10.3.0`. Tests `serviceWorker.test.js` (30/30) + `appIntegrity.test.js` (20/20) green.

### XSS / sanitization

- `python3 scripts/check-innerhtml.py` → `OK: No unsanitized innerHTML interpolation`
- `python3 scripts/check-innerhtml-pieces.py` → `OK: 8 innerHTML sites with interpolation, all pieces sanitized or annotated`

### Code hygiene

| Check | Result |
|---|---|
| `console.log` leaks (ungated) | 0 ✅ |
| Stale `TODO`/`FIXME` | 1: `src/core/constants.js:16` — *"`2020` kept bare — month unresolved (TODO: confirm from source)"*. Long-standing, low priority. |
| `APP_VERSION` references | All correctly import from `src/core/constants.js` (`src/features/cloud.js:2` etc.) |
| `window.*` assignments | 19 (16 documented API surface + `save`/`updateAccountChip`/`__pnimitLastMockWrong` internal). No new bindings introduced in v10.3.0. |

### Tests

| Suite | Result |
|---|---|
| Full vitest run | **612/612** ✅ |
| `tests/regressionGuards.test.js` | 47/47 ✅ (now asserts `toggleNotifOptIn` against `settings-overlay.js` — Stage 4 retarget) |
| `tests/serviceWorker.test.js` (trinity guard) | 30/30 ✅ |
| `tests/appIntegrity.test.js` (trinity guard) | 20/20 ✅ |

### Data integrity

- Total Qs: **1556** (no change from prior audit)
- Per-tag breakdown: `2020:150 · 2021-Jun:149 · 2022-Jun:148 · 2023-Jun:150 · 2024-May:99 · 2024-Oct:100 · 2025-Jun:151 · Harrison:589 · Exam:20`
- 24 topics × all ≥ 5 Qs (no coverage holes)
- `TOPICS.length === EXAM_FREQ.length === IMA_WEIGHTS.length === 24` ✅

### Findings — pre-existing, NOT introduced by v10.3.0

#### F-1 · `shared/fsrs.js` apparent md5 drift was a CRLF artifact (RESOLVED THIS RUN)

Initial audit flagged divergent md5s across the three medical-PWA siblings:

| Repo | md5 (working tree) |
|---|---|
| InternalMedicine | `5e027f967637a8045e726a2ba7f839aa` |
| FamilyMedicine   | `5e027f967637a8045e726a2ba7f839aa` |
| Geriatrics       | `cea66a0435be626eda9c1bf120d2625c` |

**Root cause: line endings, not content.** `git ls-files --eol shared/fsrs.js`:

```
i/lf  w/crlf  attr/                InternalMedicine/shared/fsrs.js
i/lf  w/lf    attr/text eol=lf     Geriatrics/shared/fsrs.js
i/lf  w/crlf  attr/                FamilyMedicine/shared/fsrs.js
```

All three repos store **byte-identical content in the git index** (`i/lf` everywhere). Geriatrics has an explicit `text eol=lf` rule in `.gitattributes` for `*.js`, so its working tree is LF. InternalMedicine and FamilyMedicine have no eol attribute on `*.js`, so Windows autocrlf converts them to CRLF on checkout. The working-tree md5s diverge; the canonical (LF, content-only) md5 is identical:

```bash
$ md5sum < <(tr -d '\r' < shared/fsrs.js)   # all three repos:
cea66a0435be626eda9c1bf120d2625c
```

**Workspace `CLAUDE.md` is correct** (cites `cea66a04…` as canonical).
**`audit-fix-deploy/SKILL.md` is stale** — it cites `5e027f96…`, which is the Windows-CRLF artifact, not the canonical content hash. **Updated this run.**

**Structural fix applied this run**: `.gitattributes` in InternalMedicine + FamilyMedicine extended with `shared/fsrs.js text eol=lf`, then `git add --renormalize shared/fsrs.js` to stage the LF-normalized working-tree copy. After this lands, the working-tree md5 will match canonical on every platform — no more false-positive drift alarms.

#### F-2 · Harrison Ch458 PDF map URL-encoding mismatch (LOW)

`src/core/constants.js` `HARRISON_PDF_MAP['458']` references:
```
harrison/Ch458_Guillain-Barr%23U00e9_Syndrome_and_Other_Immune.pdf
```

Actual file on disk:
```
harrison/Ch458_Guillain-Barr#U00e9_Syndrome_and_Other_Immune.pdf
```

The map has the URL-encoded `%23U00e9`, the filename has the literal `#U00e9`. Browser resolution: `%23` → `#` is decoded server-side, so live deploys resolve correctly. Local audit `fs.existsSync` does no decoding, so it flags.

The deeper issue is the filename contains a literal `#U00e9` (a Unicode escape that wasn't decoded back to `é`) — a stale artifact from some earlier rename script. Properly fixing means renaming to `Ch458_Guillain-Barré_Syndrome_and_Other_Immune.pdf` and updating the map. Cosmetic, not user-facing. **Deferred.**

### Skipped checks

- **RLS sanity pass** (skill Phase 1 mandatory sub-step): NOT triggered — v10.3.0 was UI-only, no schema changes, no migrations, no Supabase MCP `execute_sql` writes. Per the skill's rule, mandatory only when "the current session touched, or the audit surfaces, anything schema-adjacent". Defer to next schema-touching change.
- **Manual UI verification**: cannot be performed by the agent (no browser interaction). Owner to verify on the live deploy when convenient.

### Conclusion

v10.3.0 ships clean. F-1 was a false-positive CRLF artifact, root cause identified and structurally fixed this run. F-2 is cosmetic and deferred. No blocking issues.
