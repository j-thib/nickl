import { useMemo, useState } from 'react'
import MonthBar from '../../components/MonthBar'
import ExpenseRow from './ExpenseRow'
import { UNCATEGORIZED_COLOR, withAlpha } from '../../lib/categories'
import {
  dateInMonth,
  dayOfMonth,
  daysInMonth,
  firstWeekdayOfMonth,
  formatWeekday,
  monthAbbr,
  monthKey,
  monthLabel,
  shiftMonth,
} from '../../lib/dates'
import { formatUSD, formatUSDShort } from '../../lib/money'
import type { CategoryMap, ExpenseWithSplits } from './types'

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const TREND_MONTHS = 6

type Props = {
  expenses: ExpenseWithSplits[]
  categoryMap: CategoryMap
  nameById: Record<string, string>
  memberCount: number
  currentUserId: string | undefined
  month: string
  setMonth: (month: string) => void
  months: string[]
  onOpen: (expense: ExpenseWithSplits) => void
}

export default function CalendarTab({
  expenses,
  categoryMap,
  nameById,
  memberCount,
  currentUserId,
  month,
  setMonth,
  months,
  onOpen,
}: Props) {
  // Tracked with its month so switching months clears the selection without
  // an effect round-trip.
  const [selection, setSelection] = useState<{
    month: string
    day: number
  } | null>(null)
  const selectedDay = selection?.month === month ? selection.day : null
  const setSelectedDay = (day: number | null) =>
    setSelection(day === null ? null : { month, day })

  const totalsByMonth = useMemo(() => {
    const out: Record<string, number> = {}
    for (const e of expenses) {
      const key = monthKey(e.spent_at)
      out[key] = (out[key] ?? 0) + Number(e.amount)
    }
    return out
  }, [expenses])

  const inMonth = useMemo(
    () => expenses.filter((e) => monthKey(e.spent_at) === month),
    [expenses, month],
  )

  const byDay = useMemo(() => {
    const out: Record<number, ExpenseWithSplits[]> = {}
    for (const e of inMonth) {
      const day = dayOfMonth(e.spent_at)
      ;(out[day] ??= []).push(e)
    }
    return out
  }, [inMonth])

  const total = totalsByMonth[month] ?? 0
  const previousKey = shiftMonth(month, -1)
  const previousTotal = totalsByMonth[previousKey] ?? 0
  const delta =
    previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null

  const dayTotals = Object.fromEntries(
    Object.entries(byDay).map(([day, items]) => [
      day,
      items.reduce((s, e) => s + Number(e.amount), 0),
    ]),
  ) as Record<number, number>
  const heaviestDay = Math.max(1, ...Object.values(dayTotals))

  const leading = firstWeekdayOfMonth(month)
  const dayCount = daysInMonth(month)
  const cells: (number | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: dayCount }, (_, i) => i + 1),
  ]

  const trend = useMemo(() => {
    const keys: string[] = []
    let cursor = month
    for (let i = 0; i < TREND_MONTHS; i++) {
      keys.unshift(cursor)
      cursor = shiftMonth(cursor, -1)
    }
    return keys.map((key) => ({ key, total: totalsByMonth[key] ?? 0 }))
  }, [month, totalsByMonth])
  const trendMax = Math.max(1, ...trend.map((t) => t.total))

  const selectedItems = selectedDay ? (byDay[selectedDay] ?? []) : []

  return (
    <>
      <MonthBar month={month} setMonth={setMonth} months={months} />

      <div className="flex flex-col items-center pt-3 pb-4">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {monthLabel(month)}
        </span>
        <span className="font-mono tabular text-[34px] font-semibold leading-tight tracking-tight text-ink">
          {formatUSD(total)}
        </span>
        {delta !== null && (
          <span
            className={`text-[11.5px] font-semibold ${
              delta > 0 ? 'text-accent' : 'text-brand'
            }`}
          >
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}% vs{' '}
            {monthAbbr(previousKey)}
          </span>
        )}
      </div>

      <div className="bg-card border border-black/[.045] rounded-[18px] px-3 pt-3.5 pb-3">
        <div className="grid grid-cols-7 gap-1 mb-1.5">
          {DOW.map((d, i) => (
            <span
              key={i}
              className="text-center text-[10px] font-semibold text-muted"
            >
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (day === null) return <span key={`pad-${i}`} className="aspect-square" />

            const items = byDay[day] ?? []
            const sum = dayTotals[day] ?? 0
            const active = selectedDay === day
            const heaviest = items.length
              ? items.reduce((a, b) => (Number(b.amount) > Number(a.amount) ? b : a))
              : null
            const tint = heaviest?.category_id
              ? (categoryMap[heaviest.category_id]?.color ?? UNCATEGORIZED_COLOR)
              : UNCATEGORIZED_COLOR
            // Square-root so a single huge outlier doesn't flatten the rest.
            const intensity = sum > 0 ? 0.12 + 0.55 * Math.sqrt(sum / heaviestDay) : 0

            return (
              <button
                key={day}
                type="button"
                disabled={sum === 0}
                onClick={() => setSelectedDay(active ? null : day)}
                aria-pressed={active}
                aria-label={`${monthAbbr(month)} ${day}${
                  sum > 0 ? `, ${formatUSD(sum)}` : ', no expenses'
                }`}
                style={
                  sum > 0 && !active ? { background: withAlpha(tint, intensity) } : undefined
                }
                className={`aspect-square min-w-0 rounded-[10px] border border-transparent flex flex-col items-center justify-center gap-px text-xs transition ${
                  active
                    ? 'bg-ink text-card'
                    : sum > 0
                      ? 'text-ink font-semibold hover:border-black/[.18]'
                      : 'text-muted'
                }`}
              >
                <span className="leading-none">{day}</span>
                {sum > 0 && (
                  <span className="font-mono text-[8px] font-semibold leading-none opacity-75">
                    {formatUSDShort(sum)}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {selectedDay ? (
        <section className="mt-5">
          <div className="flex items-baseline justify-between gap-3 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span>
              {formatWeekday(dateInMonth(month, selectedDay))},{' '}
              {monthAbbr(month)} {selectedDay}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDay(null)}
              className="text-[11.5px] font-semibold text-brand hover:text-brand-dark normal-case tracking-normal"
            >
              Clear
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {selectedItems.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                categories={categoryMap}
                nameById={nameById}
                memberCount={memberCount}
                onOpen={e.created_by === currentUserId ? onOpen : undefined}
              />
            ))}
          </ul>
        </section>
      ) : (
        <section className="mt-5">
          <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
            Last {TREND_MONTHS} months
          </div>
          <div className="flex items-end gap-1.5 bg-card border border-black/[.045] rounded-[18px] px-3 py-3.5">
            {trend.map((t) => {
              const active = t.key === month
              const selectable = months.includes(t.key)
              return (
                <button
                  key={t.key}
                  type="button"
                  disabled={!selectable}
                  onClick={() => setMonth(t.key)}
                  className="flex-1 flex flex-col items-center gap-1.5 disabled:opacity-45"
                >
                  <span
                    className={`font-mono text-[9px] font-semibold ${
                      active ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    {t.total > 0 ? formatUSDShort(t.total) : '—'}
                  </span>
                  <span className="w-full h-[74px] rounded-md bg-black/[.045] flex items-end overflow-hidden">
                    <span
                      className={`w-full rounded-md transition-all ${
                        active ? 'bg-brand' : 'bg-brand/35'
                      }`}
                      style={{ height: `${(t.total / trendMax) * 100}%` }}
                    />
                  </span>
                  <span
                    className={`text-[10px] ${
                      active ? 'text-ink font-semibold' : 'text-muted'
                    }`}
                  >
                    {monthAbbr(t.key)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}
