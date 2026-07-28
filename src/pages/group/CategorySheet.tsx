import { useState } from 'react'
import type { FormEvent } from 'react'
import Sheet from '../../components/Sheet'
import SplitSlider from '../../components/SplitSlider'
import CategoryDot from '../../components/CategoryDot'
import { CategoryGlyph, CheckIcon, TrashIcon } from '../../components/Icon'
import { supabase } from '../../lib/supabase'
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  withAlpha,
} from '../../lib/categories'
import { formatPercent } from '../../lib/money'
import { evenWeight } from '../../lib/split'
import type {
  ExpenseCategory,
  Group,
  GroupMember,
} from '../../lib/database.types'

type Props = {
  group: Group
  members: GroupMember[]
  existing: ExpenseCategory | null
  /** Used to place a new category at the end of the list. */
  nextSortOrder: number
  onClose: () => void
  onSaved: (category: ExpenseCategory) => void
  onDeleted: (id: string) => void
}

export default function CategorySheet({
  group,
  members,
  existing,
  nextSortOrder,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const isEdit = existing !== null

  const [name, setName] = useState(existing?.name ?? '')
  const [color, setColor] = useState(existing?.color ?? CATEGORY_COLORS[0])
  const [icon, setIcon] = useState(existing?.icon ?? 'tag')
  const [mode, setMode] = useState<'group' | 'custom'>(
    existing?.split_mode ?? 'group',
  )
  const [weights, setWeights] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {}
    const existingWeights = existing?.split_weights
    for (const m of members) {
      const w = existingWeights?.[m.user_id]
      seed[m.user_id] = formatPercent(
        w != null ? Number(w) : evenWeight(members.length),
      )
    }
    return seed
  })
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sum = members.reduce((s, m) => {
    const parsed = parseFloat(weights[m.user_id] ?? '')
    return s + (Number.isFinite(parsed) ? parsed : 0)
  }, 0)
  const weightsValid = mode === 'group' || Math.abs(sum - 100) <= 0.5

  function setPercent(userId: string, value: string) {
    setWeights((prev) => {
      const next = { ...prev, [userId]: value }
      // Two-person groups: the other side is implied.
      if (members.length === 2) {
        const other = members.find((m) => m.user_id !== userId)
        const parsed = parseFloat(value)
        if (other && Number.isFinite(parsed)) {
          next[other.user_id] = formatPercent(
            Math.round((100 - parsed) * 100) / 100,
          )
        }
      }
      return next
    })
  }

  async function handleDelete() {
    if (!existing) return
    setDeleting(true)
    const { error: deleteError } = await supabase
      .from('expense_categories')
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
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name the category')
      return
    }
    if (!weightsValid) {
      setError('Percentages must sum to 100')
      return
    }

    setSubmitting(true)
    setError(null)

    const splitWeights =
      mode === 'custom'
        ? Object.fromEntries(
            members.map((m) => {
              const parsed = parseFloat(weights[m.user_id] ?? '')
              return [m.user_id, Number.isFinite(parsed) ? parsed : 0]
            }),
          )
        : null

    const payload = {
      name: trimmed,
      color,
      icon,
      split_mode: mode,
      split_weights: splitWeights,
    }

    const query = existing
      ? supabase
          .from('expense_categories')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single()
      : supabase
          .from('expense_categories')
          .insert({
            ...payload,
            group_id: group.id,
            sort_order: nextSortOrder,
          })
          .select()
          .single()

    const { data, error: saveError } = await query

    if (saveError || !data) {
      // 23505 = unique_violation on (group_id, name).
      setError(
        saveError?.code === '23505'
          ? 'A category with that name already exists'
          : (saveError?.message ?? 'Could not save category'),
      )
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onSaved(data)
  }

  return (
    <Sheet title={isEdit ? 'Edit Category' : 'New Category'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="flex items-center gap-3 p-4 rounded-2xl"
          style={{ background: withAlpha(color, 0.07) }}
        >
          <CategoryDot color={color} icon={icon} size={52} />
          <span
            className="text-[19px] font-bold tracking-tight truncate"
            style={{ color }}
          >
            {name.trim() || 'Category name'}
          </span>
        </div>

        <div>
          <label
            htmlFor="cat-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Name
          </label>
          <input
            id="cat-name"
            type="text"
            autoFocus
            required
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Household"
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Colour
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Colour ${c}`}
                aria-pressed={c === color}
                style={{ background: c }}
                className={`w-9 h-9 rounded-xl grid place-items-center text-white border-2 transition ${
                  c === color ? 'border-ink scale-105' : 'border-transparent'
                }`}
              >
                {c === color && <CheckIcon size={14} />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">
            Icon
          </span>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_ICONS.map((g) => {
              const active = g === icon
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setIcon(g)}
                  aria-label={`Icon ${g}`}
                  aria-pressed={active}
                  style={active ? { borderColor: color, color } : undefined}
                  className={`w-10 h-10 rounded-xl grid place-items-center border-[1.4px] bg-card transition ${
                    active ? '' : 'border-gray-200 text-muted hover:border-gray-300'
                  }`}
                >
                  <CategoryGlyph name={g} size={20} />
                </button>
              )
            })}
          </div>
        </div>

        <div className="bg-card border border-black/[.045] rounded-2xl p-3.5">
          <span className="block text-sm font-medium text-gray-700 mb-1">
            Default split for this category
          </span>
          <p className="text-[11.5px] text-muted leading-relaxed mb-2.5">
            Every new expense in this category starts with this split. It can
            still be adjusted per expense.
          </p>

          <div className="flex gap-1 p-1 bg-black/[.045] rounded-xl mb-3">
            {(
              [
                { value: 'group', label: 'Group default' },
                { value: 'custom', label: 'Custom %' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMode(opt.value)}
                className={`flex-1 py-2 rounded-lg text-[12.5px] font-semibold transition ${
                  mode === opt.value
                    ? 'bg-card text-ink shadow-sm'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {mode === 'custom' && members.length === 2 && (
            <div className="mb-3">
              <SplitSlider
                leftName={members[0].display_name}
                rightName={members[1].display_name}
                value={parseFloat(weights[members[0].user_id] ?? '50')}
                onChange={(v) => setPercent(members[0].user_id, String(v))}
              />
            </div>
          )}

          <ul className="flex flex-col gap-2.5">
            {members.map((m) => (
              <li key={m.user_id} className="flex items-center gap-2.5">
                <span className="flex-1 min-w-0 text-[13.5px] font-semibold text-ink truncate">
                  {m.display_name}
                </span>
                {mode === 'custom' && members.length !== 2 ? (
                  <span className="relative flex items-center w-[74px]">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      inputMode="decimal"
                      aria-label={`${m.display_name} percentage`}
                      value={weights[m.user_id] ?? ''}
                      onChange={(e) => setPercent(m.user_id, e.target.value)}
                      className="w-full pl-2 pr-5 py-1.5 rounded-lg border border-gray-300 bg-app font-mono text-[12.5px] text-right focus:outline-none focus:border-brand"
                    />
                    <span className="absolute right-2 font-mono text-[11px] text-muted pointer-events-none">
                      %
                    </span>
                  </span>
                ) : (
                  <span className="w-16 text-right font-mono text-[12.5px] text-muted">
                    {mode === 'custom'
                      ? `${formatPercent(parseFloat(weights[m.user_id] ?? '0') || 0)}%`
                      : groupDefaultLabel(group, members, m)}
                  </span>
                )}
              </li>
            ))}
          </ul>

          {mode === 'custom' && (
            <p
              className={`mt-2.5 text-[11.5px] ${
                weightsValid
                  ? 'text-muted'
                  : 'font-semibold text-accent-dark'
              }`}
            >
              Total {sum.toFixed(1)}%{weightsValid ? '' : ' — must be 100%'}
            </p>
          )}
        </div>

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
              aria-label="Delete category"
              className="w-12 h-12 shrink-0 grid place-items-center rounded-full border border-accent/30 text-accent hover:bg-accent/10 disabled:opacity-50 transition"
            >
              <TrashIcon size={17} />
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || deleting || !name.trim() || !weightsValid}
            className="flex-1 py-3 bg-brand text-white font-medium rounded-full hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            {submitting
              ? 'Saving…'
              : isEdit
                ? 'Save Category'
                : 'Create Category'}
          </button>
        </div>

        {isEdit && (
          <p className="text-[11.5px] text-muted leading-relaxed">
            Deleting a category keeps its expenses — they become uncategorized.
          </p>
        )}
      </form>
    </Sheet>
  )
}

function groupDefaultLabel(
  group: Group,
  members: GroupMember[],
  member: GroupMember,
): string {
  if (group.split_mode === 'percentage' && members.length === 2) {
    return `${formatPercent(Number(member.split_percentage ?? 50))}%`
  }
  return `${formatPercent(evenWeight(members.length))}%`
}
