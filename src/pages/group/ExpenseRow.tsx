import CategoryDot from '../../components/CategoryDot'
import { formatUSD } from '../../lib/money'
import type { CategoryMap, ExpenseWithSplits } from './types'

type Props = {
  expense: ExpenseWithSplits
  categories: CategoryMap
  /** Secondary line; defaults to "<category> · <payer> paid". */
  subtitle?: string
  nameById: Record<string, string>
  onOpen?: (expense: ExpenseWithSplits) => void
}

/** One expense in a list: category tile, description + meta, amount. */
export default function ExpenseRow({
  expense,
  categories,
  subtitle,
  nameById,
  onOpen,
}: Props) {
  const category = expense.category_id
    ? categories[expense.category_id]
    : undefined
  const payer = nameById[expense.paid_by] ?? 'Unknown'
  const sub = subtitle ?? `${category?.name ?? 'Uncategorized'} · ${payer} paid`

  const body = (
    <>
      <CategoryDot color={category?.color} icon={category?.icon} size={38} />
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="text-[14.5px] font-semibold text-ink truncate">
          {expense.description}
        </span>
        <span className="text-[11.5px] text-muted truncate">{sub}</span>
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
