/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { addDays } from '../dates';
import { computeRecap } from '../recap';
import type { Habit } from '../types';

// 2026-09-21 is a Monday
const MON = '2026-09-21';

function habit(id: string, days: number[], created = '2026-01-01T09:00:00'): Habit {
  return {
    id,
    user_id: 'me',
    name: id,
    emoji: '✅',
    color: '#34C759',
    days,
    visibility: 'friends',
    reminder_time: null,
    sort_order: 0,
    archived_at: null,
    created_at: created,
  };
}

test('finished week: rate, perfect days and bonus check-ins', () => {
  const daily = habit('daily', [1, 2, 3, 4, 5, 6, 7]);
  const gym = habit('gym', [1, 3, 5]);
  const index = new Map([
    // daily: missed Thursday
    ['daily', new Set([0, 1, 2, 4, 5, 6].map((i) => addDays(MON, i)))],
    // gym: Mon, Wed, Fri + a bonus Sunday
    ['gym', new Set([0, 2, 4, 6].map((i) => addDays(MON, i)))],
  ]);
  const recap = computeRecap([daily, gym], index, MON, addDays(MON, 10));
  assert.equal(recap.planned, 7 + 3);
  assert.equal(recap.done, 6 + 3);
  assert.equal(recap.checkins, 6 + 4);
  // every day except Thursday had all planned habits done
  assert.equal(recap.perfectDays, 6);
  assert.deepEqual(recap.habits[0].days, ['done', 'done', 'done', 'missed', 'done', 'done', 'done']);
  assert.deepEqual(recap.habits[1].days, ['done', 'off', 'done', 'off', 'done', 'off', 'done']);
});

test('current week: today counts only once done, future days are open', () => {
  const daily = habit('daily', [1, 2, 3, 4, 5, 6, 7]);
  const wednesday = addDays(MON, 2);
  const index = new Map([['daily', new Set([MON, addDays(MON, 1)])]]);
  const recap = computeRecap([daily], index, MON, wednesday);
  assert.equal(recap.planned, 2);
  assert.equal(recap.rate, 1);
  assert.deepEqual(recap.habits[0].days, ['done', 'done', 'off', 'future', 'future', 'future', 'future']);
});

test('habits created mid-week are not counted before they existed', () => {
  const late = habit('late', [1, 2, 3, 4, 5, 6, 7], '2026-09-24T10:00:00');
  const index = new Map([['late', new Set([addDays(MON, 3), addDays(MON, 4)])]]);
  const recap = computeRecap([late], index, MON, addDays(MON, 6));
  assert.equal(recap.planned, 3); // Thu, Fri, Sat (Sunday is today and not done)
  assert.equal(recap.done, 2);
});

test('today is a perfect day only when everything planned is done', () => {
  const a = habit('a', [1, 2, 3, 4, 5, 6, 7]);
  const b = habit('b', [1, 2, 3, 4, 5, 6, 7]);
  const index = new Map([
    ['a', new Set([MON])],
    ['b', new Set<string>()],
  ]);
  const recap = computeRecap([a, b], index, MON, MON);
  assert.equal(recap.rate, 1); // b is still open today
  assert.equal(recap.perfectDays, 0);
});
