import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { t } from '@/lib/i18n';
import { syncReminders } from '@/lib/notifications';
import { useMyCheckins, useMyHabits, useToday } from '@/lib/queries';
import { useTheme } from '@/lib/theme';

// Deep links (e.g. streakmates://u/alice) open on top of the tabs.
export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  const theme = useTheme();
  return (
    <>
      <ReminderSync />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="habit/new" options={{ presentation: 'modal', title: t('newHabit') }} />
        <Stack.Screen name="habit/[id]" options={{ title: '' }} />
        <Stack.Screen name="habit/edit/[id]" options={{ presentation: 'modal', title: t('editHabit') }} />
        <Stack.Screen name="habit/share/[id]" options={{ presentation: 'modal', title: t('share') }} />
        <Stack.Screen name="archived" options={{ title: t('archivedHabits') }} />
        <Stack.Screen name="friends" options={{ title: t('friends') }} />
        <Stack.Screen name="user/[id]" options={{ title: '' }} />
        <Stack.Screen name="u/[username]" options={{ title: '' }} />
        <Stack.Screen name="challenge/new" options={{ presentation: 'modal', title: t('newChallenge') }} />
        <Stack.Screen name="challenge/[id]" options={{ title: '' }} />
        <Stack.Screen name="join/index" options={{ presentation: 'modal', title: t('joinByCode') }} />
        <Stack.Screen name="join/[code]" options={{ title: '' }} />
        <Stack.Screen name="settings" options={{ title: t('settings') }} />
      </Stack>
    </>
  );
}

/** Keeps local reminder notifications in line with habits and today's check-ins. */
function ReminderSync() {
  const today = useToday();
  const habits = useMyHabits();
  const checkins = useMyCheckins();

  useEffect(() => {
    if (!habits.data || !checkins.data) return;
    const timer = setTimeout(() => {
      syncReminders(habits.data, (id) => checkins.index.get(id)?.has(today) ?? false, today);
    }, 1000);
    return () => clearTimeout(timer);
  }, [habits.data, checkins.data, checkins.index, today]);

  return null;
}
