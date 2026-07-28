import { useMemo } from 'react'
import MonthBar from '../../components/MonthBar'
import EmptyState from '../../components/EmptyState'
import CategoryDot from '../../components/CategoryDot'
import { ChartIcon, ChevronRightIcon, PlusIcon } from '../../components/Icon'
import { UNCATEGORIZED_COLOR } from '../../lib/categories'
import { monthKey, monthLabel, shiftMonth } from '../../lib/dates'
import { formatUSD, formatUSDShort } from '../../lib/money'
import { describeSplit } from '../../lib/split'
import type {
  ExpenseCategory,
  Group,
  GroupMember,
} from '../../lib/database.types'
import { UNCATEGORIZED } from './types'
import type { ExpenseWithSplits } from './types'

const DONUT_RADIUS = 52
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS

type Slice = {
  id: string
  name: string
  color: string
  icon: string | null
  category: ExpenseCategory | null
  total: number
  previous: number
  count: number
}

type Props = {
  expenses: ExpenseWithSplits[]
  categories: ExpenseCategory[]
  group: Group
  members: GroupMember[]
  month: string
  setMonth: (month: string) => void
  months: string[]
  onEditCategory: (category: ExpenseCategory) => void
  onNewCategory: () => void
  onDrillDown: (categoryId: string) => void
}

export default function CategoriesTab({
  expenses,
  categories,
  group,
  members,
  month,
  setMonth,
  months,
  onEditCategory,
  onNewCategory,
  onDrillDown,
}: Props) {
  const previousKey = shiftMonth(month, -1)

  const { slices, total, count } = useMemo(() => {
    const sum = (key: string) => {
      const totals: Record<string, number> = {}
      const counts: Record<string, number> = {}
      for (const e of expenses) {
        if (monthKey(e.spent_at) !== key) continue
        const id = e.category_id ?? UNCATEGORIZED
        totals[id] = (totals[id] ?? 0) + Number(e.amount)
        counts[id] = (counts[id] ?? 0) + 1
      }
      return { totals, counts }
    }

    const current = sum(month)
    const previous = sum(previousKey)

    const rows: Slice[] = categories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      icon: c.icon,
      category: c,
      total: current.totals[c.id] ?? 0,
      previous: previous.totals[c.id] ?? 0,
      count: current.counts[c.id] ?? 0,
    }))

    if (current.totals[UNCATEGORIZED]) {
      rows.push({
        id: UNCATEGORIZED,
        name: 'Uncategorized',
        color: UNCATEGORIZED_COLOR,
        icon: null,
        category: null,
        total: current.totals[UNCATEGORIZED],
        previous: previous.totals[UNCATEGORIZED] ?? 0,
        count: current.counts[UNCATEGORIZED] ?? 0,
      })
    }

    const withSpend = rows
      .filter((r) => r.total > 0)
      .sort((a, b) => b.total - a.total)

    return {
      slices: withSpend,
      total: withSpend.reduce((s, r) => s + r.total, 0),
      count: withSpend.reduce((s, r) => s + r.count, 0),
    }
  }, [expenses, categories, month, previousKey])

  // Donut arcs, each offset to start where the previous one ended.
  const arcs = useMemo(() => {
    const out: { id: string; color: string; dash: string; offset: number }[] = []
    let consumed = 0
    for (const s of slices) {
      const fraction = total > 0 ? s.total / total : 0
      out.push({
        id: s.id,
        color: s.color,
        dash: `${fraction * DONUT_CIRCUMFERENCE} ${DONUT_CIRCUMFERENCE}`,
        offset: -consumed * DONUT_CIRCUMFERENCE,
      })
      consumed += fraction
    }
    return out
  }, [slices, total])

  return (
    <>
      <MonthBar month={month} setMonth={setMonth} months={months} />

      <div className="mt-3 flex items-center gap-4 bg-card border border-black/[.045] rounded-[18px] p-4">
        <div className="relative shrink-0 w-[132px] h-[132px]">
          <svg width="132" height="132" viewBox="0 0 132 132">
            <circle
              cx="66"
              cy="66"
              r={DONUT_RADIUS}
              fill="none"
              stroke="#EFEBE2"
              strokeWidth="17"
            />
            {arcs.map((arc) => (
              <circle
                key={arc.id}
                cx="66"
                cy="66"
                r={DONUT_RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth="17"
                strokeDasharray={arc.dash}
                strokeDashoffset={arc.offset}
                transform="rotate(-90 66 66)"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono tabular text-[22px] font-semibold tracking-tight text-ink">
              {formatUSDShort(total)}
            </span>
            <span className="text-[10px] text-muted">
              {count} expense{count === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <ul className="flex-1 min-w-0 flex flex-col gap-1.5">
          {slices.slice(0, 5).map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 shrink-0 rounded-full"
                style={{ background: s.color }}
              />
              <span className="flex-1 min-w-0 truncate text-gray-700">
                {s.name}
              </span>
              <span className="font-mono text-[11px] font-semibold text-muted">
                {total > 0 ? Math.round((s.total / total) * 100) : 0}%
              </span>
            </li>
          ))}
          {slices.length > 5 && (
            <li className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 shrink-0 rounded-full bg-[#C9C5BC]" />
              <span className="flex-1 min-w-0 truncate text-gray-700">
                Others
              </span>
              <span className="font-mono text-[11px] font-semibold text-muted">
                {Math.round(
                  (slices.slice(5).reduce((s, r) => s + r.total, 0) / total) *
                    100,
                )}
                %
              </span>
            </li>
          )}
          {slices.length === 0 && (
            <li className="text-xs text-muted">No spending yet</li>
          )}
        </ul>
      </div>

      <SectionHead label="Breakdown" trailing={monthLabel(month)} />
      {slices.length === 0 ? (
        <EmptyState
          icon={ChartIcon}
          title="No spending this month"
          body="Category totals will appear here."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {slices.map((s) => {
            const share = total > 0 ? (s.total / total) * 100 : 0
            const change =
              s.previous > 0 ? ((s.total - s.previous) / s.previous) * 100 : null
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onDrillDown(s.id === UNCATEGORIZED ? UNCATEGORIZED : s.id)}
                  className="w-full flex gap-3 px-3 py-3 bg-card border border-black/[.045] rounded-2xl text-left transition hover:border-black/[.13] focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <CategoryDot color={s.color} icon={s.icon} size={38} />
                  <span className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-[14.5px] font-semibold text-ink truncate">
                        {s.name}
                      </span>
                      <span className="font-mono tabular text-[13.5px] font-semibold text-ink">
                        {formatUSD(s.total)}
                      </span>
                    </span>
                    <span className="block h-[5px] rounded-full bg-black/[.055] overflow-hidden">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${share}%`, background: s.color }}
                      />
                    </span>
                    <span className="flex justify-between gap-2 text-[11px] text-muted">
                      <span className="truncate">
                        {s.count} expense{s.count === 1 ? '' : 's'}
                        {s.category
                          ? ` · ${describeSplit(s.category, group, members)}`
                          : ''}
                      </span>
                      {change !== null && (
                        <span
                          className={`shrink-0 font-semibold ${
                            change > 0 ? 'text-accent' : 'text-brand'
                          }`}
                        >
                          {change > 0 ? '+' : ''}
                          {change.toFixed(0)}%
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <SectionHead label="Manage categories" />
      <ul className="flex flex-col gap-2">
        {categories.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onEditCategory(c)}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-card border border-black/[.045] rounded-[14px] text-left text-muted transition hover:border-black/[.13] focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <CategoryDot color={c.color} icon={c.icon} size={34} />
              <span className="flex-1 min-w-0 flex flex-col">
                <span className="text-sm font-semibold text-ink truncate">
                  {c.name}
                </span>
                <span className="text-[11px] truncate">
                  {describeSplit(c, group, members)}
                </span>
              </span>
              <ChevronRightIcon size={17} />
            </button>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={onNewCategory}
        className="w-full mt-2.5 flex items-center justify-center gap-2 py-3 rounded-[15px] border-[1.4px] border-dashed border-black/[.16] text-[13.5px] font-semibold text-muted transition hover:border-brand hover:text-brand hover:bg-brand/[.04] min-h-[44px]"
      >
        <PlusIcon size={17} /> New category
      </button>
    </>
  )
}

function SectionHead({
  label,
  trailing,
}: {
  label: string
  trailing?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
      <span>{label}</span>
      {trailing && <span>{trailing}</span>}
    </div>
  )
}
