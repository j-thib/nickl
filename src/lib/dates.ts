// Calendar helpers.
//
// Dates flow through the app as plain `YYYY-MM-DD` strings (Postgres `date`),
// never as Date objects, so nothing shifts across a timezone boundary. The one
// place a Date is constructed is `toLocalDate`, which builds it from parts in
// local time specifically to ask the platform for weekday / month-length.

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export const WEEKDAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** `YYYY-MM-DD` for today, in the viewer's own timezone. */
export function todayISO(): string {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
}

/** `2026-07-14` -> `2026-07` */
export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

/** `2026-07-14` -> 14 */
export function dayOfMonth(iso: string): number {
  return parseInt(iso.slice(8, 10), 10)
}

function toLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** `2026-07-14` -> `Jul 14` */
export function formatDayShort(iso: string): string {
  const d = toLocalDate(iso)
  return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`
}

/** `2026-07-14` -> `Tue` */
export function formatWeekday(iso: string): string {
  return WEEKDAY_ABBR[toLocalDate(iso).getDay()]
}

/** `2026-07` -> `July 2026` */
export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

/** `2026-07` -> `Jul ’26` */
export function monthLabelShort(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return `${MONTH_ABBR[m - 1]} ’${String(y).slice(2)}`
}

/** `2026-07` -> `Jul` */
export function monthAbbr(key: string): string {
  return MONTH_ABBR[Number(key.slice(5, 7)) - 1]
}

/** Move a `YYYY-MM` key by `delta` months, wrapping the year. */
export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number)
  const zeroBased = (y * 12 + (m - 1)) + delta
  const year = Math.floor(zeroBased / 12)
  const month = zeroBased - year * 12 + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

/** Number of days in the month a `YYYY-MM` key names. */
export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Weekday (0 = Sunday) the 1st of a `YYYY-MM` falls on. */
export function firstWeekdayOfMonth(key: string): number {
  const [y, m] = key.split('-').map(Number)
  return new Date(y, m - 1, 1).getDay()
}

/** `('2026-07', 4)` -> `2026-07-04` */
export function dateInMonth(key: string, day: number): string {
  return `${key}-${String(day).padStart(2, '0')}`
}

/**
 * Every month from the earliest date given through the current month, with no
 * gaps — so scrubbing back through a quiet month still works. Falls back to
 * the current month alone when there are no dates.
 */
export function monthRange(dates: string[], today = todayISO()): string[] {
  const current = monthKey(today)
  let earliest = current
  for (const d of dates) {
    const key = monthKey(d)
    if (key < earliest) earliest = key
  }
  const out: string[] = []
  let cursor = earliest
  // Guard against a pathological (corrupt) date pushing this into a long loop.
  while (cursor <= current && out.length < 600) {
    out.push(cursor)
    cursor = shiftMonth(cursor, 1)
  }
  return out
}
