import CategoryDot from '../../components/CategoryDot'
import { formatUSD } from '../../lib/money'
import type { ExpenseSplit } from '../../lib/database.types'
import type { CategoryMap, ExpenseWithSplits } from './types'

type Props = {
  expense: ExpenseWithSplits
  categories: CategoryMap
  /** Secondary line; defaults to "<category> · <payer> paid". */
  subtitle?: string
  nameById: Record<string, string>
  /** Group size. Drives the "who's included" line; omit to hide it. */
  memberCount?: number
  onOpen?: (expense: ExpenseWithSplits) => void
}

/** One expense in a list: category tile, description + meta, amount. */
export default function ExpenseRow({
  expense,
  categories,
  subtitle,
  nameById,
  memberCount,
  onOpen,
}: Props) {
  const category = expense.category_id
    ? categories[expense.category_id]
    : undefined
  const payer = nameById[expense.paid_by] ?? 'Unknown'
  const sub = subtitle ?? `${category?.name ?? 'Uncategorized'} · ${payer} paid`
  const included = participantLabel(expense.splits, nameById, memberCount)

  const body = (
    <>
      <CategoryDot color={category?.color} icon={category?.icon} size={38} />
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold text-ink truncate">
          {expense.description}
        </span>
        <span className="text-[11.5px] text-muted truncate">{sub}</span>
        {included && (
          <span className="text-[11px] text-muted/85 truncate">{included}</span>
        )}
      </span>
      <span className="shrink-0 font-mono tabular text-sm font-semibold text-ink">
        {formatUSD(Number(expense.amount))}
      </span>
    </>
  )

  const base =
    'w-full flex items-center gap-3 px-3 py-2.5 bg-card border border-black/[.045] rounded-2xl text-left'

  if (!onOpen) {
    return <li className={base}>{body}</li>
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(expense)}
        className={`${base} transition hover:border-black/[.13] focus:outline-none focus:ring-2 focus:ring-brand`}
      >
        {body}
      </button>
    </li>
  )
}

/**
 * Who the expense was split between. Hidden in groups of two or fewer, where
 * there's nothing to disambiguate, and when the whole group is included the
 * names are collapsed into "everyone".
 */
function participantLabel(
  splits: ExpenseSplit[],
  nameById: Record<string, string>,
  memberCount: number | undefined,
): string | null {
  if (!memberCount || memberCount <= 2) return null
  const ids = splits.map((s) => s.user_id)
  if (ids.length === 0) return null
  if (ids.length >= memberCount) return 'Split with everyone'

  // Keep the group's own member order so the same people read the same way
  // from one row to the next.
  const order = Object.keys(nameById)
  const names = [...ids]
    .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    .map((id) => nameById[id] ?? 'Unknown')

  return names.length === 1
    ? `${names[0]} only`
    : `Split with ${names.join(', ')}`
}
