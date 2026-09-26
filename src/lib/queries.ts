import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AppState } from 'react-native';

import * as api from './api';
import { useMe } from './auth';
import { addDays, today as getToday, type ISODate } from './dates';
import { t } from './i18n';
import type { Challenge, Checkin, FeedItem, ReactionEmoji } from './types';

export const qk = {
  habits: (uid: string) => ['habits', uid] as const,
  archived: (uid: string) => ['habits', uid, 'archived'] as const,
  habit: (id: string) => ['habit', id] as const,
  checkins: (uid: string) => ['checkins', uid] as const,
  friends: ['friends'] as const,
  feed: ['feed'] as const,
  challenges: ['challenges'] as const,
  challenge: (id: string) => ['challenge', id] as const,
  user: (id: string) => ['user', id] as const,
};

/** Today's date; updates when the app returns to the foreground or at midnight. */
export function useToday(): ISODate {
  const [today, setToday] = useState(getToday);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') setToday(getToday());
    });
    const now = new Date();
    const msToMidnight =
      new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - now.getTime();
    const timer = setTimeout(() => setToday(getToday()), msToMidnight + 1000);
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [today]);
  return today;
}

/** Groups check-ins into habitId → set of dates. */
export function indexCheckins(checkins: Checkin[] | undefined): Map<string, Set<ISODate>> {
  const map = new Map<string, Set<ISODate>>();
  for (const c of checkins ?? []) {
    let set = map.get(c.habit_id);
    if (!set) map.set(c.habit_id, (set = new Set()));
    set.add(c.date);
  }
  return map;
}

// ---------------------------------------------------------------- my data

export function useMyHabits() {
  const me = useMe();
  return useQuery({
    queryKey: qk.habits(me.id),
    queryFn: () => api.listHabits(me.id),
    enabled: !!me.id,
  });
}

export function useArchivedHabits() {
  const me = useMe();
  return useQuery({
    queryKey: qk.archived(me.id),
    queryFn: () => api.listHabits(me.id, true),
    enabled: !!me.id,
  });
}

export function useMyCheckins() {
  const me = useMe();
  const today = useToday();
  const query = useQuery({
    queryKey: qk.checkins(me.id),
    queryFn: () => api.listCheckins(me.id, today),
    enabled: !!me.id,
  });
  const index = useMemo(() => indexCheckins(query.data), [query.data]);
  return { ...query, index };
}

export function useToggleCheckin() {
  const me = useMe();
  const qc = useQueryClient();
  return useMutation({
    // run toggles one after another so a quick double tap ends in the right state
    scope: { id: 'checkins' },
    mutationFn: (v: { habitId: string; date: ISODate; done: boolean }) =>
      api.setCheckin(v.habitId, v.date, v.done),
    onMutate: async (v) => {
      const key = qk.checkins(me.id);
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<Checkin[]>(key);
      qc.setQueryData<Checkin[]>(key, (old = []) => {
        const rest = old.filter((c) => !(c.habit_id === v.habitId && c.date === v.date));
        return v.done ? [...rest, { habit_id: v.habitId, user_id: me.id, date: v.date }] : rest;
      });
      return { previous };
    },
    onError: (_error, _v, context) => {
      qc.setQueryData(qk.checkins(me.id), context?.previous);
      Alert.alert(t('error'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.feed });
      qc.invalidateQueries({ queryKey: ['challenge'] });
    },
  });
}

/** Invalidate everything that depends on the list of habits. */
export function useRefreshHabits() {
  const me = useMe();
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['habits', me.id] });
    qc.invalidateQueries({ queryKey: qk.checkins(me.id) });
    qc.invalidateQueries({ queryKey: qk.feed });
    qc.invalidateQueries({ queryKey: qk.challenges });
  };
}

// ---------------------------------------------------------------- friends & feed

export function useFriends() {
  const me = useMe();
  const today = useToday();
  return useQuery({
    queryKey: qk.friends,
    queryFn: () => api.getFriends(today),
    enabled: !!me.id,
  });
}

export function useFeed() {
  const me = useMe();
  return useInfiniteQuery({
    queryKey: qk.feed,
    queryFn: ({ pageParam }) => api.getFeed(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.length === api.FEED_PAGE ? last[last.length - 1].created_at : undefined,
    enabled: !!me.id,
  });
}

export function useReact() {
  const me = useMe();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { item: FeedItem; emoji: ReactionEmoji | null }) =>
      api.setReaction(v.item.checkin_id, me.id, v.emoji),
    onMutate: async ({ item, emoji }) => {
      await qc.cancelQueries({ queryKey: qk.feed });
      const previous = qc.getQueryData<InfiniteData<FeedItem[]>>(qk.feed);
      qc.setQueryData<InfiniteData<FeedItem[]>>(qk.feed, (data) => {
        if (!data) return data;
        return {
          ...data,
          pages: data.pages.map((page) =>
            page.map((f) => {
              if (f.checkin_id !== item.checkin_id) return f;
              const reactions = { ...f.reactions };
              if (f.my_reaction) {
                const n = (reactions[f.my_reaction] ?? 1) - 1;
                if (n > 0) reactions[f.my_reaction] = n;
                else delete reactions[f.my_reaction];
              }
              if (emoji) reactions[emoji] = (reactions[emoji] ?? 0) + 1;
              return { ...f, reactions, my_reaction: emoji };
            }),
          ),
        };
      });
      return { previous };
    },
    onError: (_e, _v, context) => {
      qc.setQueryData(qk.feed, context?.previous);
      Alert.alert(t('error'));
    },
  });
}

export function useUserHabits(userId: string) {
  const me = useMe();
  const today = useToday();
  return useQuery({
    queryKey: qk.user(userId),
    queryFn: async () => {
      const [profile, habits] = await Promise.all([
        api.getProfile(userId),
        api.listHabits(userId),
      ]);
      const checkins = await api.listCheckinsForHabits(
        habits.map((h) => h.id),
        addDays(today, -api.HISTORY_DAYS),
        today,
      );
      return { profile, habits, index: indexCheckins(checkins) };
    },
    enabled: !!me.id && !!userId,
  });
}

// ---------------------------------------------------------------- challenges

export function useChallenges() {
  const me = useMe();
  return useQuery({
    queryKey: qk.challenges,
    queryFn: api.getMyChallenges,
    enabled: !!me.id,
  });
}

/** Map habitId → challenge for my joined challenges. */
export function useChallengeByHabit(): Map<string, Challenge> {
  const { data } = useChallenges();
  return useMemo(() => {
    const map = new Map<string, Challenge>();
    for (const c of data ?? []) if (c.my_habit_id) map.set(c.my_habit_id, c);
    return map;
  }, [data]);
}

export function useChallengeDetails(challenge: Challenge | undefined) {
  const me = useMe();
  return useQuery({
    queryKey: qk.challenge(challenge?.id ?? ''),
    queryFn: async () => {
      const members = await api.getChallengeMembers(challenge!.id);
      const habitIds = members.flatMap((m) => (m.habit_id ? [m.habit_id] : []));
      const checkins = await api.listCheckinsForHabits(
        habitIds,
        challenge!.start_date,
        challenge!.end_date,
      );
      return { members, index: indexCheckins(checkins) };
    },
    enabled: !!me.id && !!challenge,
  });
}
