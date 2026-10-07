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

-- Storage (only what the policies need)
create schema storage;
grant usage on schema storage to anon, authenticated;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  unique (bucket_id, name)
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to authenticated;
create function storage.foldername(name text) returns text[]
language plpgsql as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end
$$;

-- pg_net stand-in: records requests instead of sending them
create schema net;
create table net.requests (id bigserial primary key, url text, body jsonb, headers jsonb);
create function net.http_post(
  url text,
  body jsonb default '{}'::jsonb,
  params jsonb default '{}'::jsonb,
  headers jsonb default '{"Content-Type": "application/json"}'::jsonb,
  timeout_milliseconds integer default 5000
) returns bigint
language sql as $$
  insert into net.requests (url, body, headers) values (url, body, headers) returning id;
$$;

-- Realtime publication
create publication supabase_realtime;
