import { addDays, dateRange, isoWeekday, type ISODate } from './dates';

// Streak rules (the same as habit_current_streak() in supabase/schema.sql):
// walking back in time, a checked day adds 1, a scheduled day without a
// check-in ends the streak, unscheduled days are skipped. Today never breaks
// the streak because the day is not over yet.

export function isScheduled(days: number[], date: ISODate): boolean {
  return days.includes(isoWeekday(date));
}

function minDate(dates: Set<ISODate>): ISODate | null {
  let min: ISODate | null = null;
  for (const d of dates) if (min === null || d < min) min = d;
  return min;
}

export function currentStreak(dates: Set<ISODate>, days: number[], today: ISODate): number {
  const first = minDate(dates);
  if (first === null) return 0;
  let count = dates.has(today) ? 1 : 0;
  for (let d = addDays(today, -1); d >= first; d = addDays(d, -1)) {
    if (dates.has(d)) count++;
    else if (isScheduled(days, d)) break;
  }
  return count;
}

export function bestStreak(dates: Set<ISODate>, days: number[]): number {
  const sorted = [...dates].sort();
  if (sorted.length === 0) return 0;
  let best = 0;
  let run = 0;
  for (const d of dateRange(sorted[0], sorted[sorted.length - 1])) {
    if (dates.has(d)) {
      run++;
      best = Math.max(best, run);
    } else if (isScheduled(days, d)) {
      run = 0;
    }
  }
  return best;
}

/**
 * Share of scheduled days in [from, today] that were completed, 0…1.
 * Today only counts once it is done, so the rate never drops in the morning.
 */
export function completionRate(
  dates: Set<ISODate>,
  days: number[],
  from: ISODate,
  today: ISODate,
): number {
  let scheduled = 0;
  let done = 0;
  for (const d of dateRange(from, today)) {
    if (!isScheduled(days, d)) continue;
    if (d === today && !dates.has(d)) continue;
    scheduled++;
    if (dates.has(d)) done++;
  }
  return scheduled === 0 ? 0 : done / scheduled;
}

export const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 250, 300, 365, 500, 730, 1000];

export function isMilestone(streak: number): boolean {
  return MILESTONES.includes(streak);
}
