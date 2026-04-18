# Test Coverage Analysis — Pnimit-Mega (Internal Medicine)

_Date: 2026-04-17_
_Scope: `tests/**`, `src/**`, `shared/**`, `pnimit-mega.html`, `sw.js`_

## 1. What we have today

Vitest-driven suite, 9 files:

| Test file | Style | Target |
|---|---|---|
| `appLogic.test.js` | Unit (copied pure functions) | FSRS math, STOPP/ACB, sanitize, `buildMockPool`, `calcStreak`, `isExamTrap`, `isChronicFail`, `getDueQuestions`, `getTopicStats` |
| `appLogicExpanded.test.js` | Unit (copied) | Additional edge cases |
| `appIntegrity.test.js` | Static text/regex on HTML | Doctype, RTL, version sync, manifest fields |
| `dataIntegrity.test.js` | JSON schema | `data/questions.json`, `notes.json`, etc. |
| `expandedDataIntegrity.test.js` | JSON schema | Deeper invariants |
| `serviceWorker.test.js` | Static text/regex on `sw.js` | Cache keys, URL lists, lifecycle, background sync, push |
| `sharedFsrs.test.js` | Reads `shared/fsrs.js` via `new Function(...)` | Exports + algorithm |
| `coverageGaps.test.js` | Static text/regex on HTML **and** external `src/` modules | AI proxy routing, CSP, sanitize usage counts |
| `regressionGuards.test.js` | Mixed | Mojibake (`ð`), RTL-reversed digits, Hebrew-digit spacing, fragment bleed, canonical-JSON sync, per-session question count locks, build-vs-repo SW divergence |

Unlike Geriatrics, much of the code has been **extracted out of the HTML** into `src/` modules: `core/{constants,data-loader,globals,state,utils}.js`, `quiz/{engine,modes}.js`, `sr/{fsrs-bridge,spaced-repetition}.js`, `ai/{client,explain}.js`, `features/cloud.js`, `services/supabaseAuth.js`, `ui/{app,learn,library,more,quiz,track}-view.js`. Coverage did not follow: almost none of those modules has a dedicated `*.test.js`.

## 2. The structural problem: **test-copy drift**

`appLogic.test.js` re-declares `fsrsR`, `sanitize`, `getSTOPPWarnings`, etc. verbatim instead of importing from `src/core/utils.js` or `shared/fsrs.js`. If the real module diverges, the test still passes. `coverageGaps.test.js` partially fixes this by concatenating `src/*.js` into an `allSource` string and grepping — but regex presence ≠ behavior, and the majority of logic is tested only against copies.

## 3. Gap areas, ranked by risk

### 3.1 HIGH — Extracted `src/` modules are regex-tested but not behavior-tested
- `src/quiz/engine.js` (18 KB) has `buildPool`, `startTopicMiniExam`, `startMockExam`, `buildMockExamPool`, smart-shuffle tiers, year filtering, on-call mode, mock-exam per-topic analytics — **none** of this has a unit test.
- `src/sr/spaced-repetition.js` has `srScore` (stateful FSRS mutation on `G.S.sr`), `buildRescuePool`, `getWeakTopics`, `getChaptersDueForReading`, `isExamTrap` (module version differs slightly from the copy in `appLogic.test.js`!).
- `src/core/utils.js` has `isMetaOption`, `remapExplanationLetters`, `getOptShuffle` — important for correctness of option-shuffled exams with "A and C" / "כל התשובות נכונות" meta-options. Only `sanitize` is tested, via a copy.
- `src/core/state.js` contains a **one-time tag migration** (`Jun21` → `2021-Jun`, etc.) gated by `__tagMigrationV1`, plus localStorage→IndexedDB migration and 4 MB quota warning. All untested.
- `src/ai/client.js`, `src/ai/explain.js` (teach-back JSON parsing, `aiAutopsy` HTML formatting after sanitize) — untested.
- `src/features/cloud.js` — leaderboard submission guard (`LB_MIN_ANSWERED=20`), `cloudBackup`/`cloudRestore` (409 → PATCH fallback, schema whitelist on restore), `submitReport` (AI verdict parse) — untested.
- `src/services/supabaseAuth.js` — OAuth wrapper — untested.
- `src/ui/*-view.js` (~140 KB of render functions) — untested.
- **Propose:** add `tests/quizEngine.test.js`, `tests/spacedRepetition.test.js`, `tests/utils.test.js`, `tests/state.test.js`, `tests/cloud.test.js`, `tests/aiClient.test.js`. Use `vi.mock` for `fetch`, `localStorage`, `indexedDB`, and `window.location`.

### 3.2 HIGH — `srScore` state mutation is the app's core and has no direct test
- `srScore(qIdx, correct, fsrsRating)` mutates `G.S.sr[qIdx]`, migrates from SM-2 to FSRS lazily, recomputes `ef` as a proxy of `fsrsD`, updates `at` (answer-time moving average), calls `trackDailyActivity`. A regression here silently corrupts everyone's review schedule.
- **Propose:** tests for: first-time call initializes via `fsrsInitNew`, existing SM-2 entry triggers `fsrsMigrateFromSM2`, `s.ts` capped at 10 entries, `s.ef` stays in [1.3, 2.5], wrong answer resets `s.n` to 0, `next` is `fsrsInterval(fsrsS) * 86400000` in the future.

### 3.3 HIGH — Tag migration in `state.js` has no regression lock
- `migrateExamYearTags` rewrites persisted state from `Jun21` → `2021-Jun`. If someone adds a new tag to the MAP, walks the wrong way, or forgets the `__tagMigrationV1` sentinel, users lose filter selections or the migration runs twice.
- **Propose:** test with a pre-seeded `localStorage[LS]` containing old tags in nested arrays, objects, and object keys. Assert idempotency, assert new tag shape, assert sentinel set.

### 3.4 HIGH — IDB migration (`migrateToIDB`) and save override untested
- `G.save` is dynamically replaced with an IDB version after migration. A race with pre-migration saves could drop writes.
- **Propose:** mock `indexedDB`, assert: new user → IDB seeded from `G.S`, returning user with `localStorage[LS]` → copied to IDB and LS cleared, returning user with existing IDB entry → `Object.assign(G.S, existing)`, replaced `G.save` debounces 150 ms and falls back to localStorage on IDB error.

### 3.5 MEDIUM — Service worker `fetch`/`sync`/`push` handlers run only as static strings
- `serviceWorker.test.js` and `regressionGuards.test.js` check that certain substrings appear. They do **not** verify that `fetch` for navigation falls back to `pnimit-mega.html` on network error, or that `sync` for `supabase-backup` clears `pending_sync` only on a successful POST.
- **Propose:** boot `sw.js` inside `serviceworker-mock`, simulate `install`/`activate`/`fetch`/`sync`/`message`/`notificationclick`, assert full behavior. This also replaces the brittle `repo sw.js ↔ scripts/build.sh SWEOF template` string-comparison with a real equivalence test.

### 3.6 MEDIUM — `aiAutopsy` post-sanitize HTML injection surface
- `aiAutopsy` calls `sanitize(txt)` and then does `.replace(/✗/g, '<b>...</b>')` plus regex-based color wrapping. The `<br>` injection from `\n` is safe, but the replacement chain creates raw HTML that reaches `innerHTML`. A future edit could introduce a user-controllable regex group, breaking the invariant.
- **Propose:** a property test: for a fuzzed AI response containing random characters incl. `<`, `>`, `&`, `"`, `'`, `\u202e`, assert the final rendered DOM contains zero `<script>` nodes and zero non-whitelisted tags.

### 3.7 MEDIUM — `getOptShuffle` determinism and meta-option pinning
- Pure function in `utils.js` that **matters for exam integrity** — if the seed drifts or meta-options ("A and C", "כל התשובות נכונות") are shuffled, the answer key breaks.
- **Propose:** tests for:
  - Same `qIdx` twice → same `map`.
  - Different `qIdx` → generally different `map` (test several).
  - Options matching `isMetaOption` stay at the end of `map` in original order.
  - `remapExplanationLetters` rewrites `A` → letter at shuffled position for both English (`A-E`) and Hebrew (`א-ה`).

### 3.8 MEDIUM — Leaderboard score guard is undertested
- `submitLeaderboardScore` skips submission below `LB_MIN_ANSWERED=20` and when `calcEstScore()` is null. Current tests do not lock that threshold — a future refactor silently pollutes the global board with neutral-60% entries for thin-data users.
- **Propose:** test below, at, and above threshold; test null `calcEstScore`; test `fetch` 4xx logs but does not throw.

### 3.9 MEDIUM — Cloud restore schema whitelist
- `cloudRestore` whitelists keys with `new Set(Object.keys(G.S))` before `Object.assign`. If `G.S` temporarily contains a new key before the user has saved once, a restore could skip it — or, worse, a future edit could weaken the whitelist and accept attacker-controlled keys from a shared device ID.
- **Propose:** test: restore strips keys not in the current `G.S` keyset; retains nested content under whitelisted keys; 409 on POST triggers the PATCH path.

### 3.10 LOW — No end-to-end / DOM rendering tests
- No test boots `pnimit-mega.html` under jsdom and clicks a question. Broken `render()` ships.
- **Propose:** a single smoke test: load HTML, wait for `G.QZ` to populate from `data/questions.json`, click the first quiz tab, answer one question, assert `G.S.qOk` increments and IDB/localStorage round-trips.

### 3.11 LOW — Content-quality guards only cover known past-exam tags
- `regressionGuards.test.js` applies mojibake and formatting checks to `PAST_EXAM_TAGS`. `Harrison` (589 Qs) and `Exam` (20 Qs) skip these checks.
- **Propose:** drop the `PAST_EXAM_TAGS` gate for the `ð` mojibake scan (it's never a legitimate character) and for the question-mark-adjacent-to-Hebrew check.

## 4. Suggested implementation order

1. **Point the existing `appLogic.test.js` blocks at real `src/` imports** instead of copied functions. Zero new assertions needed, massive drift risk removed. (§2, §3.1)
2. **Unit tests for `srScore`, tag migration, IDB migration in `state.js`** — these silently corrupt user data if they regress. (§3.2, §3.3, §3.4)
3. **`getOptShuffle`/`isMetaOption`/`remapExplanationLetters` tests.** Small, high-value, exam-integrity-critical. (§3.7)
4. **Leaderboard + cloud restore guard tests.** (§3.8, §3.9)
5. **`aiAutopsy` XSS property test.** (§3.6)
6. **Broaden `regressionGuards.test.js`** to all tags for the mojibake scan. (§3.11)
7. **Full `sw.js` runtime tests** via `serviceworker-mock`, replacing the `build.sh` SWEOF string diff. (§3.5)
8. **Quiz engine unit tests** (`buildPool`/`buildMockExamPool`/on-call flow). (§3.1)
9. **Smoke E2E under jsdom.** (§3.10)

Steps 1–4 are each 1–3 hours and retire the largest silent-failure risks. Step 7 (runtime SW) replaces a fragile string-equality test that breaks on whitespace with a real behavioral check.
