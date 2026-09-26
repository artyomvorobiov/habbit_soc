// Calendar dates are handled as 'YYYY-MM-DD' strings in the user's local time
// zone. Arithmetic is done in UTC so daylight-saving changes never shift a day.

export type ISODate = string;

const DAY_MS = 24 * 60 * 60 * 1000;

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

/** Local calendar date of a Date object. */
export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function today(): ISODate {
  return toISODate(new Date());
}

function toUTC(date: ISODate): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): ISODate {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * DAY_MS);
}

/** Number of days from `a` to `b` (positive when b is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export function isoWeekday(date: ISODate): number {
  const day = new Date(toUTC(date)).getUTCDay();
  return day === 0 ? 7 : day;
}

export function startOfWeek(date: ISODate): ISODate {
  return addDays(date, 1 - isoWeekday(date));
}

export function startOfMonth(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(date: ISODate, months: number): ISODate {
  const [y, m] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}-01`;
}

export function daysInMonth(date: ISODate): number {
  return diffDays(startOfMonth(date), addMonths(date, 1));
}

/** Inclusive list of dates from `from` to `to`. */
export function dateRange(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function dayOfMonth(date: ISODate): number {
  return Number(date.slice(8, 10));
}

export function monthIndex(date: ISODate): number {
  return Number(date.slice(5, 7)) - 1;
}

export function year(date: ISODate): number {
  return Number(date.slice(0, 4));
}
