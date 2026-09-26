-- Behavioural tests for schema.sql. Run with supabase/tests/run.sh.
-- Users: alice (a), bob (b), carol (c). Alice and Bob become friends, Carol
-- only meets Alice through a challenge invite code.
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'carol@example.com');

create function pg_temp.login(p_user text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-00000000000' || p_user, 'role', 'authenticated')::text,
    false);
$$;

set role authenticated;

-- ---------------------------------------------------------------- profiles
select pg_temp.login('a');
insert into profiles (id, username, display_name, avatar) values (auth.uid(), 'alice', 'Alice', '🦊');
do $$ begin
  begin
    insert into profiles (id, username, display_name) values ('00000000-0000-0000-0000-00000000000b', 'fakebob', 'Fake');
    raise exception 'FAIL: inserted a profile for someone else';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into profiles (id, username, display_name) values (auth.uid(), 'Bad Name!', 'x');
    raise exception 'FAIL: invalid username accepted';
  exception when check_violation or unique_violation then null;
  end;
end $$;

select pg_temp.login('b');
insert into profiles (id, username, display_name) values (auth.uid(), 'bob', 'Bob');
select pg_temp.login('c');
insert into profiles (id, username, display_name) values (auth.uid(), 'carol', 'Carol');

-- ---------------------------------------------------------------- habits & streaks
select pg_temp.login('a');
insert into habits (id, name, emoji, visibility) values
  ('10000000-0000-0000-0000-000000000001', 'Run', '🏃', 'friends'),
  ('10000000-0000-0000-0000-000000000002', 'Diary', '📓', 'private');
-- Mon/Wed/Fri habit, inserted like the app does it (INSERT ... RETURNING)
insert into habits (id, name, days, visibility) values
  ('10000000-0000-0000-0000-000000000003', 'Gym', '{1,3,5}', 'friends')
returning id, name;

-- Run: checked on the 4 days before today, not yet today
insert into checkins (habit_id, date) select '10000000-0000-0000-0000-000000000001', current_date - g from generate_series(4, 1, -1) g;
insert into checkins (habit_id, date) values ('10000000-0000-0000-0000-000000000002', current_date) returning date;
-- profile upsert as done by the app
insert into profiles (id, username, display_name, avatar) values (auth.uid(), 'alice', 'Alice', '🦊')
on conflict (id) do update set avatar = excluded.avatar returning username;

do $$ begin
  assert (select streak from checkins where habit_id = '10000000-0000-0000-0000-000000000001' and date = current_date - 1) = 4,
    'FAIL: streak stored on check-in should be 4';
  assert habit_current_streak('10000000-0000-0000-0000-000000000001', current_date) = 4,
    'FAIL: unchecked today must not break the streak';
  assert habit_current_streak('10000000-0000-0000-0000-000000000001', current_date + 1) = 0,
    'FAIL: a missed scheduled day must break the streak';
end $$;

insert into checkins (habit_id, date) values ('10000000-0000-0000-0000-000000000001', current_date);
do $$ begin
  assert habit_current_streak('10000000-0000-0000-0000-000000000001', current_date) = 5, 'FAIL: streak should be 5';
  assert (select streak from checkins where habit_id = '10000000-0000-0000-0000-000000000001' and date = current_date) = 5,
    'FAIL: stored streak should be 5';
end $$;

-- Gym (Mon/Wed/Fri): the last three scheduled days are checked, plus a bonus Sunday
insert into checkins (habit_id, date)
select '10000000-0000-0000-0000-000000000003', d::date
from generate_series(current_date - 14, current_date - 1, interval '1 day') d
where extract(isodow from d) in (1, 3, 5)
order by d desc
limit 3;
insert into checkins (habit_id, date)
select '10000000-0000-0000-0000-000000000003', d::date
from generate_series(current_date - 6, current_date - 1, interval '1 day') d
where extract(isodow from d) = 7
  and d::date > (select min(date) from checkins where habit_id = '10000000-0000-0000-0000-000000000003');
do $$
declare
  expected int := (select count(*) from checkins where habit_id = '10000000-0000-0000-0000-000000000003');
begin
  assert habit_current_streak('10000000-0000-0000-0000-000000000003', current_date) = expected,
    format('FAIL: Mon/Wed/Fri streak should skip unscheduled days (expected %s, got %s)',
      expected, habit_current_streak('10000000-0000-0000-0000-000000000003', current_date));
end $$;

do $$ begin
  begin
    insert into checkins (habit_id, date) values ('10000000-0000-0000-0000-000000000001', current_date + 5);
    raise exception 'FAIL: future check-in accepted';
  exception when raise_exception then
    if sqlerrm <> 'checkin_in_future' then raise; end if;
  end;
end $$;

-- ---------------------------------------------------------------- strangers see nothing
select pg_temp.login('b');
do $$ begin
  assert (select count(*) from habits) = 0, 'FAIL: bob sees habits of a stranger';
  assert (select count(*) from checkins) = 0, 'FAIL: bob sees check-ins of a stranger';
  assert (select count(*) from get_feed()) = 0, 'FAIL: bob feed not empty';
  assert (select count(*) from profiles) = 3, 'FAIL: profiles should be searchable';
end $$;

-- ---------------------------------------------------------------- friendship
select pg_temp.login('a');
do $$ begin
  assert send_friend_request('@Bob') = 'requested', 'FAIL: request';
  assert send_friend_request('bob') = 'already_requested', 'FAIL: duplicate request';
  begin
    perform send_friend_request('nobody');
    raise exception 'FAIL: unknown user accepted';
  exception when raise_exception then
    if sqlerrm <> 'user_not_found' then raise; end if;
  end;
  begin
    perform send_friend_request('alice');
    raise exception 'FAIL: self-request accepted';
  exception when raise_exception then
    if sqlerrm <> 'cannot_add_self' then raise; end if;
  end;
  begin
    insert into friendships (requester, addressee, status)
    values (auth.uid(), '00000000-0000-0000-0000-00000000000c', 'accepted');
    raise exception 'FAIL: direct friendship insert allowed';
  exception when insufficient_privilege then null;
  end;
end $$;

select pg_temp.login('b');
do $$ begin
  assert (select status from get_friends(current_date) where username = 'alice') = 'incoming', 'FAIL: incoming';
  assert (select count(*) from habits) = 0, 'FAIL: pending request must not reveal habits';
end $$;
select respond_friend_request('00000000-0000-0000-0000-00000000000a', true);

do $$ begin
  assert (select status from get_friends(current_date) where username = 'alice') = 'friend', 'FAIL: friend';
  assert (select best_streak from get_friends(current_date) where username = 'alice') = 5, 'FAIL: best streak';
  assert (select count(*) from habits where name = 'Run') = 1, 'FAIL: friend should see shared habit';
  assert (select count(*) from habits where name = 'Diary') = 0, 'FAIL: friend sees private habit';
  assert (select count(*) from checkins where habit_id = '10000000-0000-0000-0000-000000000002') = 0,
    'FAIL: friend sees private check-ins';
  assert (select count(*) from checkins where habit_id = '10000000-0000-0000-0000-000000000001') = 5,
    'FAIL: friend should see shared check-ins';
  assert are_friends('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b'),
    'FAIL: are_friends for own pair';
  -- only today's and yesterday's check-ins are "live"; older days were filled in later
  assert (select count(*) from get_feed() where habit_name = 'Run') = 2, 'FAIL: feed should show live Run check-ins';
  assert (select count(*) from get_feed() where habit_name = 'Diary') = 0, 'FAIL: feed shows private habit';

  -- cannot touch a friend's data
  update habits set name = 'hacked' where id = '10000000-0000-0000-0000-000000000001';
  assert (select name from habits where id = '10000000-0000-0000-0000-000000000001') = 'Run', 'FAIL: updated friend habit';
  delete from checkins where habit_id = '10000000-0000-0000-0000-000000000001';
  assert (select count(*) from checkins where habit_id = '10000000-0000-0000-0000-000000000001') = 5,
    'FAIL: deleted friend check-ins';
  begin
    insert into checkins (habit_id, user_id, date)
    values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', current_date - 10);
    raise exception 'FAIL: checked in on a friend habit';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------- reactions
insert into reactions (checkin_id, emoji)
select id, '🔥' from checkins where habit_id = '10000000-0000-0000-0000-000000000001' and date = current_date;
do $$ begin
  assert (select reactions ->> '🔥' from get_feed() where date = current_date and habit_name = 'Run') = '1',
    'FAIL: reaction count';
  assert (select my_reaction from get_feed() where date = current_date and habit_name = 'Run') = '🔥',
    'FAIL: my reaction';
end $$;
update reactions set emoji = '👏';
do $$ begin
  assert (select my_reaction from get_feed() where date = current_date and habit_name = 'Run') = '👏',
    'FAIL: change reaction';
end $$;

select pg_temp.login('a');
do $$ begin
  begin
    insert into reactions (checkin_id, emoji)
    select id, '🔥' from checkins where habit_id = '10000000-0000-0000-0000-000000000001' and date = current_date;
    raise exception 'FAIL: reacted to own check-in';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from get_feed() where habit_name = 'Run') = 2, 'FAIL: own shared check-ins should be in own feed';
end $$;

select pg_temp.login('c');
do $$ begin
  begin
    insert into reactions (checkin_id, emoji)
    select id, '🔥' from checkins where habit_id = '10000000-0000-0000-0000-000000000001' and date = current_date;
    -- the select returns no rows for carol, so nothing is inserted
    assert (select count(*) from reactions) = 0, 'FAIL: stranger reacted';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------- challenges
select pg_temp.login('a');
select create_challenge('No sugar', '🍬', '#FF3B30', current_date, current_date + 6,
  array['00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c']::uuid[]) as challenge_id \gset
-- psql variables are not expanded inside $$ blocks, so keep the id in a setting
select set_config('test.cid', :'challenge_id', false);

do $$ begin
  assert (select count(*) from get_challenge_members(current_setting('test.cid')::uuid)) = 2,
    'FAIL: creator + friend invited, stranger skipped';
  assert (select my_status from get_my_challenges() where id = current_setting('test.cid')::uuid) = 'joined', 'FAIL: creator joined';
  assert (select my_habit_id from get_my_challenges() where id = current_setting('test.cid')::uuid) is not null, 'FAIL: creator habit';
end $$;
select invite_code from challenges where id = :'challenge_id' \gset

-- alice checks in on the challenge habit
insert into checkins (habit_id, date)
select my_habit_id, current_date from get_my_challenges() where id = :'challenge_id';

select pg_temp.login('b');
do $$ begin
  assert (select my_status from get_my_challenges() where id = current_setting('test.cid')::uuid) = 'invited', 'FAIL: bob invited';
  assert (select invited_by from get_my_challenges() where id = current_setting('test.cid')::uuid) = 'Alice', 'FAIL: invited_by';
end $$;
select join_challenge(:'challenge_id');
select join_challenge(:'challenge_id'); -- idempotent
do $$ begin
  assert (select count(*) from habits where user_id = auth.uid() and name = 'No sugar') = 1, 'FAIL: bob challenge habit';
  assert (select member_count from get_my_challenges() where id = current_setting('test.cid')::uuid) = 2, 'FAIL: member count';
end $$;

select pg_temp.login('c');
do $$ begin
  assert not are_friends('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b'),
    'FAIL: are_friends leaks other people''s friendships';
  assert (select count(*) from challenges) = 0, 'FAIL: carol sees challenge before joining';
  begin
    perform join_challenge(current_setting('test.cid')::uuid);
    raise exception 'FAIL: joined without invite';
  exception when raise_exception then
    if sqlerrm <> 'not_invited' then raise; end if;
  end;
end $$;
select set_config('test.joined_by_code', (join_challenge_by_code(lower(:'invite_code')) = :'challenge_id'::uuid)::text, false);
do $$ begin
  assert current_setting('test.joined_by_code')::boolean, 'FAIL: join by code';
  assert (select count(*) from get_challenge_members(current_setting('test.cid')::uuid)) = 3, 'FAIL: 3 members';
  -- carol sees alice's challenge habit and its check-ins, but none of alice's other habits
  assert (select count(*) from habits where user_id = '00000000-0000-0000-0000-00000000000a') = 1,
    'FAIL: carol should only see the challenge habit of alice';
  assert (select count(*) from checkins where user_id = '00000000-0000-0000-0000-00000000000a') = 1,
    'FAIL: carol should see only challenge check-ins of alice';
  assert (select count(*) from get_feed() where challenge_title = 'No sugar') = 1, 'FAIL: challenge in feed';
end $$;

-- leaving a running challenge deletes the challenge habit
select leave_challenge(:'challenge_id');
do $$ begin
  assert (select count(*) from habits where user_id = auth.uid()) = 0, 'FAIL: challenge habit not removed';
  assert (select count(*) from challenges) = 0, 'FAIL: still sees challenge after leaving';
end $$;

-- ---------------------------------------------------------------- blocking
select pg_temp.login('b');
select block_user('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert (select count(*) from get_friends(current_date)) = 0, 'FAIL: block removes friendship';
  assert (select count(*) from habits where name = 'Run') = 0, 'FAIL: blocked user habits visible';
end $$;
select pg_temp.login('a');
do $$ begin
  begin
    perform send_friend_request('bob');
    raise exception 'FAIL: request to a user who blocked you';
  exception when raise_exception then
    if sqlerrm <> 'user_not_found' then raise; end if;
  end;
end $$;
select pg_temp.login('b');
select unblock_user('00000000-0000-0000-0000-00000000000a');

-- ---------------------------------------------------------------- reports
insert into reports (reported, reason) values ('00000000-0000-0000-0000-00000000000a', 'test');
do $$ begin
  begin
    perform count(*) from reports;
    raise exception 'FAIL: reports readable';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------- anon
reset role;
set role anon;
do $$ begin
  begin
    perform count(*) from habits;
    raise exception 'FAIL: anon can read habits';
  exception when insufficient_privilege then null;
  end;
  begin
    perform get_feed();
    raise exception 'FAIL: anon can call get_feed';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------- account deletion
reset role;
set role authenticated;
select pg_temp.login('a');
select delete_account();
reset role;
do $$ begin
  assert (select count(*) from auth.users where email = 'alice@example.com') = 0, 'FAIL: user not deleted';
  assert (select count(*) from habits where user_id = '00000000-0000-0000-0000-00000000000a') = 0, 'FAIL: habits left';
  assert (select count(*) from challenges) = 1, 'FAIL: challenge with remaining members should stay';
end $$;
