-- Split InternalMedicine tables into their own schema.
--
-- Background: project krmlzwwelqvlfslwltol is shared with the Geriatrics app.
-- Per-app tables are moved out of `public` into app-specific schemas so the
-- two apps cannot collide on table names and can be audited / backed up
-- independently. Shared tables (answer_reports, question-images bucket,
-- auth.*) stay where they are.
--
-- After applying this migration you MUST open the Supabase dashboard
-- (Project Settings -> API -> Exposed schemas) and add `internal_medicine`
-- to the list. Without that, PostgREST returns 404 for requests that target
-- the new schema via the Accept-Profile / Content-Profile headers.

create schema if not exists internal_medicine;

grant usage on schema internal_medicine to anon, authenticated, service_role;

alter default privileges in schema internal_medicine
  grant select, insert, update, delete on tables to anon, authenticated;
alter default privileges in schema internal_medicine
  grant usage, select on sequences to anon, authenticated;

alter table if exists public.pnimit_leaderboard set schema internal_medicine;
alter table if exists public.pnimit_feedback    set schema internal_medicine;
alter table if exists public.pnimit_backups     set schema internal_medicine;

grant select, insert, update, delete on all tables    in schema internal_medicine to anon, authenticated;
grant usage,  select                on all sequences in schema internal_medicine to anon, authenticated;
