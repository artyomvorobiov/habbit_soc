import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { HabitForm } from '@/components/habits';
import { Button, EmptyState, Screen } from '@/components/ui';
import { updateHabit } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useArchivedHabits, useMyHabits, useRefreshHabits } from '@/lib/queries';
import type { Habit, HabitInput } from '@/lib/types';

export default function EditHabit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const habits = useMyHabits();
  const archived = useArchivedHabits();
  const habit = habits.data?.find((h) => h.id === id) ?? archived.data?.find((h) => h.id === id);

  if (!habit) {
    return (
      <Screen>
        <EmptyState emoji="🤷" title={t('habitNotFound')} />
      </Screen>
    );
  }
  return <Form habit={habit} />;
}

function Form({ habit }: { habit: Habit }) {
  const refresh = useRefreshHabits();
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState<HabitInput>({
    name: habit.name,
    emoji: habit.emoji,
    color: habit.color,
    days: habit.days,
    visibility: habit.visibility,
    reminder_time: habit.reminder_time,
  });

  const save = async () => {
    setBusy(true);
    try {
      await updateHabit(habit.id, { ...value, name: value.name.trim() });
      refresh();
      router.back();
    } catch {
      Alert.alert(t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <HabitForm value={value} onChange={setValue} />
      <Button title={t('save')} onPress={save} loading={busy} disabled={!value.name.trim()} />
    </Screen>
  );
}
