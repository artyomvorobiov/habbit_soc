-- Minimal stand-in for the parts of Supabase that schema.sql relies on, so the
-- schema can be tested on a plain local Postgres (see supabase/tests/run.sh).
-- Never run this on a real Supabase project.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
grant usage on schema auth to anon, authenticated;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

create function auth.uid() returns uuid
language sql stable
as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

grant execute on function auth.uid() to anon, authenticated;

-- Supabase grants table access to the API roles by default and relies on RLS.
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
