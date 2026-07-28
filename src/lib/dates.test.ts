import { describe, expect, it } from 'vitest'
import {
  dateInMonth,
  dayOfMonth,
  daysInMonth,
  firstWeekdayOfMonth,
  formatDayShort,
  formatWeekday,
  monthAbbr,
  monthKey,
  monthLabel,
  monthLabelShort,
  monthRange,
  shiftMonth,
} from './dates'

describe('month keys', () => {
  it('slices a date down to its month', () => {
    expect(monthKey('2026-07-14')).toBe('2026-07')
    expect(dayOfMonth('2026-07-04')).toBe(4)
  })

  it('shifts across year boundaries in both directions', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-07', -18)).toBe('2025-01')
    expect(shiftMonth('2026-07', 0)).toBe('2026-07')
  })

  it('labels months', () => {
    expect(monthLabel('2026-07')).toBe('July 2026')
    expect(monthLabelShort('2026-07')).toBe('Jul ’26')
    expect(monthAbbr('2026-02')).toBe('Feb')
  })
})

describe('calendar grid', () => {
  it('counts days, including leap Februaries', () => {
    expect(daysInMonth('2026-07')).toBe(31)
    expect(daysInMonth('2026-02')).toBe(28)
    expect(daysInMonth('2028-02')).toBe(29)
  })

  it('finds the weekday the month starts on', () => {
    // 2026-07-01 is a Wednesday.
    expect(firstWeekdayOfMonth('2026-07')).toBe(3)
  })

  it('builds a date inside a month', () => {
    expect(dateInMonth('2026-07', 4)).toBe('2026-07-04')
  })

  it('formats days without drifting across timezones', () => {
    expect(formatDayShort('2026-07-01')).toBe('Jul 1')
    expect(formatWeekday('2026-07-01')).toBe('Wed')
  })
})

describe('monthRange', () => {
  it('runs from the earliest date through today with no gaps', () => {
    expect(monthRange(['2026-05-27', '2026-07-01'], '2026-07-27')).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
    ])
  })

  it('returns just the current month when there is nothing logged', () => {
    expect(monthRange([], '2026-07-27')).toEqual(['2026-07'])
  })

  it('ignores future-dated expenses beyond the current month', () => {
    expect(monthRange(['2026-09-01'], '2026-07-27')).toEqual(['2026-07'])
  })
})
