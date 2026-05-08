-- Pnimit (Internal Medicine) leaderboard — server-side upsert RPC.
--
-- Live-state finding 2026-05-08: pnimit_leaderboard is in `public`, NOT
-- in `internal_medicine` schema. The schema-split migration
-- 20260421120000_split_app_schema.sql was apparently not applied (its
-- ALTER TABLE IF EXISTS silently no-ops if the table is already where
-- it expects, but in this case the table never moved). Live shape:
-- ts is `timestamptz` (default now()), accuracy is `integer`, no
-- updated_at column.
--
-- This RPC writes against the actual live shape:
--   * ts text (ISO) -> timestamptz (auto-cast).
--   * accuracy stored as integer (rounded percent).
--   * No updated_at write.
--
-- Idempotent (CREATE OR REPLACE FUNCTION). Reversible:
--   DROP FUNCTION IF EXISTS public.pnimit_leaderboard_upsert(text,int,int,int,int,text);

CREATE OR REPLACE FUNCTION public.pnimit_leaderboard_upsert(
  p_uid       text,
  p_answered  int,
  p_correct   int,
  p_streak    int,
  p_readiness int,
  p_ts        text DEFAULT NULL
)
RETURNS public.pnimit_leaderboard
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  result  public.pnimit_leaderboard;
  v_ts    timestamptz;
BEGIN
  IF p_uid IS NULL OR length(trim(p_uid)) = 0 THEN
    RAISE EXCEPTION 'p_uid required';
  END IF;
  IF p_answered IS NULL OR p_answered < 0 THEN
    RAISE EXCEPTION 'p_answered must be >= 0';
  END IF;
  IF p_correct IS NULL OR p_correct < 0 OR p_correct > p_answered THEN
    RAISE EXCEPTION 'p_correct must be in [0, p_answered]';
  END IF;

  IF p_ts IS NULL OR length(trim(p_ts)) = 0 THEN
    v_ts := now();
  ELSE
    BEGIN
      v_ts := p_ts::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      v_ts := now();
    END;
  END IF;

  -- public.pnimit_leaderboard.accuracy is GENERATED ALWAYS AS — must NOT be assigned.
  -- Postgres throws PG 428C9 if we try. Generation expression matches what we
  -- would have computed: ROUND((correct::numeric / answered::numeric) * 100)::integer.
  INSERT INTO public.pnimit_leaderboard
    (uid, answered, correct, streak, readiness, ts)
  VALUES (
    p_uid,
    p_answered,
    p_correct,
    COALESCE(p_streak, 0),
    GREATEST(0, LEAST(100, COALESCE(p_readiness, 0))),
    v_ts
  )
  ON CONFLICT (uid) DO UPDATE SET
    answered  = EXCLUDED.answered,
    correct   = EXCLUDED.correct,
    streak    = EXCLUDED.streak,
    readiness = EXCLUDED.readiness,
    ts        = EXCLUDED.ts
  RETURNING * INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE
  ON FUNCTION public.pnimit_leaderboard_upsert(text, int, int, int, int, text)
  TO anon, authenticated;

COMMENT ON FUNCTION public.pnimit_leaderboard_upsert IS
  'Idempotent leaderboard upsert. Accepts ts as text (ISO 8601), stores as timestamptz. '
  'Computes accuracy server-side as integer. SECURITY DEFINER bypasses RLS. '
  'Sibling: mishpacha_leaderboard_upsert (FM), shlav_leaderboard_upsert (Geri).';
