import { router } from 'expo-router';
import { View } from 'react-native';

import { Streak } from '@/components/habits';
import { ProfileHeader, StatsCard } from '@/components/profile';
import { Button, IconButton, List, ListItem, Section, TabScreen } from '@/components/ui';
import { HabitIcon, WeekDots } from '@/components/visuals';
import { useMe } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { useArchivedHabits, useFriends, useMyCheckins, useMyHabits, useToday } from '@/lib/queries';
import { shareInvite } from '@/lib/share';
import { computeStats } from '@/lib/stats';
import { currentStreak } from '@/lib/streaks';
import { space } from '@/lib/theme';

export default function ProfileScreen() {
  const me = useMe();
  const today = useToday();
  const habits = useMyHabits();
  const archived = useArchivedHabits();
  const checkins = useMyCheckins();
  const friends = useFriends();

  const list = habits.data ?? [];
  const stats = computeStats(list, checkins.index, today);
  const friendCount = friends.data?.filter((f) => f.status === 'friend').length ?? 0;

  return (
    <TabScreen
      title={t('profile')}
      right={<IconButton icon="settings-outline" accessibilityLabel={t('settings')} onPress={() => router.push('/settings')} />}
      refreshing={habits.isRefetching}
      onRefresh={() => {
        habits.refetch();
        checkins.refetch();
        friends.refetch();
      }}>
      <ProfileHeader avatar={me.avatar} name={me.display_name} username={me.username} />

      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button
          title={t('shareProfile')}
          icon="share-outline"
          compact
          onPress={() => shareInvite(me.username)}
          style={{ flex: 1 }}
        />
        <Button
          title={`${t('friends')} · ${friendCount}`}
          icon="people-outline"
          variant="secondary"
          compact
          onPress={() => router.push('/friends')}
          style={{ flex: 1 }}
        />
      </View>

      <StatsCard stats={stats} today={today} />

      {list.length > 0 ? (
        <Section title={t('myHabits')}>
          <List>
            {list.map((h) => (
              <ListItem
                key={h.id}
                title={h.name}
                left={<HabitIcon emoji={h.emoji} color={h.color} size={36} />}
                right={
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Streak value={currentStreak(checkins.index.get(h.id) ?? new Set(), h.days, today)} size="sm" />
                    <WeekDots today={today} dates={checkins.index.get(h.id)} days={h.days} color={h.color} />
                  </View>
                }
                onPress={() => router.push(`/habit/${h.id}`)}
              />
            ))}
          </List>
        </Section>
      ) : null}

      {archived.data && archived.data.length > 0 ? (
        <List>
          <ListItem
            icon="archive-outline"
            title={t('archivedHabits')}
            value={String(archived.data.length)}
            onPress={() => router.push('/archived')}
          />
        </List>
      ) : null}
    </TabScreen>
  );
}
