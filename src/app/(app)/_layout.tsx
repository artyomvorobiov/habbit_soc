import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useMe } from '@/lib/auth';
import { t } from '@/lib/i18n';
import { syncReminders } from '@/lib/notifications';
import { registerForPush } from '@/lib/push';
import { useMyCheckins, useMyHabits, useToday } from '@/lib/queries';
import { useRealtime } from '@/lib/realtime';
import { useTheme } from '@/lib/theme';

// Deep links (e.g. streakmates://u/alice) open on top of the tabs.
export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
  const theme = useTheme();
  return (
    <>
      <ReminderSync />
      <Live />
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
        <Stack.Screen name="proof/[habitId]" options={{ presentation: 'modal', title: t('proofTitle') }} />
        <Stack.Screen
          name="photo"
          options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }}
        />
        <Stack.Screen name="chat/[id]" options={{ title: t('chat') }} />
        <Stack.Screen name="activity" options={{ title: t('inbox') }} />
        <Stack.Screen name="recap" options={{ presentation: 'modal', title: t('weeklyRecap') }} />
      </Stack>
    </>
  );
}

/** Live chat/notification updates and push registration for the signed-in user. */
function Live() {
  const me = useMe();
  useRealtime(me.id);
  useEffect(() => {
    if (!me.id) return;
    registerForPush(me.id);
    // the user may have allowed notifications in the system settings meanwhile
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') registerForPush(me.id);
    });
    return () => sub.remove();
  }, [me.id]);
  return null;
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
