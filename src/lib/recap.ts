import { addDays, dateRange, toISODate, type ISODate } from './dates';
import { currentStreak, isScheduled } from './streaks';
import type { Habit } from './types';

export type DayState = 'done' | 'missed' | 'off' | 'future';

export type RecapHabit = {
  habit: Habit;
  done: number;
  planned: number;
  days: DayState[];
};

export type Recap = {
  from: ISODate;
  to: ISODate;
  /** planned habit-days so far (today counts once it is done) */
  planned: number;
  /** planned habit-days that were done */
  done: number;
  /** done / planned, 0…1 */
  rate: number;
  /** all check-ins of the week, including bonus days */
  checkins: number;
  /** days on which every planned habit was done */
  perfectDays: number;
  bestStreak: number;
  habits: RecapHabit[];
};

/** Summary of the week that starts on `weekStart` (a Monday). */
export function computeRecap(
  habits: Habit[],
  index: Map<string, Set<ISODate>>,
  weekStart: ISODate,
  today: ISODate,
): Recap {
  const weekEnd = addDays(weekStart, 6);
  const days = dateRange(weekStart, weekEnd);
  const lastDay = today < weekEnd ? today : weekEnd;
  let planned = 0;
  let done = 0;
  let checkins = 0;
  let bestStreak = 0;
  const perDay = new Map<ISODate, { planned: number; done: number }>();

  const rows: RecapHabit[] = habits.map((habit) => {
    const dates = index.get(habit.id) ?? new Set<ISODate>();
    const created = toISODate(new Date(habit.created_at));
    let habitPlanned = 0;
    let habitDone = 0;
    const states = days.map((date): DayState => {
      const isDone = dates.has(date);
      if (isDone) checkins++;
      if (date > today) return 'future';
      const scheduled = isScheduled(habit.days, date) && date >= created;
      if (scheduled) {
        // a perfect day needs everything planned, today included
        const day = perDay.get(date) ?? { planned: 0, done: 0 };
        day.planned++;
        if (isDone) day.done++;
        perDay.set(date, day);
      }
      // the rate counts today only once it is done: the day is not over yet
      if (scheduled && (date < today || isDone)) {
        habitPlanned++;
        if (isDone) habitDone++;
      }
      if (isDone) return 'done';
      return scheduled && date < today ? 'missed' : 'off';
    });
    planned += habitPlanned;
    done += habitDone;
    if (weekStart <= today) bestStreak = Math.max(bestStreak, currentStreak(dates, habit.days, lastDay));
    return { habit, done: habitDone, planned: habitPlanned, days: states };
  });

  let perfectDays = 0;
  for (const day of perDay.values()) if (day.planned > 0 && day.done === day.planned) perfectDays++;

  return {
    from: weekStart,
    to: weekEnd,
    planned,
    done,
    rate: planned ? done / planned : 0,
    checkins,
    perfectDays,
    bestStreak,
    // habits that existed during the week
    habits: rows.filter((r) => toISODate(new Date(r.habit.created_at)) <= weekEnd),
  };
}
