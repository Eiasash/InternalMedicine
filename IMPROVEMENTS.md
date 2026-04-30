# IMPROVEMENTS — InternalMedicine (Pnimit Mega)

Rolling audit log for `audit-fix-deploy` runs. Most recent at top.

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
