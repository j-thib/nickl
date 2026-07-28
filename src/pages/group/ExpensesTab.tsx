import { useMemo } from 'react'
import MonthBar from '../../components/MonthBar'
import EmptyState from '../../components/EmptyState'
import { ReceiptIcon } from '../../components/Icon'
import ExpenseRow from './ExpenseRow'
import { withAlpha } from '../../lib/categories'
import { formatDayShort, formatWeekday, monthKey, monthLabel } from '../../lib/dates'
import { formatUSD } from '../../lib/money'
import type { ExpenseCategory } from '../../lib/database.types'
import { UNCATEGORIZED } from './types'
import type { CategoryMap, ExpenseWithSplits } from './types'

type Props = {
  expenses: ExpenseWithSplits[]
  categories: ExpenseCategory[]
  categoryMap: CategoryMap
  nameById: Record<string, string>
  currentUserId: string | undefined
  month: string
  setMonth: (month: string) => void
  months: string[]
  filterCategoryId: string | null
  setFilterCategoryId: (id: string | null) => void
  onOpen: (expense: ExpenseWithSplits) => void
}

export default function ExpensesTab({
  expenses,
  categories,
  categoryMap,
  nameById,
  currentUserId,
  month,
  setMonth,
  months,
  filterCategoryId,
  setFilterCategoryId,
  onOpen,
}: Props) {
  const inMonth = useMemo(
    () =>
      expenses
        .filter((e) => monthKey(e.spent_at) === month)
        .sort(
          (a, b) =>
            b.spent_at.localeCompare(a.spent_at) ||
            b.created_at.localeCompare(a.created_at),
        ),
    [expenses, month],
  )

  const rows = useMemo(() => {
    if (!filterCategoryId) return inMonth
    if (filterCategoryId === UNCATEGORIZED)
      return inMonth.filter((e) => e.category_id === null)
    return inMonth.filter((e) => e.category_id === filterCategoryId)
  }, [inMonth, filterCategoryId])

  // Consecutive same-day expenses share a header.
  const days = useMemo(() => {
    const out: { date: string; items: ExpenseWithSplits[] }[] = []
    for (const e of rows) {
      const last = out[out.length - 1]
      if (last && last.date === e.spent_at) last.items.push(e)
      else out.push({ date: e.spent_at, items: [e] })
    }
    return out
  }, [rows])

  const total = rows.reduce((s, e) => s + Number(e.amount), 0)
  const usedCategoryIds = new Set(inMonth.map((e) => e.category_id))
  const filterName =
    filterCategoryId === UNCATEGORIZED
      ? 'Uncategorized'
      : filterCategoryId
        ? (categoryMap[filterCategoryId]?.name ?? 'Category')
        : 'Total'

  return (
    <>
      <MonthBar month={month} setMonth={setMonth} months={months} />

      <div className="flex items-baseline justify-between px-1 pt-3 pb-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted truncate">
          {filterName} · {monthLabel(month)}
        </span>
        <span className="font-mono tabular text-[19px] font-semibold text-ink">
          {formatUSD(total)}
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip
          label="All"
          active={!filterCategoryId}
          onClick={() => setFilterCategoryId(null)}
        />
        {categories
          .filter((c) => usedCategoryIds.has(c.id))
          .map((c) => (
            <FilterChip
              key={c.id}
              label={c.name}
              color={c.color}
              active={filterCategoryId === c.id}
              onClick={() =>
                setFilterCategoryId(filterCategoryId === c.id ? null : c.id)
              }
            />
          ))}
        {usedCategoryIds.has(null) && (
          <FilterChip
            label="Uncategorized"
            active={filterCategoryId === UNCATEGORIZED}
            onClick={() =>
              setFilterCategoryId(
                filterCategoryId === UNCATEGORIZED ? null : UNCATEGORIZED,
              )
            }
          />
        )}
      </div>

      {days.length === 0 ? (
        <EmptyState
          icon={ReceiptIcon}
          title="Nothing logged this month"
          body="Tap + to add the first expense."
        />
      ) : (
        days.map((day) => (
          <section key={day.date} className="mb-4">
            <div className="flex items-baseline justify-between gap-3 px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <span className="truncate">
                {formatWeekday(day.date)}, {formatDayShort(day.date)}
              </span>
              <span className="shrink-0">
                {formatUSD(day.items.reduce((s, e) => s + Number(e.amount), 0))}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {day.items.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  categories={categoryMap}
                  nameById={nameById}
                  onOpen={e.created_by === currentUserId ? onOpen : undefined}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  )
}

function FilterChip({
  label,
  color,
  active,
  onClick,
}: {
  label: string
  color?: string
  active: boolean
  onClick: () => void
}) {
  const style = color
    ? active
      ? { background: color, borderColor: color, color: '#FAFAF8' }
      : { borderColor: withAlpha(color, 0.35), color }
    : undefined

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={`shrink-0 px-3.5 py-1.5 rounded-full border text-xs font-semibold whitespace-nowrap transition ${
        active && !color
          ? 'bg-ink border-ink text-card'
          : 'bg-card border-line text-muted hover:text-ink'
      }`}
    >
      {label}
    </button>
  )
}
