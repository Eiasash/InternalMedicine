# Pnimit Image Bucket Cleanup Report — 2026-04-21

Part of the session-wide infrastructure audit (companion to `docs/IMAGE_CLEANUP_2026-04-21.md`
in the Geriatrics repo).

Bucket: `question-images` in Supabase project `krmlzwwelqvlfslwltol` (Toranot, shared).

## Summary

| | Value |
|---|---|
| Pnimit files in bucket | 313 |
| Referenced by `data/questions.json` | 154 unique filenames (162 Q img fields, 10.5%) |
| Orphans (uploaded, no Q references) | **159** |
| Missing (referenced, not in bucket → 404) | **0** |

Pnimit has zero broken-image Qs — every `img` field points to a real bucket object. The
313 vs 154 gap = 159 files uploaded but not yet wired. Most are from `pnimit_Jun21_*`
and `pnimit_Jun23_*` series — likely staged for future wiring during next ingestion
session.

See `pnim_orphans_2026-04-21.txt` for the full list.

## Related Geri-side state (for cross-reference)

- Bucket 145 Geri files, 111 referenced, **40 orphans**, **0 missing**
- 5 Geri Qs had their img fields stripped + flagged `imgDep:true, imgMissing:true`
  because referenced files weren't in the bucket. Listed in Geriatrics repo
  `docs/IMAGE_CLEANUP_2026-04-21.md`.
- Stray `test_upload_check.jpg` deleted.

## Infrastructure state (both apps)

- All tables live in `public` schema, separated by prefix (`pnimit_*` vs `samega_*`/`shlav_*`).
- `geriatrics` schema was created then dropped — see Geri `docs/IMAGE_CLEANUP_2026-04-21.md`
  for the full post-mortem.
- Leaderboard indexes present: `pnimit_leaderboard_accuracy_idx` on
  `(accuracy DESC NULLS LAST, answered DESC)`.
- RLS: INSERT/SELECT/UPDATE only, no DELETE.
