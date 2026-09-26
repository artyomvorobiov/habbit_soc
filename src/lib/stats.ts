import { addDays, toISODate, type ISODate } from './dates';
import { completionRate, currentStreak, isScheduled } from './streaks';
import type { Habit } from './types';

export type Stats = {
  bestCurrentStreak: number;
  totalCheckins: number;
  /** 0…1, share of scheduled days done during the last 30 days */
  successRate: number;
  /** 0…1 for the activity grid, null when nothing was scheduled */
  activity: (date: ISODate) => number | null;
};

/** The day a habit starts counting for statistics. */
function habitStart(habit: Habit, dates: Set<ISODate> | undefined): ISODate {
  let start = toISODate(new Date(habit.created_at));
  for (const d of dates ?? []) if (d < start) start = d;
  return start;
}

export function computeStats(
  habits: Habit[],
  index: Map<string, Set<ISODate>>,
  today: ISODate,
): Stats {
  let bestCurrentStreak = 0;
  let totalCheckins = 0;
  let rateSum = 0;
  let rateCount = 0;
  const starts = new Map<string, ISODate>();

  for (const h of habits) {
    const dates = index.get(h.id) ?? new Set<ISODate>();
    const start = habitStart(h, dates);
    starts.set(h.id, start);
    bestCurrentStreak = Math.max(bestCurrentStreak, currentStreak(dates, h.days, today));
    totalCheckins += dates.size;
    const from = start > addDays(today, -29) ? start : addDays(today, -29);
    if (from <= today) {
      rateSum += completionRate(dates, h.days, from, today);
      rateCount++;
    }
  }

  const activity = (date: ISODate) => {
    let scheduled = 0;
    let done = 0;
    for (const h of habits) {
      const dates = index.get(h.id);
      if (dates?.has(date)) done++;
      if (isScheduled(h.days, date) && date >= (starts.get(h.id) ?? date)) scheduled++;
    }
    if (scheduled === 0) return done > 0 ? 1 : null;
    return Math.min(1, done / scheduled);
  };

  return {
    bestCurrentStreak,
    totalCheckins,
    successRate: rateCount ? rateSum / rateCount : 0,
    activity,
  };
}
