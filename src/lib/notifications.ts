import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays, type ISODate } from './dates';
import { t } from './i18n';
import { isScheduled } from './streaks';
import type { Habit } from './types';

// Reminders are local notifications scheduled on the phone. Instead of an
// endless repeating alarm we schedule the next days one by one, which lets us
// skip today's reminder once the habit is done. The schedule is rebuilt every
// time the app opens or a habit changes.

const supported = Platform.OS === 'ios' || Platform.OS === 'android';
/** iOS keeps at most 64 pending notifications per app. */
const MAX_PENDING = 60;
const MAX_DAYS_AHEAD = 14;

if (supported) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Asks for permission if needed. Returns true when notifications are allowed. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (!supported) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

function parseTime(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

let queue: Promise<void> = Promise.resolve();

/** Rebuilds all reminders. Calls are queued so two syncs never interleave. */
export function syncReminders(
  habits: Habit[],
  doneToday: (habitId: string) => boolean,
  today: ISODate,
): Promise<void> {
  queue = queue.then(() => rebuild(habits, doneToday, today)).catch(() => {});
  return queue;
}

async function rebuild(
  habits: Habit[],
  doneToday: (habitId: string) => boolean,
  today: ISODate,
): Promise<void> {
  if (!supported) return;
  const withReminder = habits.filter((h) => h.reminder_time && !h.archived_at);
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (withReminder.length === 0) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const daysAhead = Math.max(1, Math.min(MAX_DAYS_AHEAD, Math.floor(MAX_PENDING / withReminder.length)));
  const now = Date.now();
  const jobs: Promise<string>[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const date = addDays(today, i);
    const [y, m, d] = date.split('-').map(Number);
    for (const habit of withReminder) {
      if (!isScheduled(habit.days, date)) continue;
      if (i === 0 && doneToday(habit.id)) continue;
      const { hour, minute } = parseTime(habit.reminder_time!);
      const when = new Date(y, m - 1, d, hour, minute);
      if (when.getTime() <= now) continue;
      if (jobs.length >= MAX_PENDING) break;
      jobs.push(
        Notifications.scheduleNotificationAsync({
          content: {
            title: t('reminderTitle', { emoji: habit.emoji, name: habit.name }),
            body: t('reminderBody'),
            data: { url: `/habit/${habit.id}` },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: when,
            channelId: 'reminders',
          },
        }),
      );
    }
  }
  await Promise.all(jobs);
}
