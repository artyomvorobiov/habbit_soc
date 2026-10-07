-- Behavioural tests for the version 2 features: photo proofs, challenge chat,
-- notifications, nudges and push. Run with supabase/tests/run.sh.
-- Users: dina (d) and egor (e) become friends, fedor (f) is a stranger.
\set ON_ERROR_STOP 1

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000d', 'dina@example.com'),
  ('00000000-0000-0000-0000-00000000000e', 'egor@example.com'),
  ('00000000-0000-0000-0000-00000000000f', 'fedor@example.com');

create function pg_temp.login(p_user text) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', '00000000-0000-0000-0000-00000000000' || p_user, 'role', 'authenticated')::text,
    false);
$$;

set role authenticated;
select pg_temp.login('d');
insert into profiles (id, username, display_name) values (auth.uid(), 'dina', 'Dina');
select pg_temp.login('e');
insert into profiles (id, username, display_name) values (auth.uid(), 'egor', 'Egor');
select pg_temp.login('f');
insert into profiles (id, username, display_name) values (auth.uid(), 'fedor', 'Fedor');

-- ---------------------------------------------------------------- push tokens
select pg_temp.login('d');
select register_push_token('ExponentPushToken[dina-phone]', 'ru-RU');
select pg_temp.login('e');
select register_push_token('ExponentPushToken[egor-phone]', 'en');
do $$ begin
  begin
    perform register_push_token('not a token', 'en');
    raise exception 'FAIL: invalid push token accepted';
  exception when raise_exception then
    if sqlerrm <> 'invalid_token' then raise; end if;
  end;
  begin
    perform count(*) from push_tokens;
    raise exception 'FAIL: push tokens readable';
  exception when insufficient_privilege then null;
  end;
end $$;

-- ---------------------------------------------------------------- friend request notifications
select send_friend_request('dina');
select pg_temp.login('d');
do $$ begin
  assert (select count(*) from get_notifications() where kind = 'friend_request' and username = 'egor') = 1,
    'FAIL: friend request notification';
  assert (select count(*) from notifications) = 1, 'FAIL: dina should see only her notifications';
end $$;
select respond_friend_request('00000000-0000-0000-0000-00000000000e', true);
select pg_temp.login('e');
do $$ begin
  assert (select count(*) from get_notifications() where kind = 'friend_accepted' and username = 'dina') = 1,
    'FAIL: friend accepted notification';
  assert (select count(*) from get_notifications() where kind = 'friend_request') = 0,
    'FAIL: egor sees dina''s notifications';
end $$;

reset role;
do $$ begin
  assert (select count(*) from net.requests) = 2, 'FAIL: two pushes expected (request + accepted)';
  assert (select body -> 0 ->> 'to' from net.requests order by id limit 1) = 'ExponentPushToken[dina-phone]',
    'FAIL: push goes to dina''s phone';
  assert (select body -> 0 ->> 'body' from net.requests order by id limit 1) = 'Egor (@egor) хочет дружить',
    'FAIL: push text should follow the device language';
  assert (select body -> 0 -> 'data' ->> 'url' from net.requests order by id limit 1) = '/friends',
    'FAIL: push link';
  assert (select body -> 0 ->> 'title' from net.requests order by id desc limit 1) = 'Dina 🤝',
    'FAIL: accepted push';
end $$;
set role authenticated;

-- ---------------------------------------------------------------- photo proofs on check-ins
select pg_temp.login('d');
insert into habits (id, name, visibility) values
  ('20000000-0000-0000-0000-000000000001', 'Run', 'friends'),
  ('20000000-0000-0000-0000-000000000002', 'Secret', 'private');
insert into checkins (habit_id, date) values
  ('20000000-0000-0000-0000-000000000001', current_date),
  ('20000000-0000-0000-0000-000000000002', current_date);
-- uploads: own folder only
insert into storage.objects (bucket_id, name, owner) values
  ('photos', '00000000-0000-0000-0000-00000000000d/run.jpg', auth.uid()),
  ('photos', '00000000-0000-0000-0000-00000000000d/secret.jpg', auth.uid());
do $$ begin
  begin
    insert into storage.objects (bucket_id, name) values ('photos', '00000000-0000-0000-0000-00000000000e/x.jpg');
    raise exception 'FAIL: uploaded into someone else''s folder';
  exception when insufficient_privilege then null;
  end;
end $$;
update checkins set photo_path = '00000000-0000-0000-0000-00000000000d/run.jpg', note = '5 km!'
where habit_id = '20000000-0000-0000-0000-000000000001' and date = current_date;
update checkins set photo_path = '00000000-0000-0000-0000-00000000000d/secret.jpg'
where habit_id = '20000000-0000-0000-0000-000000000002' and date = current_date;
do $$ begin
  assert (select note from checkins where habit_id = '20000000-0000-0000-0000-000000000001') = '5 km!',
    'FAIL: note not saved';
  begin
    update checkins set photo_path = '00000000-0000-0000-0000-00000000000e/x.jpg'
    where habit_id = '20000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: attached a photo from someone else''s folder';
  exception when check_violation then null;
  end;
  begin
    update checkins set date = current_date - 3 where habit_id = '20000000-0000-0000-0000-000000000001';
    raise exception 'FAIL: changed the date of a check-in';
  exception when insufficient_privilege then null;
  end;
end $$;

select pg_temp.login('e');
do $$ begin
  assert (select photo_path from get_feed() where habit_name = 'Run') = '00000000-0000-0000-0000-00000000000d/run.jpg',
    'FAIL: friend should see the photo in the feed';
  assert (select note from get_feed() where habit_name = 'Run') = '5 km!', 'FAIL: note in feed';
  assert (select count(*) from storage.objects where name like '%/run.jpg') = 1,
    'FAIL: friend should be able to open the photo';
  assert (select count(*) from storage.objects where name like '%/secret.jpg') = 0,
    'FAIL: photo of a private habit is visible';
  update checkins set note = 'hacked' where habit_id = '20000000-0000-0000-0000-000000000001';
  assert (select note from get_feed() where habit_name = 'Run') = '5 km!', 'FAIL: friend edited the note';
end $$;
select pg_temp.login('f');
do $$ begin
  assert (select count(*) from storage.objects) = 0, 'FAIL: stranger sees photos';
end $$;

-- ---------------------------------------------------------------- reaction notifications
select pg_temp.login('e');
insert into reactions (checkin_id, emoji)
select id, '🔥' from checkins where habit_id = '20000000-0000-0000-0000-000000000001';
update reactions set emoji = '👏';
select pg_temp.login('d');
do $$ begin
  assert (select count(*) from get_notifications() where kind = 'reaction') = 1, 'FAIL: one reaction notification';
  assert (select emoji from get_notifications() where kind = 'reaction') = '👏', 'FAIL: reaction updated';
  assert (select subject from get_notifications() where kind = 'reaction') = 'Run', 'FAIL: habit name';
end $$;
select mark_notifications_read();
do $$ begin
  assert (select count(*) from get_notifications() where read_at is null) = 0, 'FAIL: mark read';
end $$;

-- ---------------------------------------------------------------- challenge chat
select pg_temp.login('d');
select create_challenge('Plank', '🧱', '#FF3B30', current_date, current_date + 6,
  array['00000000-0000-0000-0000-00000000000e']::uuid[], true) as cid \gset
select set_config('test.cid', :'cid', false);
select invite_code from challenges where id = :'cid' \gset
do $$
declare
  cid uuid := current_setting('test.cid')::uuid;
begin
  assert (select proof_required from get_my_challenges() where id = cid), 'FAIL: proof_required';
  assert (select count(*) from get_challenge_messages(cid) where kind = 'joined') = 1, 'FAIL: joined message';
end $$;
insert into challenge_messages (challenge_id, body) values (:'cid', 'Go go go!');

select pg_temp.login('e');
do $$
declare
  cid uuid := current_setting('test.cid')::uuid;
begin
  assert (select count(*) from get_notifications() where kind = 'challenge_invite' and subject = 'Plank') = 1,
    'FAIL: invite notification';
  -- invited members can read the chat but not write
  assert (select count(*) from get_challenge_messages(cid) where body = 'Go go go!') = 1, 'FAIL: invited reads chat';
  assert (select unread_count from get_my_challenges() where id = cid) = 0, 'FAIL: no unread badge before joining';
  begin
    insert into challenge_messages (challenge_id, body) values (cid, 'hi');
    raise exception 'FAIL: invited member posted';
  exception when insufficient_privilege then null;
  end;
end $$;
select join_challenge(:'cid');
do $$
declare
  cid uuid := current_setting('test.cid')::uuid;
begin
  assert (select count(*) from get_challenge_messages(cid) where kind = 'joined') = 2, 'FAIL: egor joined message';
  begin
    insert into challenge_messages (challenge_id, kind, body) values (cid, 'checkin', 'fake');
    raise exception 'FAIL: wrote a system message';
  exception when insufficient_privilege or check_violation then null;
  end;
end $$;

select pg_temp.login('d');
insert into challenge_messages (challenge_id, body) values (:'cid', 'Welcome!');
select pg_temp.login('e');
do $$
declare
  cid uuid := current_setting('test.cid')::uuid;
begin
  assert (select unread_count from get_my_challenges() where id = cid) = 1, 'FAIL: unread count';
end $$;
select mark_chat_read(:'cid');
do $$ begin
  assert (select unread_count from get_my_challenges() where id = current_setting('test.cid')::uuid) = 0,
    'FAIL: mark chat read';
end $$;

-- a check-in on the challenge habit appears in the chat, a photo shows up later
insert into checkins (habit_id, date)
select my_habit_id, current_date from get_my_challenges() where id = :'cid';
insert into storage.objects (bucket_id, name, owner)
values ('photos', '00000000-0000-0000-0000-00000000000e/plank.jpg', auth.uid());
update checkins set photo_path = '00000000-0000-0000-0000-00000000000e/plank.jpg', note = '2 min'
where habit_id = (select my_habit_id from get_my_challenges() where id = current_setting('test.cid')::uuid);
-- a photo message
insert into storage.objects (bucket_id, name, owner)
values ('photos', '00000000-0000-0000-0000-00000000000e/selfie.jpg', auth.uid());
insert into challenge_messages (challenge_id, kind, photo_path, body)
values (:'cid', 'photo', '00000000-0000-0000-0000-00000000000e/selfie.jpg', 'after the plank');
do $$
declare
  cid uuid := current_setting('test.cid')::uuid;
begin
  begin
    insert into challenge_messages (challenge_id, kind, photo_path)
    values (cid, 'photo', '00000000-0000-0000-0000-00000000000d/run.jpg');
    raise exception 'FAIL: sent someone else''s photo';
  exception when check_violation then null;
  end;
end $$;

select pg_temp.login('d');
do $$
declare
  cid uuid := current_setting('test.cid')::uuid;
begin
  assert (select photo_path from get_challenge_messages(cid) where kind = 'checkin' and username = 'egor')
    = '00000000-0000-0000-0000-00000000000e/plank.jpg', 'FAIL: proof photo in chat';
  assert (select note from get_challenge_messages(cid) where kind = 'checkin' and username = 'egor') = '2 min',
    'FAIL: proof note in chat';
  assert (select checkin_date from get_challenge_messages(cid) where kind = 'checkin') = current_date,
    'FAIL: check-in date';
  assert (select count(*) from storage.objects where name like '%/plank.jpg' or name like '%/selfie.jpg') = 2,
    'FAIL: members should open chat photos';
  -- not your message: nothing to delete
  delete from challenge_messages where body = 'after the plank';
  assert (select count(*) from get_challenge_messages(cid) where kind = 'photo') = 1, 'FAIL: deleted a foreign message';
end $$;

select pg_temp.login('f');
do $$
declare
  cid uuid := current_setting('test.cid')::uuid;
begin
  assert (select count(*) from get_challenge_messages(cid)) = 0, 'FAIL: stranger reads the chat';
  assert (select count(*) from storage.objects) = 0, 'FAIL: stranger opens chat photos';
  begin
    insert into challenge_messages (challenge_id, body) values (cid, 'spam');
    raise exception 'FAIL: stranger posted';
  exception when insufficient_privilege then null;
  end;
end $$;

-- deleting your own message works, the check-in event goes away with the check-in
select pg_temp.login('e');
delete from challenge_messages where body = 'after the plank';
delete from challenge_messages where kind = 'checkin';  -- not allowed, silently ignored
do $$
declare
  cid uuid := current_setting('test.cid')::uuid;
begin
  assert (select count(*) from get_challenge_messages(cid) where kind = 'photo') = 0, 'FAIL: delete own message';
  assert (select count(*) from get_challenge_messages(cid) where kind = 'checkin') = 1, 'FAIL: deleted a check-in event';
end $$;
delete from checkins
where habit_id = (select my_habit_id from get_my_challenges() where id = current_setting('test.cid')::uuid);
do $$ begin
  assert (select count(*) from get_challenge_messages(current_setting('test.cid')::uuid) where kind = 'checkin') = 0,
    'FAIL: check-in event should disappear with the check-in';
end $$;

reset role;
do $$ begin
  -- 'Go go go!' was sent before egor joined, so only 'Welcome!' is pushed to him
  assert (select count(*) from net.requests where body -> 0 ->> 'to' = 'ExponentPushToken[egor-phone]'
          and body -> 0 -> 'data' ->> 'url' like '/chat/%') = 1, 'FAIL: chat pushes to egor';
  assert exists (select 1 from net.requests where body -> 0 ->> 'body' = 'Dina: Welcome!'), 'FAIL: chat push text';
  assert exists (select 1 from net.requests where body -> 0 ->> 'to' = 'ExponentPushToken[dina-phone]'
          and body -> 0 ->> 'body' = 'Egor: after the plank'), 'FAIL: photo message push';
  assert not exists (select 1 from net.requests where body -> 0 ->> 'body' like 'Egor:%'
          and body -> 0 ->> 'to' = 'ExponentPushToken[egor-phone]'), 'FAIL: sender got own push';
end $$;
set role authenticated;

-- ---------------------------------------------------------------- nudges
select pg_temp.login('d');
do $$ begin
  assert nudge('00000000-0000-0000-0000-00000000000e') = 'sent', 'FAIL: nudge';
  assert nudge('00000000-0000-0000-0000-00000000000e') = 'already_sent', 'FAIL: one nudge a day';
  begin
    perform nudge('00000000-0000-0000-0000-00000000000f');
    raise exception 'FAIL: nudged a stranger';
  exception when raise_exception then
    if sqlerrm <> 'not_allowed' then raise; end if;
  end;
end $$;
select pg_temp.login('e');
do $$ begin
  assert (select count(*) from get_notifications() where kind = 'nudge' and username = 'dina') = 1,
    'FAIL: nudge notification';
  assert nudge('00000000-0000-0000-0000-00000000000d', current_setting('test.cid')::uuid) = 'sent',
    'FAIL: nudge in a challenge';
end $$;
select pg_temp.login('d');
do $$ begin
  assert (select subject from get_notifications() where kind = 'nudge') = 'Plank', 'FAIL: challenge nudge text';
end $$;

-- ---------------------------------------------------------------- blocking silences notifications
select block_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.login('e');
do $$ begin
  begin
    perform nudge('00000000-0000-0000-0000-00000000000d', current_setting('test.cid')::uuid);
    raise exception 'FAIL: nudged someone who blocked you';
  exception when raise_exception then
    if sqlerrm <> 'not_allowed' then raise; end if;
  end;
end $$;
insert into challenge_messages (challenge_id, body) values (:'cid', 'are you there?');
select pg_temp.login('d');
do $$ begin
  assert (select count(*) from get_challenge_messages(current_setting('test.cid')::uuid)
          where body = 'are you there?') = 0, 'FAIL: blocked user messages are hidden';
end $$;
reset role;
do $$ begin
  assert not exists (select 1 from net.requests where body -> 0 ->> 'body' = 'Egor: are you there?'),
    'FAIL: blocked user pushed a chat message';
end $$;
set role authenticated;

-- ---------------------------------------------------------------- push token moves with the device
select pg_temp.login('f');
select register_push_token('ExponentPushToken[dina-phone]', 'en');
reset role;
do $$ begin
  assert (select user_id from push_tokens where token = 'ExponentPushToken[dina-phone]')
    = '00000000-0000-0000-0000-00000000000f', 'FAIL: token should move to the signed-in user';
end $$;

-- ---------------------------------------------------------------- account deletion cleans up
set role authenticated;
select pg_temp.login('e');
select delete_account();
reset role;
do $$ begin
  assert not exists (select 1 from push_tokens where user_id = '00000000-0000-0000-0000-00000000000e'),
    'FAIL: push tokens left';
  assert not exists (select 1 from challenge_messages where user_id = '00000000-0000-0000-0000-00000000000e'),
    'FAIL: messages left';
  assert not exists (select 1 from notifications where actor_id = '00000000-0000-0000-0000-00000000000e'),
    'FAIL: notifications left';
end $$;
