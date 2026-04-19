# Test Coverage Analysis — InternalMedicine

_Generated 2026-04-19. Scope: `src/**`, `shared/**`, `sw.js`, `pnimit-mega.html` against `tests/*.test.js` (18 specs). Runner: Vitest, global thresholds `lines:50 / branches:40` in `vite.config.js`._

## 1. What is covered well

| Area | Test file(s) | Notes |
| --- | --- | --- |
| FSRS-4.5 core math | `sharedFsrs.test.js`, `flashcardFsrs.test.js` | Good: `fsrsR`, `fsrsInterval`, `fsrsUpdate`, chronic-fail detection. |
| SR score wrapper | `srScore.test.js` | Covers happy path for `srScore()`. |
| Tag migration | `tagMigration.test.js` | Schema-version bumps on stored SR data. |
| XSS on AI output | `aiAutopsyXss.test.js`, `realSanitize.test.js` | Autopsy sink + `sanitize()` at the boundary. |
| Data integrity | `dataIntegrity.test.js`, `expandedDataIntegrity.test.js`, `contentQuality` (geriatrics sibling) | Schema of questions/notes JSON. |
| Restore whitelist | `cloudRestore.test.js` | `filterRestorePayload()` proto-pollution + unknown-key gate. |
| Leaderboard gate | `leaderboardGuard.test.js` | `LB_MIN_ANSWERED`, thin-data skip. |
| Option shuffle determinism | `optShuffle.test.js` | Answer index remapping. |
| Service-worker top-level | `serviceWorker.test.js` | Registration + version string shape. |
| App-boot regressions | `appIntegrity.test.js`, `regressionGuards.test.js`, `appLogic*.test.js` | Guards specific historical bugs. |
| Topic reference coverage | `topicRefCoverage.test.js`, `coverageGaps.test.js` | Each topic has questions; no orphan `ti`. |

## 2. Largest untested surfaces

Files in `src/` with **no direct unit test** (behaviour exercised only indirectly by regression guards running jsdom against `pnimit-mega.html`):

| File | LOC | Gap |
| --- | ---: | --- |
| `src/quiz/engine.js` | ~450 | `buildPool` tier ordering, `buildMockExamPool` topic weighting, `startMockExam` → `endMockExam` per-topic accounting, `toggleYearFilt` set semantics, `startOnCallMode` fallback chain. |
| `src/ui/track-view.js` | ~1500 | `calcEstScore()` (imported by cloud.js — the leaderboard gate depends on it). No direct test of its output distribution. |
| `src/ui/quiz-view.js` | ~900 | Renders quiz HTML; no snapshot, no XSS test beyond autopsy. |
| `src/ui/library-view.js` | ~700 | Chapter listing, search; no tests. |
| `src/ui/learn-view.js` | ~400 | Note rendering, RTL. |
| `src/ui/more-view.js` | ~350 | Settings surface. |
| `src/quiz/modes.js` | ~120 | Pomodoro timer state machine, Sudden Death leaderboard sort/trim, voice parser keyword extraction. |
| `src/features/cloud.js` | ~450 | Only `filterRestorePayload` and the leaderboard gate are tested. `cloudBackup` (409 upsert path), `fetchLeaderboard`, `submitReport`, `saveAnswerReport`, `getDiagnostics` all untested. |
| `src/ai/client.js`, `src/ai/explain.js` | ~250 | Prompt construction, truncation, `_exCache` persistence, retry/timeout — none tested. |
| `src/services/supabaseAuth.js` | ~80 | No tests. |
| `src/core/data-loader.js` | ~100 | No tests for malformed JSON, network failure, or cache invalidation. |
| `src/core/state.js` | ~150 | Save/load round-trip, corrupt-localStorage recovery. |
| `src/core/utils.js` | ~120 | `sanitize` covered via XSS tests, but `fmtT`, date helpers, hash helpers not isolated. |
| `src/core/sw-update.js` | ~100 | Message-port handshake not tested (separate from root `sw.js` tests). |

## 3. Proposed areas to strengthen (ranked by impact)

### 3.1 Quiz-engine pure logic (`src/quiz/engine.js`) — **highest impact**
`buildPool` branches on `G.filt` (`traps | rescue | weak | due | hard | slow | topic | years | all`) and tier-shuffles `all` by FSRS difficulty. Each branch is a silent regression waiting to happen.

Write table-driven tests that seed `G.QZ` + `G.S.sr` in memory and assert:
- `filt='all'` → pool respects tier order (due → D>7 → D>4 → rest).
- `filt='hard'` → empty-result fallback still produces a sorted pool.
- `filt='years'` → intersection of `q.t` and selected years; empty `G.years` downgrades to `all`.
- `buildMockExamPool()` → count is 100 ± rounding, topic shares correlate with `EXAM_FREQ` within tolerance.
- `startMockExam` then N calls to `check()` → `mockExamResults.byTopic` matches seeded correctness.

### 3.2 FSRS boundary & migration edge cases (`src/sr/spaced-repetition.js`)
Currently we verify one happy path. Add:
- `srScore` with corrupted `s` (missing `ts`, negative `ef`, `fsrsS=NaN`).
- `srScore` when `lastReview` is in the future (clock skew).
- `fsrsMigrateFromSM2` for extreme inputs (`ef=1.3`, `ef=3.0`, `n=50`).
- `getStudyStreak` across a DST boundary (day key drift).
- `getChaptersDueForReading` with negative `dayThreshold` and empty `chReads`.
- `isExamTrap` with `tot<3` (should be false), and with `wc` entries summing above `tot`.

### 3.3 Cloud sync failure modes (`src/features/cloud.js`)
Mock `fetch` and cover:
- `cloudBackup`: happy path (200), conflict (409) → PATCH retry success, PATCH failure → user-visible error.
- `cloudRestore`: 404 row, multiple rows returned (take first), confirmed rollback cancels.
- `submitLeaderboardScore`: `calcEstScore()` returns null → `{skipped:'no_est'}`.
- `saveAnswerReport`: payload length clamped to 200/50 chars.
- `submitReport`: AI verdict parser (VERDICT: CORRECT / WRONG detection) — seed text variations.

### 3.4 AI client safety (`src/ai/client.js`, `src/ai/explain.js`)
- Prompt-injection: user text containing `</prompt>` or role markers is not interpreted as control flow.
- `_exCache` grows monotonically, persists to `pnimit_ex`, survives JSON-parse failure.
- Timeouts / fetch rejections produce a deterministic fallback, no unhandled rejection.
- `aiAutopsy` result is always sanitized before insertion (already tested — extend with RTL/Hebrew payloads).

### 3.5 Quiz modes state machines (`src/quiz/modes.js`)
- Pomodoro: start → tick 3000 times → break overlay appears; `stopPomodoro` clears interval + DOM.
- Sudden Death: 20 correct → leaderboard sorted desc, trimmed to 10, persisted to `pnimit_sd_lb`.
- Next-Best-Step filter: regex matches Hebrew and English synonyms.
- Voice parser: `G.srchQ` contains only tokens length>2.

### 3.6 Data-loader & state resilience
- Corrupt `localStorage` (invalid JSON) → app still boots with default `G.S`.
- Future-dated schema version → migration no-op, no data loss.
- Cross-version restore (older backup) → `filterRestorePayload` drops keys the new schema no longer uses (already covered) **and** forward-fills missing defaults (not covered).

### 3.7 UI rendering snapshots / XSS
UI views (`quiz-view.js`, `library-view.js`, `track-view.js`) build HTML by string concatenation. Current tests rely on a single autopsy sanitization check.
- Add a snapshot test per view with a minimal fixture, asserting no unescaped `{{`/`<script` sneaks through.
- Property-based test: `sanitize(fuzz)` output fed into each view's template never produces a `<script>`, `onerror=`, or `javascript:` URL.

### 3.8 Service-worker upgrade contract
- `sw.js` cache naming is tested. Not tested: on `activate`, old caches are deleted; `src/core/sw-update.js` posts a `SKIP_WAITING` message when a new worker is waiting; clients reload exactly once per version.

### 3.9 Supabase auth (`src/services/supabaseAuth.js`)
- Expired token → silent sign-out, `G.S.auth` cleared.
- Anonymous fallback preserves local state on sign-in / sign-out.

## 4. Coverage configuration

`vite.config.js` currently sets `lines:50 / branches:40`. Two changes recommended:

1. **Ratchet critical modules**. Add per-file thresholds in `coverage.thresholds['src/quiz/engine.js']`, `src/sr/spaced-repetition.js`, `src/features/cloud.js`, `src/core/state.js` → `lines:85 / branches:75`.
2. **Exclude `src/ui/**` from global thresholds** and treat it with snapshot tests instead, so UI refactors don't drag the global number down.

## 5. Beyond unit tests

- **Smoke/E2E**: one Playwright test that loads `pnimit-mega.html` in headless Chromium, answers a question, triggers a restore, and asserts no console errors. Catches asset/path/CSP regressions that Vitest can't see.
- **Cross-app parity**: `shared/fsrs.js` is vendored into both Geriatrics and InternalMedicine. Add a single test that imports both copies and asserts byte-identical exports, preventing silent drift.
- **Hebrew/RTL fixtures**: promote the Hebrew glossary skill's terms into a fixture used by sanitization + view snapshots, so locale regressions surface.

## 6. Quick-win list (in priority order)

1. `buildPool` tier-ordering test (§3.1)
2. `buildMockExamPool` topic-weighting test (§3.1)
3. `cloudBackup` 409→PATCH path (§3.3)
4. `srScore` corrupt-state resilience (§3.2)
5. Pomodoro + Sudden Death state machines (§3.5)
6. Per-module coverage thresholds (§4)
7. Playwright smoke test (§5)
