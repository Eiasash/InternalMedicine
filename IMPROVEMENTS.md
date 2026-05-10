# IMPROVEMENTS — InternalMedicine (Pnimit Mega)

Rolling audit log for `audit-fix-deploy` runs. Most recent at top.

---

## 2026-05-10 — IM ESLint 10 warning categorization (mirror of FM #49)

**Read-only triage of the lint surface revealed by PR #106 (Vite 8 + ESLint 10 majors upgrade), after PR #107 (4 `no-useless-assignment` cleared).** No source-code edits in this pass. Goal: size the drain, identify what can be auto-fixed vs config-fixed vs hand-drained, and surface what cannot.

**Actual counts** (from `npx eslint . --format json` on commit at `claude/term-im-lint-categorization-2026-05-10` head):

| Severity | Count |
|---|---|
| Warnings | 180 |
| Errors  | 37 |
| **Total** | **217** |

### By rule

| Rule | Severity | Count | Top files |
|---|---|---|---|
| `no-unused-vars` | warn | 179 | `src/ui/app.js` (86), `src/features/cloud.js` (16), `src/ui/library-view.js` (10), `src/ui/track-view.js` (9), `src/quiz/engine.js` (7) |
| `no-undef` | error | 34 | `sw.js` (34) — *only file* |
| `no-useless-assignment` | error | 2 | `src/debug/console.js:97`, `src/ui/app.js:80` |
| `no-empty` | error | 1 | `shared/install-promo.js:82` |
| `prefer-const` | warn | 1 | `src/features/cloud.js:27` |

**Severity vs FM delta worth noting:** IM's `eslint.config.js` keeps `no-unused-vars` at **warn** for `src/**` and `shared/**` (FM upgraded to **error** in src/). This is why IM's warn/error split is 180/37 vs FM's 187/63 even though IM is the smaller surface (217 vs 250). Promoting IM to error to match the sibling is a separate editorial decision — not in scope for this audit.

### `no-unused-vars` subcategorization (179 total)

| Sub-pattern | Count | Auto-fixable? | Notes |
|---|---|---|---|
| `unused-binding` (declared / `let`-assigned but never read; `Allowed unused vars must match /^_/u`) | 111 | No | ESLint 10 does not auto-fix declared variables (semantically unsafe — could hide intentional declarations or destructuring slots). |
| `caught-error` (bare `'X' is defined but never used`, no "Allowed" suffix) | 61 | No | These are `catch (e)` / `catch (_)` clauses. ESLint 10 changed `no-unused-vars`'s `caughtErrors` default from `'none'` (pre-9) to `'all'`. IM's config sets `argsIgnorePattern` and `varsIgnorePattern` but no `caughtErrorsIgnorePattern` — so `^_` doesn't shield catch params here. Two paths to clear (see drain strategy). |
| `unused-arg` (`Allowed unused args must match /^_/u`) | 7 | No | Trivially satisfied by renaming param to `_<name>`. |

**`no-undef` is environment-config noise, not real bugs:**
- `sw.js` (34) — uses `self`, `caches`, `fetch`, `clients`, `URL`, `indexedDB`, `console`. Service-worker globals; needs `globals: globals.serviceworker` (or per-file override) in `eslint.config.js`. **Unlike FM, IM has zero chaos-reports noise** — IM's `eslint.config.js:84` already ignores `scripts/`.

### Auto-fix reality check

`npx eslint . --fix` will only clear **1 warning** (the `prefer-const` site). Per ESLint's `fix` field on each message:

| Rule | Reported | Has `fix` payload | Has only `suggestions` |
|---|---|---|---|
| `prefer-const` | 1 | 1 | 0 |
| `no-unused-vars` | 179 | 0 | 123 (suggestions, not auto-applied) |
| `no-undef` | 34 | 0 | 0 |
| `no-useless-assignment` | 2 | 0 | 0 |
| `no-empty` | 1 | 0 | 1 |

### By drain difficulty

| Bucket | Count | Effort estimate |
|---|---|---|
| **TRIVIAL** — `prefer-const` (auto-fix), `no-undef` (config-only fix in `eslint.config.js`: add `serviceworker` globals for `sw.js`) | 1 + 34 = **35** | ~5 min total: one `--fix` invocation + one config-file edit. Lower than FM (55) only because IM has no chaos-reports noise. |
| **TRIVIAL-EDITORIAL** — `caught-error` subset of `no-unused-vars` (61). Two options: (a) one-line config `caughtErrorsIgnorePattern: '^_'` + bulk rename `catch (e)` → `catch (_e)` across ~16 files, or (b) one-line config `caughtErrors: 'none'` to silence the rule for catch params (matches pre-ESLint-9 behavior, also silences future). | **61** | ~20 min for option (a); <2 min for option (b). **Surface the choice — don't pre-commit.** |
| **SAFE-MANUAL** — `unused-arg` rename to `_<name>` | **7** | ~30s/site = ~5 min. Each site needs a glance to confirm the param is part of an externally-imposed signature (Promise constructor reject, event handler) rather than dead code. |
| **MEDIUM-MANUAL** — `unused-binding` (111 declared/assigned but never read) | **111** | ~1 min/site = ~110 min if treated as bulk delete; faster if grouped by file (81 sit in `src/ui/app.js` alone — likely dead imports / leftover handler bindings from the v10.4.x window-binding reduction work). Half are likely safe deletions. |
| **RISKY** — none | **0** | IM has **zero** `no-useless-escape` (FM had 9 in its hot-path `src/core/constants.js` and `tests/textbookChapters.test.js` regex ref-parsers). IM's `no-useless-assignment` (2 stragglers) is closer to SAFE-MANUAL than RISKY: PR #107 already cleared 4 of these by hand; the remaining 2 (`debug/console.js:97`, `app.js:80`) are mechanical dead-store deletions. |
| **DEFER (cross-repo)** — `shared/install-promo.js:82` `no-empty` + `shared/install-promo.js` 1× var + `shared/fsrs.js:104` 1× catch | **3** | <2 min each, but `shared/` files are workspace-shared. Per `.shared/README.md`, fix in `.shared/install-promo.js` and propagate to all 6 siblings; `shared/fsrs.js` is byte-identical across the 3 medical PWAs (canonical md5 `71f9f2d4…`) — coordinate with Geri + FM. The `no-empty` site is the **same site** as FM's. Bundle into a coordinated workspace-level pass. |

### Recommended drain strategy

| PR | Scope | Risk | Reviewer cost |
|---|---|---|---|
| **PR1 (autonomous)** | `eslint.config.js` only — add `serviceworker` globals for `sw.js` (per-file or via override). Clears **34 `no-undef`** with zero source-code touch. | Low (config-only) | <2 min |
| **PR2 (autonomous)** | `npx eslint . --fix` — clears **1 `prefer-const`** in `src/features/cloud.js:27` (`let uid` → `const uid`). 1-line diff. | Trivial | <2 min |
| **PR3 (editorial decision needed)** | Either (a) add `caughtErrorsIgnorePattern: '^_'` + rename catch params (~16 files) or (b) set `caughtErrors: 'none'` (1-line silencer). Clears **61 `no-unused-vars`** in catch clauses. **Recommend asking user before this PR.** | Low | 1-line config or ~20-min rename |
| **PR4 (semi-auto)** | Rename **7 `unused-arg`** params to `_<name>`. Mechanical edit, glance per site to confirm signature is externally-imposed. | Low | ~5 min |
| **PR5 (semi-auto)** | Delete **2 `no-useless-assignment`** stragglers (`debug/console.js:97`, `app.js:80`) — mirrors PR #107's pattern. | Low | ~5 min |
| **PR6 (manual, file-batched)** | Drain **111 `unused-binding`** by file — one PR for `src/ui/app.js` (81 sites, likely the bulk of dead imports), one for the long-tail (~30 sites across ~10 files). Visual diff per file. | Medium-Low (most are dead imports from earlier refactors) | ~30 min/PR × 2 PRs |
| **(deferred)** | **3 cross-repo** `shared/` reports. Land in `.shared/install-promo.js` first, then propagate to all 6 siblings; `shared/fsrs.js` catch needs trinity-coordinated bump. Bundle into the next workspace-level `.shared/` propagation pass. | Cross-repo coordination | Per workspace policy, not per-repo |

**Net**: PR1 + PR2 alone clear **35 of 217** (16%) for ~5 min of autonomous work and a near-zero-risk diff. PR3 option (b) bumps that to **96/217 (44%)** with one extra config line; PR3 option (a) achieves the same 96 with a more intent-preserving rename. PR4+PR5 add another **9** with light review. Bulk of the surface (111 unused bindings) is mechanical-but-volume work, best batched by file — and 73% of it lives in `src/ui/app.js` alone.

### What I am NOT recommending

- **Single mega-PR clearing all 217** — review fatigue, revert risk on `no-unused-vars` where each "dead" binding could be a load-bearing destructuring slot or an intentional re-export.
- **Pre-committing the `caughtErrors` editorial choice** — both paths have trade-offs (option (a) preserves intent visibility, option (b) silences future too). Surface to user.
- **Promoting `no-unused-vars` from `warn` to `error` in IM `src/**`** to match FM — that would mass-fail every existing PR; do this only after the queue is drained and as a separate decision.
- **Bumping lint to a CI-gating step in this pass** — current state is that 217 lint reports do not block CI. Promoting lint-to-CI before draining the queue would mass-fail every existing PR. PR1+PR2 should land first; CI-gate is a separate later decision.
- **Editing `shared/install-promo.js` or `shared/fsrs.js` in IM directly** — those files are workspace-shared. The `no-empty` fix needs to land in `.shared/install-promo.js` and be propagated to all 6 siblings in the same session, or `auto-audit` will open issues within 30 min. `shared/fsrs.js` (canonical md5 `71f9f2d4…`) is byte-identical across Geri/IM/FM — any edit needs all 3 in lockstep.

### Sibling parity (vs FM PR #49)

| Repo | Total | Warn | Error | TRIVIAL drainable in PR1+PR2 | RISKY |
|---|---|---|---|---|---|
| FM (PR #49 baseline) | 250 | 187 | 63 | 55 (22%) | 9 (`no-useless-escape`) |
| IM (this audit) | **217** | 180 | 37 | **35 (16%)** — lower % only because IM has no chaos-reports noise (already ignored) | **0** |

IM is the smaller and cleaner surface. With PR3 option (b) layered on, IM's drainable jumps to 96/217 (44%), beating FM's PR1+PR2 ratio. FM has executed PR1+PR2 (60/250 cleared, 24%) — IM PR1+PR2 of this plan should land at ~similar-or-better velocity given fewer config knobs to turn.

### Mechanical reproducer for the next audit
```bash
cd C:\Users\User\repos\InternalMedicine
npx eslint . --format json > /tmp/im_lint.json 2>/dev/null
# (on Windows + Node, copy to C:/tmp/ first — Node sees /tmp as C:\tmp)
node -e "JSON.parse(require('fs').readFileSync('C:/tmp/im_lint.json','utf8')).forEach(f => f.messages.forEach(m => console.log(f.filePath, m.line, m.ruleId, m.message)))"
```

**No version bump.** **No quartet bump** (`package.json` 4-part `10.4.20.0` left alone — regression test enforces). Memo-only PR; live verify-deploy still PASSES at v10.4.20.

---

## 2026-05-10 — v10.4.20 audit (audit-only, no behavior change)

**Trigger:** user-invoked `audit-fix-deploy` § E (autonomous mode, override rules 1-4). IM is at v10.4.20 from 2026-05-08 (`window.submitLeaderboardScore` exposed for chaos-bot programmatic submit; pairs with v10.4.19's SECURITY DEFINER RPC `pnimit_leaderboard_upsert`).

**Outcome:** 🟢 audit-only — every gate green, no real engineering issue surfaced. **No code change, no trinity bump, no PR, no live witness gate beyond the curl below.** Mirrors 2026-05-05 v10.4.13 precedent.

### STEP 0 detection — confirmed

- `pnimit-mega.html` ✓ + `src/core/constants.js` ✓
- `package.json` name = `pnimit-mega` ✓, version = `10.4.20.0` (deliberate `+.0` 4-part suffix per `regressionGuards.test.js:436`)
- branch `main`, working tree clean (only untracked `chaos-reports/` working artifact, gitignored per commit `8839b2c`)
- Two-Claude check (`git fetch --all && git log --all --since="2 days ago"`) — no live `claude/web-*` lanes; last web lane `claude/web-pnimit-tier2-bleed-guard` merged in `2e09d55`

### Audit checks — all green

| Check | Result |
|---|---|
| `node scripts/sync-sw-version.cjs` | OK: version 10.4.20 (constants.js APP_VERSION === sw.js CACHE === dist/sw.js CACHE) |
| `python3 scripts/check-innerhtml.py` | OK: No unsanitized innerHTML interpolation |
| `python3 scripts/check-innerhtml-pieces.py` | OK: 8 sites, all sanitized or annotated |
| `node scripts/harrison-hebrew-baseline.cjs --strict` | OK: 0 ≤ baseline 0 (1556 questions scanned) |
| `npm test` | **805 tests pass / 805 / 46 files** (Vitest 4.1.5, 1.22s) |
| `bash scripts/build.sh` | OK: dist 118M, CACHE=`pnimit-v10.4.20`, 13 cached paths verified, manifest fixed |
| Total Q count | 1556 (matches CLAUDE.md target) |
| Per-tag breakdown | 7 session-tags non-empty (2020:150, 2021-Jun:149, 2022-Jun:148, 2023-Jun:150, 2024-May:99, 2024-Oct:100, 2025-Jun:151) + Harrison:589 + Exam:20 |
| 24-topic coverage (ti < 5) | 0 weak topics — every ti 0..23 has ≥ 5 Qs |
| TOPICS / EXAM_FREQ / IMA_WEIGHTS lengths | 24 / 24 / 24 ✓ (all three exact length contract holds) |
| HARRISON_PDF_MAP missing files | 0 |
| Question `ch` refs without PDF map entry | 0 (no orphans) |
| `shared/fsrs.js` git-hash | `89aa3940a942c03201d9d89db02a90665b2910a8` — **byte-identical** with Geriatrics + FamilyMedicine siblings ✓ |
| Ungated `console.log` in `src/` | 0 |
| TODO/FIXME in `src/` | 1 (benign content note in `constants.js:24` re: 2020 month-of-exam unresolved) |

### Live witness — already PASS

```
$ curl -sL https://eiasash.github.io/InternalMedicine/sw.js | grep CACHE
const CACHE='pnimit-v10.4.20';
```

Live serves `pnimit-v10.4.20`, exactly matching `src/core/constants.js`. No drift. No reason to re-deploy.

### Watch-item spot-checks (all green)

| Watch item | File | Status |
|---|---|---|
| Honest-stats null-on-sparse-input (v9.92.x baseline) | `tests/honestStats.test.js` | exists, runs in `npm run verify` |
| Auto-restore-on-login gate (qOk+qNo=0 + no SR + suppress) | `tests/postLoginRestore.test.js` | covered |
| `package.json` 4-part `+.0` quirk | `tests/regressionGuards.test.js:436` | locked, did NOT normalize |
| HARRISON_PDF_MAP[458] silent-404 fix (v10.4.4) | `src/core/constants.js` | resolves; no orphans in scan |
| Track-Q backup_set RPC round-trip | `src/features/cloud.js` | `pnimit_leaderboard_upsert` SECURITY DEFINER live as of v10.4.19 |
| Chaos-bot v4 `window.submitLeaderboardScore` | `src/features/cloud.js` | exposed v10.4.20 (current) |
| Parser-bleed q-stem-truncation guard | `tests/parserBleedGuard.test.js` | tier-2 guard added in PR #103 (web Claude lane) |
| Chaos-bot v4 served↔canonical option-frame | `tests/chaosBotV4OptionResolver.test.js` | fix shipped in PR #104 (`198a35e`) |

### Window-bindings reconciliation (NOT a drift)

`grep -E "window\.X =" src/` returns 15 unique LHS assignments. CLAUDE.md says "16 (API surface)". Different denominators — CLAUDE.md's 16 includes HTML-shell `onclick=` users (`toggleStudyMode`, `showHelp`) that are *used* from `pnimit-mega.html` but assigned via different patterns. Total `window.X` references across `src/` + `pnimit-mega.html` = 44 unique; the docented "16" subset accounts for the API-surface bindings the architecture intentionally keeps. **No real divergence — do not refactor.**

### CLAUDE.md count-drift (cosmetic, NOT shipped this pass)

CLAUDE.md "Codebase Metrics" lists `Test files: 40 / Tests: 756` — actual is `46 / 805` (since 2026-05-08 chaos-bot PRs #100-104 added `chaosBotV4ExtractJson`, `chaosBotV4OptionResolver`, `parserBleedGuard`, `leaderboardGuard`, etc.). The `claude-md-drift-refresh` monthly routine (1st-of-month 09:00 Jerusalem) will pick this up; manual fix would conflict with that lane. **Defer.**

### Backlog NOT shipped (with rationale)

| Item | Why not shipped this pass |
|---|---|
| Chaos-bot v4 IM findings (~59 distinct flagged Qs from 2026-05-08 overnight) | Per `feedback_bot_triage_queues_have_high_false_positives` memory: do NOT auto-flip from bot output. Sample 10 per-Q sheets first. Content-authoring task with curator-override risk; not engineering. |
| `shared/fsrs.js isChronicFail()` Boolean-coercion patch | Cross-repo coordinated bump (Geri + IM + FM in lockstep). R3+ candidate. Already deferred 2026-05-05. |
| Vite 7→8 / ESLint 9→10 majors | Cross-repo plugin compat verification needed. R3+ candidate. |
| `@vitest/coverage-v8` config block | Speculative — coverage % is noisy on hand-tested codebase. Per CLAUDE.md rule #2 ("Nothing speculative"). |
| Live RLS sanity pass on `krmlzwwelqvlfslwltol` | Supabase MCP requires interactive OAuth; owned by Toranot CI cron pattern. |
| `window.submitLeaderboardScore` documentation in CLAUDE.md "Remaining Window Bindings" table | Cosmetic; will land in monthly drift refresh routine. |

### PAT audit

No GitHub PAT, Anthropic API key, or Supabase service-role key shapes appeared in this terminal session's visible context. `chaos-reports/` is gitignored.

### Output template

```
INTERNALMEDICINE — AUDIT-ONLY (no PR, no deploy)
Profile: § E
Detection: ✓ (pnimit-mega.html + constants.js + name=pnimit-mega + version 10.4.20.0)
Audit findings: 0 actionable issues
Fixes shipped: 0
Tests added: 0
Trinity bump: n/a — local v10.4.20 == live v10.4.20, no reason to bump
CI status: n/a — no push this cycle (last green build at 198a35e)
verify-deploy.sh: n/a — no deploy this cycle (live curl already confirms pnimit-v10.4.20)
Live URL: https://eiasash.github.io/InternalMedicine/ — serving v10.4.20 ✓
IMPROVEMENTS.md: updated ✓
Open follow-ups: chaos-bot v4 findings triage (content task), CLAUDE.md test-count refresh (monthly drift routine)
```

---

## 2026-05-05 — v10.4.13 deep audit (audit-only, no behavior change)

**Trigger:** workspace-wide deep audit pass across the 4 medical PWAs (Geriatrics, InternalMedicine, FamilyMedicine, ward-helper). IM's just-shipped state is v10.4.13 (Track-Q sibling propagation, cloud backup write path 401 fix landed today).

**Outcome:** 🟢 audit-only — backlog has no real engineering items that fit the 4-hour cross-repo budget. **No code change, no trinity bump, no live witness gate.**

### Watch-item spot-checks (all green)

| Watch item | File | Status |
|---|---|---|
| Honest-stats null-on-sparse-input (v9.92.x baseline) | `tests/honestStats.test.js` | exists, runs in `npm run verify` |
| Auto-restore-on-login gate (qOk+qNo=0 + no SR + suppress) | `tests/postLoginRestore.test.js:58-89` | `_isFreshState` covers the 3-condition gate |
| `package.json` 4-part `+.0` quirk | `tests/regressionGuards.test.js:436` | `expect(pkg.version).toBe(\`${appVer}.0\`)` — pinning the deliberate convention per CLAUDE.md |
| HARRISON_PDF_MAP URL-encode regression (v10.4.3 fix) | `src/core/constants.js` | grep `%[0-9A-F]{2}` clean — only hits a CHANGELOG narrative quote |
| Track-Q backup_set RPC round-trip | `src/features/cloud.js:152-159` | RPC URL + `{p_app:'pnimit', p_id, p_data}` body shape live; verify-deploy.sh witnessed v10.4.13 today |

### `npm run verify` — clean

Full pre-push gate ran green. 692+ tests pass across 35+ files (per latest baseline; lockstep with the v10.4.13 propagation).

### Backlog items NOT shipped (with rationale)

| Item | Why not shipped this pass |
|---|---|
| `shared/fsrs.js isChronicFail()` Boolean-coercion patch | Cross-repo coordinated bump (Geri + IM + FM in lockstep) — needs explicit 3-repo session. R3+ candidate per `IMPROVEMENTS.md` v10.4.4 R2 deferral. |
| Vite 6→8 / ESLint 9→10 majors | Cross-repo coordinated, plugin compat verification needed. R3+ candidate. |
| `@vitest/coverage-v8` config block | Speculative — coverage % is noisy on a hand-tested codebase. YAGNI per cross-repo skill convention. |
| Live RLS sanity pass on `krmlzwwelqvlfslwltol` | Supabase MCP requires interactive OAuth. Owned by Toranot CI cron pattern (proposed in FM `IMPROVEMENTS.md`). |
| Per-topic-per-year content gaps (38 zero cells) | Content-authoring task, not engineering. |
| Topic 17/19/21 zero session-tag overlap (Allergy, Pain/Palliative, Toxicology) | Same — content authoring, not in-scope. |

### Web Claude lane

`claude/web-doc-currency-20260505` is open on origin. This audit deliberately did NOT touch `CLAUDE.md` or `tests/docCurrency.test.js` to leave that lane clean for web Claude's PR/merge.

### PAT audit

No GitHub PAT, Anthropic API key, or Supabase service-role key shapes appeared in this terminal session's visible context. If other concurrent sessions exposed any, rotate per `~/.claude/CLAUDE.md` security rules.

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
