import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { WeekStrip } from '@/components/calendar';
import { HabitRow } from '@/components/habits';
import { Button, Card, Chip, EmptyState, IconButton, Section, TabScreen, Txt } from '@/components/ui';
import { haptic, ProgressRing } from '@/components/visuals';
import { addDays, toISODate, type ISODate } from '@/lib/dates';
import { formatLongDate, t, type TKey } from '@/lib/i18n';
import {
  useChallengeByHabit,
  useMyCheckins,
  useMyHabits,
  useToday,
  useToggleCheckin,
} from '@/lib/queries';
import { currentStreak, isScheduled } from '@/lib/streaks';
import { space, useTheme } from '@/lib/theme';
import type { Habit } from '@/lib/types';

const IDEAS: { emoji: string; key: TKey }[] = [
  { emoji: '💧', key: 'idea1' },
  { emoji: '🏃', key: 'idea2' },
  { emoji: '📚', key: 'idea3' },
  { emoji: '🧘', key: 'idea4' },
  { emoji: '🍬', key: 'idea5' },
  { emoji: '😴', key: 'idea6' },
];

export default function TodayScreen() {
  const theme = useTheme();
  const today = useToday();
  const [picked, setPicked] = useState<ISODate | null>(null);
  // after midnight "today" moves on; a stale selection is dropped
  const selected = picked && picked <= today ? picked : today;

  const habitsQuery = useMyHabits();
  const checkins = useMyCheckins();
  const challengeByHabit = useChallengeByHabit();
  const toggle = useToggleCheckin();

  const habits = habitsQuery.data ?? [];

  /**
   * A habit shows up from the day it was created (earlier days can still be
   * filled in from the habit's calendar); challenge habits once it has started.
   */
  const activeOn = (h: Habit, date: ISODate) => {
    const challenge = challengeByHabit.get(h.id);
    if (challenge && date < challenge.start_date) return false;
    return date >= toISODate(new Date(h.created_at));
  };
  const plannedOn = (date: ISODate) =>
    habits.filter((h) => activeOn(h, date) && isScheduled(h.days, date));
  const isDone = (h: Habit, date: ISODate) => checkins.index.get(h.id)?.has(date) ?? false;

  const planned = plannedOn(selected);
  const others = habits.filter((h) => activeOn(h, selected) && !isScheduled(h.days, selected));
  const doneCount = planned.filter((h) => isDone(h, selected)).length;
  const ratio = planned.length ? doneCount / planned.length : 0;

  const progressOn = (date: ISODate) => {
    const list = plannedOn(date);
    return list.length ? list.filter((h) => isDone(h, date)).length / list.length : 0;
  };

  const onToggle = (h: Habit) => {
    const done = !isDone(h, selected);
    toggle.mutate({ habitId: h.id, date: selected, done });
    if (done && planned.includes(h) && doneCount + 1 === planned.length) haptic('success');
  };

  const message =
    ratio === 1 ? t('allDone') : ratio >= 0.5 ? t('almostThere') : ratio > 0 ? t('goodStart') : t('keepGoing');

  const renderRow = (h: Habit) => (
    <HabitRow
      key={h.id}
      habit={h}
      done={isDone(h, selected)}
      streak={currentStreak(checkins.index.get(h.id) ?? new Set(), h.days, today)}
      challengeTitle={challengeByHabit.get(h.id)?.title}
      onToggle={() => onToggle(h)}
      onPress={() => router.push(`/habit/${h.id}`)}
    />
  );

  return (
    <TabScreen
      title={
        selected === today
          ? t('today')
          : selected === addDays(today, -1)
            ? t('yesterday')
            : formatLongDate(selected).split(',')[0]
      }
      subtitle={formatLongDate(selected)}
      right={
        <IconButton icon="add" accessibilityLabel={t('newHabit')} onPress={() => router.push('/habit/new')} />
      }
      refreshing={habitsQuery.isRefetching}
      onRefresh={() => {
        habitsQuery.refetch();
        checkins.refetch();
      }}>
      <WeekStrip today={today} selected={selected} onSelect={setPicked} progress={progressOn} />

      {habitsQuery.isSuccess && habits.length === 0 ? (
        <Card>
          <EmptyState emoji="🌱" title={t('noHabitsTitle')} text={t('noHabitsText')}>
            <Button title={t('newHabit')} icon="add" onPress={() => router.push('/habit/new')} />
          </EmptyState>
          <Section title={t('ideas')}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
              {IDEAS.map((idea) => (
                <Chip
                  key={idea.key}
                  label={`${idea.emoji} ${t(idea.key)}`}
                  onPress={() =>
                    router.push({ pathname: '/habit/new', params: { name: t(idea.key), emoji: idea.emoji } })
                  }
                />
              ))}
            </View>
          </Section>
        </Card>
      ) : null}

      {planned.length > 0 ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: space.lg }}>
          <ProgressRing progress={ratio} size={64} stroke={7} color={theme.success}>
            <Txt variant="headline" style={{ fontVariant: ['tabular-nums'] }}>
              {doneCount}/{planned.length}
            </Txt>
          </ProgressRing>
          <View style={{ flex: 1 }}>
            <Txt variant="title">{message}</Txt>
          </View>
        </Card>
      ) : habits.length > 0 ? (
        <Txt tone="secondary" style={{ textAlign: 'center', paddingVertical: space.lg }}>
          {t('nothingToday')}
        </Txt>
      ) : null}

      <View style={{ gap: space.sm }}>{planned.map(renderRow)}</View>

      {others.length > 0 ? (
        <Section title={t('notPlanned')}>
          <View style={{ gap: space.sm, opacity: 0.75 }}>{others.map(renderRow)}</View>
        </Section>
      ) : null}
    </TabScreen>
  );
}
