import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { HabitForm } from '@/components/habits';
import { Button, Screen } from '@/components/ui';
import { createHabit } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useMyHabits, useRefreshHabits } from '@/lib/queries';
import { HABIT_COLORS } from '@/lib/theme';
import type { HabitInput } from '@/lib/types';

export default function NewHabit() {
  const params = useLocalSearchParams<{ name?: string; emoji?: string }>();
  const habits = useMyHabits();
  const refresh = useRefreshHabits();
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState<HabitInput>(() => ({
    name: params.name ?? '',
    emoji: params.emoji ?? '✅',
    color: HABIT_COLORS[Math.floor(Math.random() * HABIT_COLORS.length)],
    days: [1, 2, 3, 4, 5, 6, 7],
    visibility: 'friends',
    reminder_time: null,
  }));

  const save = async () => {
    setBusy(true);
    try {
      await createHabit({ ...value, name: value.name.trim(), sort_order: habits.data?.length ?? 0 });
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
