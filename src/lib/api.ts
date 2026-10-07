import { addDays, type ISODate } from './dates';
import { supabase } from './supabase';
import type {
  AppNotification,
  Challenge,
  ChallengeMember,
  ChatMessage,
  Checkin,
  FeedItem,
  Friend,
  Habit,
  HabitInput,
  Profile,
  ReactionEmoji,
} from './types';

// Thin wrappers around Supabase. Every function throws on error so that
// React Query can surface it.

/** Error codes raised by the SQL functions in supabase/schema.sql. */
export type ApiErrorCode =
  | 'user_not_found'
  | 'cannot_add_self'
  | 'challenge_not_found'
  | 'challenge_finished'
  | 'not_invited'
  | 'not_allowed'
  | 'username_taken'
  | 'unknown';

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

function fail(error: { message: string; code?: string }): never {
  const known: ApiErrorCode[] = [
    'user_not_found',
    'cannot_add_self',
    'challenge_not_found',
    'challenge_finished',
    'not_invited',
    'not_allowed',
  ];
  const code = known.find((k) => error.message === k);
  if (code) throw new ApiError(code, error.message);
  if (error.code === '23505' && error.message.includes('username')) {
    throw new ApiError('username_taken', error.message);
  }
  throw new ApiError('unknown', error.message);
}

/** Supabase returns at most 1000 rows per request, so page through bigger sets. */
async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const pageSize = 1000;
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await build(from, from + pageSize - 1);
    if (error) fail(error);
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) return rows;
  }
}

// ---------------------------------------------------------------- profiles

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) fail(error);
  return data as Profile | null;
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase().replace(/^@/, ''))
    .maybeSingle();
  if (error) fail(error);
  return data as Profile | null;
}

export async function isUsernameFree(username: string, myId: string): Promise<boolean> {
  const p = await getProfileByUsername(username);
  return !p || p.id === myId;
}

export async function saveProfile(
  id: string,
  input: Pick<Profile, 'username' | 'display_name' | 'avatar'>,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id, ...input })
    .select()
    .single();
  if (error) fail(error);
  return data as Profile;
}

export async function searchProfiles(query: string, myId: string): Promise<Profile[]> {
  // values are double-quoted in the filter; drop quotes and wildcards
  const q = query
    .trim()
    .toLowerCase()
    .replace(/^@/, '')
    .replace(/["\\%*]/g, '');
  if (q.length < 2) return [];
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`username.ilike."${q}%",display_name.ilike."%${q}%"`)
    .neq('id', myId)
    .limit(20);
  if (error) fail(error);
  return (data ?? []) as Profile[];
}

// ---------------------------------------------------------------- habits

export async function listHabits(userId: string, archived = false): Promise<Habit[]> {
  let query = supabase.from('habits').select('*').eq('user_id', userId);
  query = archived ? query.not('archived_at', 'is', null) : query.is('archived_at', null);
  const { data, error } = await query
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) fail(error);
  return (data ?? []) as Habit[];
}

export async function createHabit(input: HabitInput & { sort_order?: number }): Promise<Habit> {
  const { data, error } = await supabase.from('habits').insert(input).select().single();
  if (error) fail(error);
  return data as Habit;
}

export async function updateHabit(id: string, patch: Partial<Habit>): Promise<Habit> {
  const { data, error } = await supabase.from('habits').update(patch).eq('id', id).select().single();
  if (error) fail(error);
  return data as Habit;
}

export async function deleteHabit(id: string): Promise<void> {
  // photo proofs are files, not rows: collect them before the habit is gone
  const photos = await fetchAll<{ photo_path: string }>((a, b) =>
    supabase.from('checkins').select('photo_path').eq('habit_id', id).not('photo_path', 'is', null).range(a, b),
  );
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) fail(error);
  if (photos.length) await supabase.storage.from('photos').remove(photos.map((p) => p.photo_path));
}

// ---------------------------------------------------------------- check-ins

/** How far back check-ins are loaded (enough for streaks and yearly stats). */
export const HISTORY_DAYS = 400;

export function listCheckins(userId: string, today: ISODate): Promise<Checkin[]> {
  const from = addDays(today, -HISTORY_DAYS);
  return fetchAll<Checkin>((a, b) =>
    supabase
      .from('checkins')
      .select('habit_id,user_id,date,photo_path,note')
      .eq('user_id', userId)
      .gte('date', from)
      .order('date', { ascending: true })
      .range(a, b),
  );
}

export function listCheckinsForHabits(habitIds: string[], from: ISODate, to: ISODate): Promise<Checkin[]> {
  if (habitIds.length === 0) return Promise.resolve([]);
  return fetchAll<Checkin>((a, b) =>
    supabase
      .from('checkins')
      .select('habit_id,user_id,date,photo_path')
      .in('habit_id', habitIds)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: true })
      .range(a, b),
  );
}

export async function setCheckin(habitId: string, date: ISODate, done: boolean): Promise<void> {
  if (done) {
    const { error } = await supabase.from('checkins').insert({ habit_id: habitId, date });
    // 23505 = already checked (e.g. double tap): that's fine
    if (error && error.code !== '23505') fail(error);
  } else {
    const { error } = await supabase.from('checkins').delete().eq('habit_id', habitId).eq('date', date);
    if (error) fail(error);
  }
}

/**
 * Saves the photo proof and note of a day, checking the habit off if needed.
 * Pass photoPath = null to remove the photo.
 */
export async function saveCheckinProof(
  habitId: string,
  date: ISODate,
  photoPath: string | null,
  note: string | null,
  alreadyChecked = false,
): Promise<void> {
  if (alreadyChecked) {
    const { data, error } = await supabase
      .from('checkins')
      .update({ photo_path: photoPath, note })
      .eq('habit_id', habitId)
      .eq('date', date)
      .select('id');
    if (error) fail(error);
    if (data?.length) return;
  }
  const { error: insertError } = await supabase
    .from('checkins')
    .insert({ habit_id: habitId, date, photo_path: photoPath, note });
  if (!insertError) return;
  if (insertError.code !== '23505') fail(insertError);
  // already checked off: attach the proof to the existing check-in
  const { error } = await supabase
    .from('checkins')
    .update({ photo_path: photoPath, note })
    .eq('habit_id', habitId)
    .eq('date', date);
  if (error) fail(error);
}

export type HabitPhoto = { date: ISODate; photo_path: string; note: string | null };

export async function listHabitPhotos(habitId: string): Promise<HabitPhoto[]> {
  const { data, error } = await supabase
    .from('checkins')
    .select('date,photo_path,note')
    .eq('habit_id', habitId)
    .not('photo_path', 'is', null)
    .order('date', { ascending: false })
    .limit(90);
  if (error) fail(error);
  return (data ?? []) as HabitPhoto[];
}

// ---------------------------------------------------------------- friends

export async function getFriends(today: ISODate): Promise<Friend[]> {
  const { data, error } = await supabase.rpc('get_friends', { p_today: today });
  if (error) fail(error);
  return (data ?? []) as Friend[];
}

export type FriendRequestResult = 'requested' | 'accepted' | 'already_friends' | 'already_requested';

export async function sendFriendRequest(username: string): Promise<FriendRequestResult> {
  const { data, error } = await supabase.rpc('send_friend_request', { p_username: username });
  if (error) fail(error);
  return data as FriendRequestResult;
}

export async function respondFriendRequest(requester: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_friend_request', {
    p_requester: requester,
    p_accept: accept,
  });
  if (error) fail(error);
}

export async function removeFriend(userId: string): Promise<void> {
  const { error } = await supabase.rpc('remove_friend', { p_user: userId });
  if (error) fail(error);
}

export async function blockUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc('block_user', { p_user: userId });
  if (error) fail(error);
}

export async function reportUser(userId: string, reason: string): Promise<void> {
  const { error } = await supabase.from('reports').insert({ reported: userId, reason });
  if (error) fail(error);
}

// ---------------------------------------------------------------- feed

export const FEED_PAGE = 30;

export async function getFeed(before?: string): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('get_feed', {
    p_limit: FEED_PAGE,
    p_before: before ?? null,
  });
  if (error) fail(error);
  return (data ?? []) as FeedItem[];
}

export async function setReaction(checkinId: string, userId: string, emoji: ReactionEmoji | null) {
  if (emoji === null) {
    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('checkin_id', checkinId)
      .eq('user_id', userId);
    if (error) fail(error);
  } else {
    const { error } = await supabase
      .from('reactions')
      .upsert({ checkin_id: checkinId, user_id: userId, emoji });
    if (error) fail(error);
  }
}

// ---------------------------------------------------------------- challenges

export async function getMyChallenges(): Promise<Challenge[]> {
  const { data, error } = await supabase.rpc('get_my_challenges');
  if (error) fail(error);
  return (data ?? []) as Challenge[];
}

export async function getChallengeMembers(challengeId: string): Promise<ChallengeMember[]> {
  const { data, error } = await supabase.rpc('get_challenge_members', { p_challenge: challengeId });
  if (error) fail(error);
  return (data ?? []) as ChallengeMember[];
}

export async function createChallenge(input: {
  title: string;
  emoji: string;
  color: string;
  start: ISODate;
  end: ISODate;
  invitees: string[];
  proofRequired: boolean;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_challenge', {
    p_title: input.title,
    p_emoji: input.emoji,
    p_color: input.color,
    p_start: input.start,
    p_end: input.end,
    p_invitees: input.invitees,
    p_proof_required: input.proofRequired,
  });
  if (error) fail(error);
  return data as string;
}

export async function inviteToChallenge(challengeId: string, userIds: string[]): Promise<void> {
  const { error } = await supabase.rpc('invite_to_challenge', {
    p_challenge: challengeId,
    p_invitees: userIds,
  });
  if (error) fail(error);
}

export async function joinChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase.rpc('join_challenge', { p_challenge: challengeId });
  if (error) fail(error);
}

export async function joinChallengeByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_challenge_by_code', { p_code: code });
  if (error) fail(error);
  return data as string;
}

export async function leaveChallenge(challengeId: string, habitId?: string | null): Promise<void> {
  const photos = habitId ? await listHabitPhotos(habitId) : [];
  const { error } = await supabase.rpc('leave_challenge', { p_challenge: challengeId });
  if (error) fail(error);
  if (!photos.length) return;
  // a running challenge takes its habit (and check-ins) with it; files stay unless removed
  const { data: stillThere } = await supabase.from('habits').select('id').eq('id', habitId!).maybeSingle();
  if (!stillThere) await supabase.storage.from('photos').remove(photos.map((p) => p.photo_path));
}

// ---------------------------------------------------------------- chat

export const CHAT_PAGE = 50;

export async function getChatMessages(challengeId: string, before?: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase.rpc('get_challenge_messages', {
    p_challenge: challengeId,
    p_before: before ?? null,
    p_limit: CHAT_PAGE,
  });
  if (error) fail(error);
  return (data ?? []) as ChatMessage[];
}

export async function sendChatMessage(
  challengeId: string,
  message: { body: string } | { photoPath: string; body?: string },
): Promise<void> {
  const row: { challenge_id: string; kind: 'text' | 'photo'; body: string | null; photo_path: string | null } =
    'photoPath' in message
      ? { challenge_id: challengeId, kind: 'photo', photo_path: message.photoPath, body: message.body || null }
      : { challenge_id: challengeId, kind: 'text', photo_path: null, body: message.body };
  const { error } = await supabase.from('challenge_messages').insert(row);
  if (error) fail(error);
}

export async function deleteChatMessage(messageId: string): Promise<void> {
  const { error } = await supabase.from('challenge_messages').delete().eq('id', messageId);
  if (error) fail(error);
}

export async function markChatRead(challengeId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_chat_read', { p_challenge: challengeId });
  if (error) fail(error);
}

// ---------------------------------------------------------------- notifications

export async function getNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase.rpc('get_notifications', { p_limit: 60 });
  if (error) fail(error);
  return (data ?? []) as AppNotification[];
}

export async function markNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc('mark_notifications_read');
  if (error) fail(error);
}

/** Returns 'sent' or 'already_sent' (one nudge per person per day). */
export async function nudge(userId: string, challengeId?: string): Promise<'sent' | 'already_sent'> {
  const { data, error } = await supabase.rpc('nudge', {
    p_user: userId,
    p_challenge: challengeId ?? null,
  });
  if (error) fail(error);
  return data as 'sent' | 'already_sent';
}

export async function registerPushToken(token: string, locale: string): Promise<void> {
  const { error } = await supabase.rpc('register_push_token', { p_token: token, p_locale: locale });
  if (error) fail(error);
}

export async function unregisterPushToken(token: string): Promise<void> {
  const { error } = await supabase.rpc('unregister_push_token', { p_token: token });
  if (error) fail(error);
}

// ---------------------------------------------------------------- account

export async function deleteAccount(userId: string): Promise<void> {
  // photos are files, not rows: remove them before the account itself
  for (let round = 0; round < 50; round++) {
    const { data: files } = await supabase.storage.from('photos').list(userId, { limit: 1000 });
    if (!files?.length) break;
    const { error } = await supabase.storage.from('photos').remove(files.map((f) => `${userId}/${f.name}`));
    if (error) break;
  }
  const { error } = await supabase.rpc('delete_account');
  if (error) fail(error);
  await supabase.auth.signOut({ scope: 'local' });
}
