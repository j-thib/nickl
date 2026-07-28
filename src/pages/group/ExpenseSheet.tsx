import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import Sheet from '../../components/Sheet'
import SplitSlider from '../../components/SplitSlider'
import CategoryDot from '../../components/CategoryDot'
import { TrashIcon } from '../../components/Icon'
import { supabase } from '../../lib/supabase'
import { todayISO } from '../../lib/dates'
import { formatPercent, formatUSD } from '../../lib/money'
import {
  distributeCents,
  evenWeight,
  resolveDefaultWeights,
  describeSplit,
} from '../../lib/split'
import { withAlpha } from '../../lib/categories'
import type {
  ExpenseCategory,
  Group,
  GroupMember,
} from '../../lib/database.types'
import type { ExpenseWithSplits } from './types'

type Props = {
  group: Group
  members: GroupMember[]
  categories: ExpenseCategory[]
  currentUserId: string
  existing: ExpenseWithSplits | null
  /** Pre-selected category for a brand-new expense. */
  defaultCategoryId?: string | null
  /** Pre-filled date (`YYYY-MM-DD`) for a brand-new expense. */
  defaultDate?: string
  onClose: () => void
  onSaved: (expense: ExpenseWithSplits) => void
  onDeleted: (id: string) => void
}

export default function ExpenseSheet({
  group,
  members,
  categories,
  currentUserId,
  existing,
  defaultCategoryId,
  defaultDate,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const isEdit = existing !== null

  const [description, setDescription] = useState(existing?.description ?? '')
  const [amount, setAmount] = useState(
    existing ? String(Number(existing.amount)) : '',
  )
  const [paidBy, setPaidBy] = useState(
    existing?.paid_by ??
      members.find((m) => m.user_id === currentUserId)?.user_id ??
      members[0]?.user_id ??
      '',
  )
  const [spentAt, setSpentAt] = useState(
    existing?.spent_at ?? defaultDate ?? todayISO(),
  )
  const [categoryId, setCategoryId] = useState<string | null>(
    existing ? existing.category_id : (defaultCategoryId ?? categories[0]?.id ?? null),
  )
  const [splitBetween, setSplitBetween] = useState<Set<string>>(
    () =>
      new Set(
        existing
          ? existing.splits.map((s) => s.user_id)
          : members.map((m) => m.user_id),
      ),
  )
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const category = categoryId
    ? (categories.find((c) => c.id === categoryId) ?? null)
    : null

  const selectedIds = useMemo(
    () => members.filter((m) => splitBetween.has(m.user_id)).map((m) => m.user_id),
    [members, splitBetween],
  )

  const defaultWeights = useMemo(
    () =>
      resolveDefaultWeights({
        category,
        group,
        members,
        userIds: selectedIds,
      }),
    [category, group, members, selectedIds],
  )

  // Per-expense override of the category/group default, as raw input strings.
  // Null means "follow the default".
  const [override, setOverride] = useState<Record<string, string> | null>(() =>
    existing ? deriveOverride(existing, group, members, categories) : null,
  )

  const overrideWeights = useMemo(() => {
    if (!override) return undefined
    const out: Record<string, number> = {}
    for (const uid of selectedIds) {
      const parsed = parseFloat(override[uid] ?? '')
      out[uid] = Number.isFinite(parsed) ? parsed : 0
    }
    return out
  }, [override, selectedIds])

  const effectiveWeights = overrideWeights ?? defaultWeights
  const weightSum = overrideWeights
    ? selectedIds.reduce((s, uid) => s + (overrideWeights[uid] ?? 0), 0)
    : 100

  const amountNumber = parseFloat(amount)
  const validAmount = Number.isFinite(amountNumber) && amountNumber > 0
  const shares = distributeCents(
    validAmount ? Math.round(amountNumber * 100) : 0,
    selectedIds,
    effectiveWeights,
  )

  function toggleSplit(userId: string) {
    setSplitBetween((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
    // Who's involved changed, so any hand-tuned percentages no longer apply.
    setOverride(null)
  }

  function pickCategory(id: string) {
    setCategoryId(id)
    setOverride(null)
  }

  function startOverride() {
    const seed: Record<string, string> = {}
    for (const uid of selectedIds) {
      const w = effectiveWeights?.[uid] ?? evenWeight(selectedIds.length)
      seed[uid] = formatPercent(w)
    }
    setOverride(seed)
  }

  function setPercent(userId: string, value: string) {
    setOverride((prev) => {
      const next = { ...(prev ?? {}), [userId]: value }
      // With exactly two people the remainder is implied, so keep them paired.
      if (selectedIds.length === 2) {
        const other = selectedIds.find((id) => id !== userId)
        const parsed = parseFloat(value)
        if (other && Number.isFinite(parsed)) {
          next[other] = formatPercent(Math.round((100 - parsed) * 100) / 100)
        }
      }
      return next
    })
  }

  async function handleDelete() {
    if (!existing) return
    setDeleting(true)
    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', existing.id)
    if (deleteError) {
      setError(deleteError.message)
      setDeleting(false)
      return
    }
    setDeleting(false)
    onDeleted(existing.id)
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!description.trim()) {
      setError('Add a description')
      return
    }
    if (!validAmount) {
      setError('Enter an amount greater than 0')
      return
    }
    if (!paidBy) {
      setError('Pick who paid')
      return
    }
    if (selectedIds.length === 0) {
      setError('Pick at least one person to split with')
      return
    }
    if (overrideWeights && Math.abs(weightSum - 100) > 0.5) {
      setError('Percentages must sum to 100')
      return
    }

    setSubmitting(true)
    setError(null)

    const trimmed = description.trim()
    const totalCents = Math.round(amountNumber * 100)
    const finalShares = distributeCents(totalCents, selectedIds, effectiveWeights)

    if (existing) {
      // --- Edit flow ---------------------------------------------------------
      // Not atomic; the operations are sequential. If anything fails mid-way,
      // the user can re-submit: UPDATE is idempotent, DELETE-with-no-rows is
      // a no-op, and INSERT will refill what's missing.
      const { error: updateError } = await supabase
        .from('expenses')
        .update({
          description: trimmed,
          amount: amountNumber,
          paid_by: paidBy,
          category_id: categoryId,
          spent_at: spentAt,
        })
        .eq('id', existing.id)
      if (updateError) {
        setError(updateError.message)
        setSubmitting(false)
        return
      }

      const { error: deleteError } = await supabase
        .from('expense_splits')
        .delete()
        .eq('expense_id', existing.id)
      if (deleteError) {
        setError(deleteError.message)
        setSubmitting(false)
        return
      }

      const { data: newSplits, error: insertSplitsError } = await supabase
        .from('expense_splits')
        .insert(
          selectedIds.map((userId, i) => ({
            expense_id: existing.id,
            user_id: userId,
            share_amount: finalShares[i],
          })),
        )
        .select()
      if (insertSplitsError || !newSplits) {
        setError(insertSplitsError?.message ?? 'Could not save splits')
        setSubmitting(false)
        return
      }

      setSubmitting(false)
      onSaved({
        ...existing,
        description: trimmed,
        amount: amountNumber,
        paid_by: paidBy,
        category_id: categoryId,
        spent_at: spentAt,
        splits: newSplits,
      })
      return
    }

    // --- New flow ------------------------------------------------------------
    const { data: inserted, error: insertExpenseError } = await supabase
      .from('expenses')
      .insert({
        group_id: group.id,
        description: trimmed,
        amount: amountNumber,
        paid_by: paidBy,
        created_by: currentUserId,
        category_id: categoryId,
        spent_at: spentAt,
      })
      .select()
      .single()

    if (insertExpenseError || !inserted) {
      setError(insertExpenseError?.message ?? 'Could not add expense')
      setSubmitting(false)
      return
    }

    const { data: splits, error: splitsError } = await supabase
      .from('expense_splits')
      .insert(
        selectedIds.map((userId, i) => ({
          expense_id: inserted.id,
          user_id: userId,
          share_amount: finalShares[i],
        })),
      )
      .select()

    if (splitsError || !splits) {
      await supabase.from('expenses').delete().eq('id', inserted.id)
      setError(splitsError?.message ?? 'Could not save splits')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onSaved({ ...inserted, splits })
  }

  return (
    <Sheet title={isEdit ? 'Edit Expense' : 'New Expense'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="exp-description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <input
            id="exp-description"
            type="text"
            autoFocus
            required
            maxLength={120}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Dinner, groceries, …"
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="exp-amount"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Amount
            </label>
            <input
              id="exp-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg font-mono tabular focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
          <div>
            <label
              htmlFor="exp-date"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Date
            </label>
            <input
              id="exp-date"
              type="date"
              required
              value={spentAt}
              onChange={(e) => setSpentAt(e.target.value)}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </span>
          {categories.length === 0 ? (
            <p className="text-xs text-muted">
              No categories yet — add one from the Categories tab.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {categories.map((c) => {
                const active = c.id === categoryId
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickCategory(c.id)}
                    aria-pressed={active}
                    style={
                      active
                        ? {
                            borderColor: c.color,
                            background: withAlpha(c.color, 0.08),
                          }
                        : undefined
                    }
                    className={`flex flex-col items-center gap-1.5 px-1 py-2.5 rounded-2xl border-[1.4px] text-[11.5px] font-semibold text-gray-700 transition ${
                      active
                        ? ''
                        : 'border-gray-200 bg-card hover:border-gray-300'
                    }`}
                  >
                    <CategoryDot color={c.color} icon={c.icon} size={32} />
                    <span className="w-full truncate text-center">{c.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="exp-paid-by"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Paid by
          </label>
          <select
            id="exp-paid-by"
            value={paidBy}
            onChange={(e) => setPaidBy(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-card"
          >
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Split between
          </span>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const active = splitBetween.has(m.user_id)
              return (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => toggleSplit(m.user_id)}
                  className={`px-3 py-2 rounded-full text-sm border transition min-h-[36px] ${
                    active
                      ? 'bg-brand text-white border-brand'
                      : 'bg-card text-gray-700 border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {m.display_name}
                </button>
              )
            })}
          </div>
        </div>

        {selectedIds.length > 0 && (
          <div className="bg-card border border-black/[.045] rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                Split
              </span>
              {override ? (
                <button
                  type="button"
                  onClick={() => setOverride(null)}
                  className="text-[11.5px] font-semibold text-brand hover:text-brand-dark"
                >
                  Reset to default
                </button>
              ) : (
                selectedIds.length > 1 && (
                  <button
                    type="button"
                    onClick={startOverride}
                    className="text-[11.5px] font-semibold text-brand hover:text-brand-dark"
                  >
                    Adjust for this expense
                  </button>
                )
              )}
            </div>

            {!override && category && (
              <div
                className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs mb-2.5"
                style={{
                  background: withAlpha(category.color, 0.07),
                  color: category.color,
                }}
              >
                <CategoryDot
                  color={category.color}
                  icon={category.icon}
                  size={22}
                  ghost
                />
                <span className="min-w-0">
                  Using <b className="font-bold">{category.name}</b> default —{' '}
                  {describeSplit(category, group, members)}
                </span>
              </div>
            )}

            {override && selectedIds.length === 2 ? (
              <SplitSlider
                leftName={
                  members.find((m) => m.user_id === selectedIds[0])
                    ?.display_name ?? ''
                }
                rightName={
                  members.find((m) => m.user_id === selectedIds[1])
                    ?.display_name ?? ''
                }
                value={parseFloat(override[selectedIds[0]] ?? '50')}
                onChange={(v) => setPercent(selectedIds[0], String(v))}
              />
            ) : null}

            <ul className="flex flex-col gap-2.5 mt-2.5">
              {selectedIds.map((uid, i) => {
                const member = members.find((m) => m.user_id === uid)
                const weight =
                  effectiveWeights?.[uid] ?? evenWeight(selectedIds.length)
                return (
                  <li key={uid} className="flex items-center gap-2.5">
                    <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-ink truncate">
                      {member?.display_name ?? 'Unknown'}
                    </span>
                    {override && selectedIds.length !== 2 ? (
                      <span className="relative flex items-center w-[74px]">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          inputMode="decimal"
                          aria-label={`${member?.display_name ?? 'Member'} percentage`}
                          value={override[uid] ?? ''}
                          onChange={(e) => setPercent(uid, e.target.value)}
                          className="w-full pl-2 pr-5 py-1.5 rounded-lg border border-gray-300 bg-app font-mono text-[12.5px] text-right focus:outline-none focus:border-brand"
                        />
                        <span className="absolute right-2 font-mono text-[11px] text-muted pointer-events-none">
                          %
                        </span>
                      </span>
                    ) : (
                      <span className="w-12 text-right font-mono text-[12.5px] text-muted">
                        {formatPercent(weight)}%
                      </span>
                    )}
                    <span className="w-[70px] text-right font-mono tabular text-[13px] font-semibold text-ink">
                      {formatUSD(shares[i] ?? 0)}
                    </span>
                  </li>
                )
              })}
            </ul>

            {override && Math.abs(weightSum - 100) > 0.5 && (
              <p className="mt-2.5 text-[11.5px] font-semibold text-accent-dark">
                Percentages total {weightSum.toFixed(1)}% — must be 100%.
              </p>
            )}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          >
            {error}
          </div>
        )}

        <div className="flex gap-2.5">
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || submitting}
              aria-label="Delete expense"
              className="w-12 h-12 shrink-0 grid place-items-center rounded-full border border-accent/30 text-accent hover:bg-accent/10 disabled:opacity-50 transition"
            >
              <TrashIcon size={17} />
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || deleting}
            className="flex-1 py-3 bg-brand text-white font-medium rounded-full hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            {submitting
              ? isEdit
                ? 'Saving…'
                : 'Adding…'
              : isEdit
                ? 'Save Changes'
                : 'Add Expense'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

/**
 * Percentages to pre-fill the "adjust" panel with when an existing expense's
 * splits don't match what its category/group default would produce — i.e. it
 * was hand-tuned. Returns null when the splits still match the default.
 */
function deriveOverride(
  existing: ExpenseWithSplits,
  group: Group,
  members: GroupMember[],
  categories: ExpenseCategory[],
): Record<string, string> | null {
  const totalCents = Math.round(Number(existing.amount) * 100)
  if (totalCents <= 0) return null

  const splitByUser = new Map(
    existing.splits.map((s) => [s.user_id, Math.round(Number(s.share_amount) * 100)]),
  )
  const ids = members
    .map((m) => m.user_id)
    .filter((uid) => splitByUser.has(uid))
  if (ids.length === 0) return null

  const category = existing.category_id
    ? (categories.find((c) => c.id === existing.category_id) ?? null)
    : null
  const defaults = resolveDefaultWeights({
    category,
    group,
    members,
    userIds: ids,
  })
  const expected = distributeCents(totalCents, ids, defaults)
  const matches = ids.every(
    (uid, i) => (splitByUser.get(uid) ?? 0) === Math.round(expected[i] * 100),
  )
  if (matches) return null

  return Object.fromEntries(
    ids.map((uid) => [
      uid,
      formatPercent(((splitByUser.get(uid) ?? 0) / totalCents) * 100),
    ]),
  )
}
