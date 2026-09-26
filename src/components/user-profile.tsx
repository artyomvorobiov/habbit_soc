import Ionicons from '@expo/vector-icons/Ionicons';
import { useQueryClient } from '@tanstack/react-query';
import { Redirect, router, Stack } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { Streak } from '@/components/habits';
import { ProfileHeader, StatsCard } from '@/components/profile';
import { Button, Card, EmptyState, List, ListItem, Loading, Screen, Section, Txt } from '@/components/ui';
import { HabitIcon, WeekDots } from '@/components/visuals';
import { addFriend } from '@/lib/actions';
import { blockUser, removeFriend, reportUser, respondFriendRequest } from '@/lib/api';
import { useMe } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { qk, useFriends, useToday, useUserHabits } from '@/lib/queries';
import { computeStats } from '@/lib/stats';
import { currentStreak } from '@/lib/streaks';
import { space, useTheme } from '@/lib/theme';

/** Someone else's profile: their shared habits and friendship actions. */
export function UserProfile({ userId }: { userId: string }) {
  const me = useMe();
  const theme = useTheme();
  const today = useToday();
  const qc = useQueryClient();
  const friends = useFriends();
  const data = useUserHabits(userId);

  if (userId === me.id) return <Redirect href="/profile" />;
  if (data.isPending) return <Loading />;
  const profile = data.data?.profile;
  if (!profile) {
    return (
      <Screen>
        <EmptyState emoji="🤷" title={t('userNotFound')} />
      </Screen>
    );
  }

  const relation = friends.data?.find((f) => f.user_id === userId)?.status;
  const habits = data.data?.habits ?? [];
  const index = data.data!.index;
  const stats = computeStats(habits, index, today);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.friends });
    qc.invalidateQueries({ queryKey: qk.feed });
    qc.invalidateQueries({ queryKey: qk.user(userId) });
  };

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      refresh();
    } catch {
      Alert.alert(t('error'));
    }
  };

  const openMenu = () => {
    const name = profile.display_name;
    Alert.alert(name, undefined, [
      ...(relation === 'friend'
        ? [
            {
              text: t('removeFriend'),
              onPress: () =>
                Alert.alert(t('removeFriendConfirm', { name }), undefined, [
                  { text: t('cancel'), style: 'cancel' as const },
                  { text: t('removeFriend'), style: 'destructive' as const, onPress: () => run(() => removeFriend(userId)) },
                ]),
            },
          ]
        : []),
      {
        text: t('block'),
        style: 'destructive' as const,
        onPress: () =>
          Alert.alert(t('blockConfirm', { name }), undefined, [
            { text: t('cancel'), style: 'cancel' as const },
            {
              text: t('block'),
              style: 'destructive' as const,
              onPress: () =>
                run(async () => {
                  await blockUser(userId);
                  router.back();
                }),
            },
          ]),
      },
      {
        text: t('report'),
        onPress: () =>
          Alert.alert(t('reportConfirm', { name }), undefined, [
            { text: t('cancel'), style: 'cancel' as const },
            {
              text: t('report'),
              style: 'destructive' as const,
              onPress: () =>
                run(async () => {
                  await reportUser(userId, 'inappropriate');
                  Alert.alert(t('reportSent'));
                }),
            },
          ]),
      },
      { text: t('cancel'), style: 'cancel' as const },
    ]);
  };

  return (
    <Screen refreshing={data.isRefetching} onRefresh={() => data.refetch()}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Pressable hitSlop={10} onPress={openMenu} accessibilityLabel="More">
              <Ionicons name="ellipsis-horizontal-circle" size={26} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <ProfileHeader avatar={profile.avatar} name={profile.display_name} username={profile.username} />

      {relation === 'friend' ? (
        <Button
          title={`🏆 ${t('challengeFriend')}`}
          onPress={() => router.push({ pathname: '/challenge/new', params: { invite: userId } })}
        />
      ) : relation === 'incoming' ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Button title={t('accept')} onPress={() => run(() => respondFriendRequest(userId, true))} style={{ flex: 1 }} />
          <Button
            title={t('decline')}
            variant="secondary"
            onPress={() => run(() => respondFriendRequest(userId, false))}
            style={{ flex: 1 }}
          />
        </View>
      ) : relation === 'outgoing' ? (
        <Button title={t('cancelRequest')} variant="secondary" onPress={() => run(() => removeFriend(userId))} />
      ) : (
        <Button
          title={t('addFriend')}
          icon="person-add-outline"
          onPress={async () => {
            if (await addFriend(profile.username)) refresh();
          }}
        />
      )}

      {habits.length > 0 ? (
        <>
          <StatsCard stats={stats} today={today} />
          <Section title={t('habits')}>
            <List>
              {habits.map((h) => (
                <ListItem
                  key={h.id}
                  title={h.name}
                  left={<HabitIcon emoji={h.emoji} color={h.color} size={36} />}
                  chevron={false}
                  right={
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Streak value={currentStreak(index.get(h.id) ?? new Set(), h.days, today)} size="sm" />
                      <WeekDots today={today} dates={index.get(h.id)} days={h.days} color={h.color} />
                    </View>
                  }
                />
              ))}
            </List>
          </Section>
        </>
      ) : (
        <Card>
          <Txt tone="secondary" style={{ textAlign: 'center' }}>
            {relation === 'friend' ? t('noSharedHabits') : t('friendsOnlyHint')}
          </Txt>
        </Card>
      )}
    </Screen>
  );
}
