import { addDays, type ISODate } from './dates';
import { supabase } from './supabase';
import type {
  Challenge,
  ChallengeMember,
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
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) fail(error);
}

// ---------------------------------------------------------------- check-ins

/** How far back check-ins are loaded (enough for streaks and yearly stats). */
export const HISTORY_DAYS = 400;

export function listCheckins(userId: string, today: ISODate): Promise<Checkin[]> {
  const from = addDays(today, -HISTORY_DAYS);
  return fetchAll<Checkin>((a, b) =>
    supabase
      .from('checkins')
      .select('habit_id,user_id,date')
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
      .select('habit_id,user_id,date')
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
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_challenge', {
    p_title: input.title,
    p_emoji: input.emoji,
    p_color: input.color,
    p_start: input.start,
    p_end: input.end,
    p_invitees: input.invitees,
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

export async function leaveChallenge(challengeId: string): Promise<void> {
  const { error } = await supabase.rpc('leave_challenge', { p_challenge: challengeId });
  if (error) fail(error);
}

// ---------------------------------------------------------------- account

export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_account');
  if (error) fail(error);
  await supabase.auth.signOut({ scope: 'local' });
}
