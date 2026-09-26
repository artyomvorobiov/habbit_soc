import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { MonthCalendar } from '@/components/calendar';
import { Button, Card, EmptyState, List, ListItem, Loading, Screen, Txt } from '@/components/ui';
import { HabitIcon } from '@/components/visuals';
import { deleteHabit, updateHabit } from '@/lib/api';
import { addDays, toISODate } from '@/lib/dates';
import { formatDays, t } from '@/lib/i18n';
import {
  useArchivedHabits,
  useChallengeByHabit,
  useMyCheckins,
  useMyHabits,
  useRefreshHabits,
  useToday,
  useToggleCheckin,
} from '@/lib/queries';
import { bestStreak, completionRate, currentStreak } from '@/lib/streaks';
import { space, useTheme } from '@/lib/theme';

export default function HabitDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const today = useToday();
  const habits = useMyHabits();
  const archived = useArchivedHabits();
  const checkins = useMyCheckins();
  const challengeByHabit = useChallengeByHabit();
  const toggle = useToggleCheckin();
  const refresh = useRefreshHabits();

  const habit = habits.data?.find((h) => h.id === id) ?? archived.data?.find((h) => h.id === id);

  if (!habit) {
    if (habits.isPending || archived.isPending) return <Loading />;
    return (
      <Screen>
        <EmptyState emoji="🤷" title={t('habitNotFound')} />
      </Screen>
    );
  }

  const dates = checkins.index.get(habit.id) ?? new Set<string>();
  const current = currentStreak(dates, habit.days, today);
  const best = bestStreak(dates, habit.days);
  const created = toISODate(new Date(habit.created_at));
  const from = created > addDays(today, -29) ? created : addDays(today, -29);
  const rate = completionRate(dates, habit.days, from, today);
  const challenge = challengeByHabit.get(habit.id);
  const isArchived = !!habit.archived_at;

  const setArchived = async (value: boolean) => {
    try {
      await updateHabit(habit.id, { archived_at: value ? new Date().toISOString() : null });
      refresh();
      router.back();
    } catch {
      Alert.alert(t('error'));
    }
  };

  const confirmDelete = () =>
    Alert.alert(t('deleteHabitTitle'), t('deleteHabitText'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteHabit(habit.id);
            refresh();
            router.back();
          } catch {
            Alert.alert(t('error'));
          }
        },
      },
    ]);

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: habit.name,
          headerRight: () => (
            <Pressable
              hitSlop={10}
              accessibilityLabel={t('edit')}
              onPress={() => router.push(`/habit/edit/${habit.id}`)}>
              <Ionicons name="create-outline" size={24} color={theme.text} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.hero}>
        <HabitIcon emoji={habit.emoji} color={habit.color} size={80} />
        <Txt variant="title" style={{ textAlign: 'center' }}>
          {habit.name}
        </Txt>
        <Txt tone="secondary">
          {formatDays(habit.days)}
          {habit.visibility === 'private' ? ` · 🔒 ${t('private')}` : ''}
          {isArchived ? ` · ${t('archived')}` : ''}
        </Txt>
      </View>

      <View style={styles.stats}>
        <Stat big={`🔥 ${current}`} label={t('currentStreak')} color={theme.flame} />
        <Stat big={String(best)} label={t('bestStreak')} />
      </View>
      <View style={styles.stats}>
        <Stat big={`${Math.round(rate * 100)}%`} label={t('last30')} />
        <Stat big={String(dates.size)} label={t('total')} />
      </View>

      {challenge ? (
        <List>
          <ListItem
            title={challenge.title}
            subtitle={`🏆 ${t('challengeBadge')}`}
            onPress={() => router.push(`/challenge/${challenge.id}`)}
          />
        </List>
      ) : null}

      <Card style={{ gap: space.sm }}>
        <MonthCalendar
          today={today}
          dates={dates}
          days={habit.days}
          color={habit.color}
          onToggle={isArchived ? undefined : (date, done) => toggle.mutate({ habitId: habit.id, date, done })}
        />
        {!isArchived ? (
          <Txt variant="footnote" tone="tertiary" style={{ textAlign: 'center' }}>
            {t('tapToMark')}
          </Txt>
        ) : null}
      </Card>

      <Button
        title={t('shareStreak')}
        icon="share-outline"
        onPress={() => router.push(`/habit/share/${habit.id}`)}
      />
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Button
          title={isArchived ? t('unarchive') : t('archive')}
          variant="secondary"
          onPress={() => setArchived(!isArchived)}
          style={{ flex: 1 }}
        />
        <Button title={t('delete')} variant="danger" onPress={confirmDelete} style={{ flex: 1 }} />
      </View>
    </Screen>
  );
}

function Stat({ big, label, color }: { big: string; label: string; color?: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.stat, { backgroundColor: theme.card }]}>
      <Txt variant="title" style={[{ fontVariant: ['tabular-nums'] }, color ? { color } : null]}>
        {big}
      </Txt>
      <Txt variant="caption" tone="secondary">
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingVertical: space.sm },
  stats: { flexDirection: 'row', gap: space.sm },
  stat: { flex: 1, borderRadius: 16, padding: space.lg, gap: 2 },
});
