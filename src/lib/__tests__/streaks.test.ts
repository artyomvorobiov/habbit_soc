/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays, addMonths, dateRange, daysInMonth, diffDays, isoWeekday, startOfWeek } from '../dates';
import { bestStreak, completionRate, currentStreak } from '../streaks';

const DAILY = [1, 2, 3, 4, 5, 6, 7];
const MWF = [1, 3, 5];
// 2026-09-21 is a Monday
const MON = '2026-09-21';

const set = (...dates: string[]) => new Set(dates);
const back = (from: string, n: number) => dateRange(addDays(from, -n + 1), from);

test('date helpers', () => {
  assert.equal(isoWeekday(MON), 1);
  assert.equal(isoWeekday('2026-09-27'), 7);
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(diffDays('2026-03-28', '2026-03-30'), 2); // across a DST change in Europe
  assert.equal(startOfWeek('2026-09-27'), MON);
  assert.equal(addMonths('2026-12-15', 1), '2027-01-01');
  assert.equal(addMonths('2026-01-15', -1), '2025-12-01');
  assert.equal(daysInMonth('2028-02-10'), 29);
});

test('current streak: today does not break it', () => {
  const today = '2026-09-26';
  assert.equal(currentStreak(set(...back('2026-09-25', 4)), DAILY, today), 4);
  assert.equal(currentStreak(set(...back(today, 5)), DAILY, today), 5);
  assert.equal(currentStreak(set(...back('2026-09-24', 4)), DAILY, today), 0);
  assert.equal(currentStreak(set(today), DAILY, today), 1);
  assert.equal(currentStreak(set(), DAILY, today), 0);
});

test('current streak skips unscheduled days and counts bonus days', () => {
  // Mon/Wed/Fri done in the last week, today is next Monday (not yet done)
  const done = set('2026-09-14', '2026-09-16', '2026-09-18');
  assert.equal(currentStreak(done, MWF, MON), 3);
  // an extra Sunday check-in adds to the streak
  assert.equal(currentStreak(set(...done, '2026-09-20'), MWF, MON), 4);
  // missing Friday breaks it
  assert.equal(currentStreak(set('2026-09-14', '2026-09-16'), MWF, MON), 0);
});

test('best streak', () => {
  const dates = set(...back('2026-09-10', 6), ...back('2026-09-20', 3));
  assert.equal(bestStreak(dates, DAILY), 6);
  assert.equal(bestStreak(set(), DAILY), 0);
  assert.equal(bestStreak(set('2026-09-14', '2026-09-16', '2026-09-18', '2026-09-21'), MWF), 4);
});

test('completion rate ignores unfinished today', () => {
  const today = '2026-09-26';
  const from = addDays(today, -9);
  assert.equal(completionRate(set(...back('2026-09-25', 5)), DAILY, from, today), 5 / 9);
  assert.equal(completionRate(set(...back(today, 10)), DAILY, from, today), 1);
  assert.equal(completionRate(set(), MWF, today, today), 0);
});
