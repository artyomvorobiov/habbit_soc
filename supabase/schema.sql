-- =============================================================================
-- Streakmates — database schema for Supabase (Postgres)
--
-- How to use: Supabase dashboard → SQL Editor → New query → paste this whole
-- file → Run. The script is idempotent: you can run it again after updating
-- the app, it will not delete your data.
--
-- Privacy model
--   * Every user sees their own data.
--   * Habits with visibility = 'friends' (and their check-ins) are visible to
--     accepted friends. 'private' habits are visible only to the owner.
--   * Habits linked to a challenge are visible to members of that challenge.
--   * Everything is enforced with Row Level Security, so the app cannot leak
--     data even if the client code is modified.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar       text not null default '🙂' check (char_length(avatar) between 1 and 16),
  created_at   timestamptz not null default now()
);

create table if not exists public.friendships (
  requester  uuid not null references public.profiles (id) on delete cascade,
  addressee  uuid not null references public.profiles (id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (requester, addressee),
  check (requester <> addressee)
);
-- Only one friendship row per pair of users, regardless of direction.
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee_idx on public.friendships (addressee);

create table if not exists public.blocks (
  blocker    uuid not null references public.profiles (id) on delete cascade,
  blocked    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);

create table if not exists public.habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  emoji         text not null default '✅' check (char_length(emoji) between 1 and 16),
  color         text not null default '#34C759' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  -- ISO weekdays the habit is scheduled on: 1 = Monday … 7 = Sunday
  days          smallint[] not null default '{1,2,3,4,5,6,7}'
                check (cardinality(days) between 1 and 7 and days <@ '{1,2,3,4,5,6,7}'::smallint[]),
  visibility    text not null default 'friends' check (visibility in ('private', 'friends')),
  reminder_time time,
  sort_order    integer not null default 0,
  archived_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists habits_user_idx on public.habits (user_id);

create table if not exists public.checkins (
  id         uuid primary key default gen_random_uuid(),
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  date       date not null,
  -- streak length as of this check-in (filled by a trigger, used by the feed)
  streak     integer not null default 1,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);
create index if not exists checkins_user_date_idx on public.checkins (user_id, date);
create index if not exists checkins_created_idx on public.checkins (created_at desc);

create table if not exists public.reactions (
  checkin_id uuid not null references public.checkins (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji      text not null check (emoji in ('🔥', '👏', '💪', '❤️', '🎉')),
  created_at timestamptz not null default now(),
  primary key (checkin_id, user_id)
);

create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  creator     uuid references public.profiles (id) on delete set null,
  title       text not null check (char_length(title) between 1 and 60),
  emoji       text not null default '🏆' check (char_length(emoji) between 1 and 16),
  color       text not null default '#FF9500' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  start_date  date not null,
  end_date    date not null,
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  created_at  timestamptz not null default now(),
  check (end_date >= start_date and end_date - start_date <= 365)
);

create table if not exists public.challenge_members (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'invited' check (status in ('invited', 'joined')),
  -- the habit that counts for this challenge (created when the user joins)
  habit_id     uuid references public.habits (id) on delete set null,
  invited_by   uuid references public.profiles (id) on delete set null,
  joined_at    timestamptz,
  primary key (challenge_id, user_id)
);
create index if not exists challenge_members_user_idx on public.challenge_members (user_id);
create index if not exists challenge_members_habit_idx on public.challenge_members (habit_id);

create table if not exists public.reports (
  id         bigint generated always as identity primary key,
  reporter   uuid default auth.uid() references public.profiles (id) on delete set null,
  reported   uuid not null references public.profiles (id) on delete cascade,
  reason     text check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER: they bypass RLS, so they never recurse)
-- -----------------------------------------------------------------------------

-- Only answers for pairs that include the current user, so nobody can probe
-- other people's friendships.
create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() in (a, b) and exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester = a and addressee = b) or (requester = b and addressee = a))
  );
$$;

create or replace function public.is_challenge_member(p_challenge uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from challenge_members
    where challenge_id = p_challenge and user_id = auth.uid()
  );
$$;

-- Is this habit part of a challenge the current user is in?
create or replace function public.shares_challenge(p_habit uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from challenge_members m
    join challenge_members me on me.challenge_id = m.challenge_id
    where m.habit_id = p_habit and me.user_id = auth.uid()
  );
$$;

-- Can the current user see this habit (and therefore its check-ins)?
create or replace function public.can_view_habit(p_habit uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from habits h
    where h.id = p_habit
      and (
        h.user_id = auth.uid()
        or (h.visibility = 'friends' and are_friends(auth.uid(), h.user_id))
        or shares_challenge(h.id)
      )
  );
$$;

-- Current streak of a habit as of p_today.
-- Walking back from p_today: a checked day adds 1, a scheduled day without a
-- check-in ends the streak, unscheduled days are skipped. p_today itself never
-- breaks the streak (the day is not over yet).
-- Runs with the caller's rights, so it only sees check-ins the caller may see.
create or replace function public.habit_current_streak(p_habit uuid, p_today date)
returns integer
language sql stable set search_path = public
as $$
  with h as (
    select days from habits where id = p_habit
  ),
  c as (
    select date from checkins where habit_id = p_habit and date <= p_today
  ),
  last_miss as (
    select max(d::date) as d
    from h, generate_series((select min(date) from c)::timestamp, (p_today - 1)::timestamp, interval '1 day') as d
    where extract(isodow from d)::smallint = any (h.days)
      and not exists (select 1 from c where c.date = d::date)
  )
  select count(*)::integer
  from c
  where c.date > coalesce((select d from last_miss), '-infinity'::date);
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

create or replace function public.checkins_before_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- no check-ins far in the future (1 day of slack for time zones)
  if new.date > current_date + 1 then
    raise exception 'checkin_in_future';
  end if;
  new.streak := habit_current_streak(new.habit_id, new.date) + 1;
  return new;
end;
$$;

drop trigger if exists checkins_before_insert on public.checkins;
create trigger checkins_before_insert
  before insert on public.checkins
  for each row execute function public.checkins_before_insert();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles          enable row level security;
alter table public.friendships       enable row level security;
alter table public.blocks            enable row level security;
alter table public.habits            enable row level security;
alter table public.checkins          enable row level security;
alter table public.reactions         enable row level security;
alter table public.challenges        enable row level security;
alter table public.challenge_members enable row level security;
alter table public.reports           enable row level security;

-- profiles: everyone signed in can look people up (needed to add friends)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (true);
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- friendships: visible to both sides; changed only through the functions below
drop policy if exists friendships_select on public.friendships;
create policy friendships_select on public.friendships
  for select to authenticated using (auth.uid() in (requester, addressee));

-- blocks: you see only your own block list
drop policy if exists blocks_select on public.blocks;
create policy blocks_select on public.blocks
  for select to authenticated using (blocker = auth.uid());

-- habits
drop policy if exists habits_select on public.habits;
-- (checks the row's own columns: a lookup by id would not see a row that is
-- being inserted, which breaks INSERT ... RETURNING)
create policy habits_select on public.habits
  for select to authenticated using (
    user_id = auth.uid()
    or (visibility = 'friends' and public.are_friends(auth.uid(), user_id))
    or public.shares_challenge(id)
  );
drop policy if exists habits_insert on public.habits;
create policy habits_insert on public.habits
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists habits_update on public.habits;
create policy habits_update on public.habits
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists habits_delete on public.habits;
create policy habits_delete on public.habits
  for delete to authenticated using (user_id = auth.uid());

-- checkins
drop policy if exists checkins_select on public.checkins;
create policy checkins_select on public.checkins
  for select to authenticated using (public.can_view_habit(habit_id));
drop policy if exists checkins_insert on public.checkins;
create policy checkins_insert on public.checkins
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.habits h where h.id = habit_id and h.user_id = auth.uid())
  );
drop policy if exists checkins_delete on public.checkins;
create policy checkins_delete on public.checkins
  for delete to authenticated using (user_id = auth.uid());

-- reactions: you can react to check-ins you can see, but not to your own
drop policy if exists reactions_select on public.reactions;
create policy reactions_select on public.reactions
  for select to authenticated using (
    exists (select 1 from public.checkins c where c.id = checkin_id)
  );
drop policy if exists reactions_insert on public.reactions;
create policy reactions_insert on public.reactions
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.checkins c where c.id = checkin_id and c.user_id <> auth.uid())
  );
drop policy if exists reactions_update on public.reactions;
create policy reactions_update on public.reactions
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists reactions_delete on public.reactions;
create policy reactions_delete on public.reactions
  for delete to authenticated using (user_id = auth.uid());

-- challenges and members: visible to members; changed through functions
drop policy if exists challenges_select on public.challenges;
create policy challenges_select on public.challenges
  for select to authenticated using (public.is_challenge_member(id));
drop policy if exists challenge_members_select on public.challenge_members;
create policy challenge_members_select on public.challenge_members
  for select to authenticated using (public.is_challenge_member(challenge_id));

-- reports: write-only
drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated with check (reporter = auth.uid());

-- Table privileges (RLS above decides which rows)
revoke all on public.profiles, public.friendships, public.blocks, public.habits, public.checkins,
  public.reactions, public.challenges, public.challenge_members, public.reports from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update          on public.profiles          to authenticated;
grant select                          on public.friendships       to authenticated;
grant select                          on public.blocks            to authenticated;
grant select, insert, update, delete  on public.habits            to authenticated;
grant select, insert, delete          on public.checkins          to authenticated;
grant select, insert, update, delete  on public.reactions         to authenticated;
grant select                          on public.challenges        to authenticated;
grant select                          on public.challenge_members to authenticated;
grant insert                          on public.reports           to authenticated;

-- -----------------------------------------------------------------------------
-- API functions (called from the app with supabase.rpc)
-- -----------------------------------------------------------------------------

-- Friends ---------------------------------------------------------------------

-- Returns: 'requested' | 'accepted' | 'already_friends' | 'already_requested'
create or replace function public.send_friend_request(p_username text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  target uuid;
  existing friendships%rowtype;
begin
  if me is null then raise exception 'not_authenticated'; end if;

  select id into target from profiles where username = lower(trim(leading '@' from trim(p_username)));
  if target is null then raise exception 'user_not_found'; end if;
  if target = me then raise exception 'cannot_add_self'; end if;
  if exists (select 1 from blocks where (blocker = me and blocked = target) or (blocker = target and blocked = me)) then
    raise exception 'user_not_found';
  end if;

  select * into existing from friendships
  where (requester = me and addressee = target) or (requester = target and addressee = me);

  if found then
    if existing.status = 'accepted' then return 'already_friends'; end if;
    if existing.requester = me then return 'already_requested'; end if;
    -- they already asked us: accept
    update friendships set status = 'accepted', created_at = now()
    where requester = target and addressee = me;
    return 'accepted';
  end if;

  insert into friendships (requester, addressee) values (me, target);
  return 'requested';
end;
$$;

create or replace function public.respond_friend_request(p_requester uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_accept then
    update friendships set status = 'accepted', created_at = now()
    where requester = p_requester and addressee = auth.uid() and status = 'pending';
  else
    delete from friendships
    where requester = p_requester and addressee = auth.uid() and status = 'pending';
  end if;
end;
$$;

-- Removes a friend, or cancels/declines a pending request in either direction.
create or replace function public.remove_friend(p_user uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from friendships
  where (requester = auth.uid() and addressee = p_user)
     or (requester = p_user and addressee = auth.uid());
$$;

create or replace function public.block_user(p_user uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_user = auth.uid() then raise exception 'cannot_block_self'; end if;
  delete from friendships
  where (requester = auth.uid() and addressee = p_user)
     or (requester = p_user and addressee = auth.uid());
  insert into blocks (blocker, blocked) values (auth.uid(), p_user)
  on conflict do nothing;
end;
$$;

create or replace function public.unblock_user(p_user uuid)
returns void
language sql security definer set search_path = public
as $$
  delete from blocks where blocker = auth.uid() and blocked = p_user;
$$;

-- Friends and pending requests with each friend's best current streak.
create or replace function public.get_friends(p_today date)
returns table (
  user_id      uuid,
  username     text,
  display_name text,
  avatar       text,
  status       text,   -- 'friend' | 'incoming' | 'outgoing'
  since        timestamptz,
  best_streak  integer
)
language sql stable set search_path = public
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar,
    case
      when f.status = 'accepted' then 'friend'
      when f.requester = auth.uid() then 'outgoing'
      else 'incoming'
    end,
    f.created_at,
    case when f.status = 'accepted' then coalesce((
      select max(habit_current_streak(h.id, p_today))
      from habits h
      where h.user_id = p.id and h.visibility = 'friends' and h.archived_at is null
    ), 0) else 0 end
  from friendships f
  join profiles p on p.id = case when f.requester = auth.uid() then f.addressee else f.requester end
  where auth.uid() in (f.requester, f.addressee)
  order by f.status desc, p.display_name;
$$;

-- Feed -------------------------------------------------------------------------

-- Recent check-ins of friends (and your own) on shared habits.
create or replace function public.get_feed(p_limit integer default 30, p_before timestamptz default null)
returns table (
  checkin_id     uuid,
  date           date,
  created_at     timestamptz,
  streak         integer,
  habit_id       uuid,
  habit_name     text,
  habit_emoji    text,
  habit_color    text,
  user_id        uuid,
  username       text,
  display_name   text,
  avatar         text,
  reactions      jsonb,  -- {"🔥": 3, "👏": 1}
  my_reaction    text,
  challenge_title text
)
language sql stable set search_path = public
as $$
  select
    c.id,
    c.date,
    c.created_at,
    c.streak,
    h.id,
    h.name,
    h.emoji,
    h.color,
    p.id,
    p.username,
    p.display_name,
    p.avatar,
    coalesce((
      select jsonb_object_agg(x.emoji, x.n)
      from (select r.emoji, count(*) as n from reactions r where r.checkin_id = c.id group by r.emoji) x
    ), '{}'::jsonb),
    (select r.emoji from reactions r where r.checkin_id = c.id and r.user_id = auth.uid()),
    (
      select ch.title
      from challenge_members m join challenges ch on ch.id = m.challenge_id
      where m.habit_id = h.id and c.date between ch.start_date and ch.end_date
      limit 1
    )
  from checkins c
  join habits h on h.id = c.habit_id
  join profiles p on p.id = c.user_id
  where h.archived_at is null
    and (h.visibility = 'friends' or exists (select 1 from challenge_members m where m.habit_id = h.id))
    -- only "live" check-ins, not old days filled in later
    and c.date >= (c.created_at at time zone 'utc')::date - 1
    and (p_before is null or c.created_at < p_before)
    and not exists (select 1 from blocks b where b.blocker = auth.uid() and b.blocked = c.user_id)
  order by c.created_at desc
  limit least(greatest(p_limit, 1), 100);
$$;

-- Challenges -----------------------------------------------------------------

create or replace function public._join_challenge(p_challenge uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  ch challenges%rowtype;
  me uuid := auth.uid();
  existing_habit uuid;
  new_habit uuid;
begin
  select * into ch from challenges where id = p_challenge;
  if not found then raise exception 'challenge_not_found'; end if;
  if ch.end_date < current_date - 1 then raise exception 'challenge_finished'; end if;

  select habit_id into existing_habit
  from challenge_members where challenge_id = p_challenge and user_id = me and status = 'joined';
  if found and existing_habit is not null then return; end if;

  insert into habits (user_id, name, emoji, color, days, visibility)
  values (me, ch.title, ch.emoji, ch.color, '{1,2,3,4,5,6,7}', 'friends')
  returning id into new_habit;

  insert into challenge_members (challenge_id, user_id, status, habit_id, joined_at)
  values (p_challenge, me, 'joined', new_habit, now())
  on conflict (challenge_id, user_id)
  do update set status = 'joined', habit_id = excluded.habit_id, joined_at = excluded.joined_at;
end;
$$;
revoke execute on function public._join_challenge(uuid) from public, anon, authenticated;

create or replace function public.create_challenge(
  p_title text,
  p_emoji text,
  p_color text,
  p_start date,
  p_end date,
  p_invitees uuid[] default '{}'
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if p_start < current_date - 1 then raise exception 'start_in_past'; end if;

  insert into challenges (creator, title, emoji, color, start_date, end_date)
  values (me, p_title, p_emoji, p_color, p_start, p_end)
  returning id into new_id;

  perform _join_challenge(new_id);

  insert into challenge_members (challenge_id, user_id, status, invited_by)
  select new_id, u, 'invited', me
  from unnest(coalesce(p_invitees, '{}')) as u
  where u <> me and are_friends(me, u)
  on conflict do nothing;

  return new_id;
end;
$$;

create or replace function public.invite_to_challenge(p_challenge uuid, p_invitees uuid[])
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if not exists (select 1 from challenge_members where challenge_id = p_challenge and user_id = me and status = 'joined') then
    raise exception 'not_a_member';
  end if;
  insert into challenge_members (challenge_id, user_id, status, invited_by)
  select p_challenge, u, 'invited', me
  from unnest(p_invitees) as u
  where u <> me and are_friends(me, u)
  on conflict do nothing;
end;
$$;

-- Accept an invitation.
create or replace function public.join_challenge(p_challenge uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (select 1 from challenge_members where challenge_id = p_challenge and user_id = auth.uid()) then
    raise exception 'not_invited';
  end if;
  perform _join_challenge(p_challenge);
end;
$$;

-- Join with an invite code (works for anyone who has the code).
create or replace function public.join_challenge_by_code(p_code text)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  ch_id uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select id into ch_id from challenges where invite_code = upper(trim(p_code));
  if ch_id is null then raise exception 'challenge_not_found'; end if;
  perform _join_challenge(ch_id);
  return ch_id;
end;
$$;

-- Leave (or decline) a challenge. Your challenge habit is deleted while the
-- challenge is running and kept as a normal habit once it has finished.
create or replace function public.leave_challenge(p_challenge uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  m challenge_members%rowtype;
  ch challenges%rowtype;
begin
  select * into m from challenge_members where challenge_id = p_challenge and user_id = me;
  if not found then return; end if;
  select * into ch from challenges where id = p_challenge;

  delete from challenge_members where challenge_id = p_challenge and user_id = me;
  if m.habit_id is not null and ch.end_date >= current_date then
    delete from habits where id = m.habit_id and user_id = me;
  end if;

  if not exists (select 1 from challenge_members where challenge_id = p_challenge and status = 'joined') then
    delete from challenges where id = p_challenge;
  end if;
end;
$$;

create or replace function public.get_my_challenges()
returns table (
  id           uuid,
  title        text,
  emoji        text,
  color        text,
  start_date   date,
  end_date     date,
  invite_code  text,
  creator      uuid,
  my_status    text,
  my_habit_id  uuid,
  member_count integer,
  invited_by   text
)
language sql stable set search_path = public
as $$
  select
    ch.id, ch.title, ch.emoji, ch.color, ch.start_date, ch.end_date, ch.invite_code, ch.creator,
    me.status,
    me.habit_id,
    (select count(*)::integer from challenge_members m where m.challenge_id = ch.id and m.status = 'joined'),
    (select p.display_name from profiles p where p.id = me.invited_by)
  from challenges ch
  join challenge_members me on me.challenge_id = ch.id and me.user_id = auth.uid()
  order by ch.end_date desc, ch.created_at desc;
$$;

create or replace function public.get_challenge_members(p_challenge uuid)
returns table (
  user_id      uuid,
  username     text,
  display_name text,
  avatar       text,
  status       text,
  habit_id     uuid,
  joined_at    timestamptz
)
language sql stable set search_path = public
as $$
  select p.id, p.username, p.display_name, p.avatar, m.status, m.habit_id, m.joined_at
  from challenge_members m
  join profiles p on p.id = m.user_id
  where m.challenge_id = p_challenge
  order by m.status desc, m.joined_at;
$$;

-- Account --------------------------------------------------------------------

-- Deletes the current user and all their data (required by the App Store).
create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- Function privileges: only signed-in users may call the API.
do $$
declare
  f text;
begin
  foreach f in array array[
    'are_friends(uuid, uuid)',
    'is_challenge_member(uuid)',
    'shares_challenge(uuid)',
    'can_view_habit(uuid)',
    'habit_current_streak(uuid, date)',
    'send_friend_request(text)',
    'respond_friend_request(uuid, boolean)',
    'remove_friend(uuid)',
    'block_user(uuid)',
    'unblock_user(uuid)',
    'get_friends(date)',
    'get_feed(integer, timestamptz)',
    'create_challenge(text, text, text, date, date, uuid[])',
    'invite_to_challenge(uuid, uuid[])',
    'join_challenge(uuid)',
    'join_challenge_by_code(text)',
    'leave_challenge(uuid)',
    'get_my_challenges()',
    'get_challenge_members(uuid)',
    'delete_account()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end;
$$;
