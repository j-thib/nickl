import { useMemo } from 'react'
import EmptyState from '../../components/EmptyState'
import { ArrowRightIcon, CheckIcon } from '../../components/Icon'
import { greedyPairing } from '../../lib/settlement'
import { formatUSD } from '../../lib/money'
import type { GroupMember, Payment } from '../../lib/database.types'
import type { ExpenseWithSplits } from './types'

type Props = {
  expenses: ExpenseWithSplits[]
  payments: Payment[]
  members: GroupMember[]
  nameById: Record<string, string>
  currentUserId: string | undefined
  onRecordPayment: () => void
  onDeletePayment: (id: string) => void
}

export default function SettleTab({
  expenses,
  payments,
  members,
  nameById,
  currentUserId,
  onRecordPayment,
  onDeletePayment,
}: Props) {
  const { balanceCents, transfers, totalSpent } = useMemo(() => {
    // Track balances only for current members. Expenses or payments involving
    // removed members may leave a residual that the settlement algorithm
    // absorbs.
    const memberIds = new Set(members.map((m) => m.user_id))
    const dollars: Record<string, number> = {}
    for (const m of members) dollars[m.user_id] = 0
    let total = 0
    for (const e of expenses) {
      const amt = Number(e.amount)
      total += amt
      if (memberIds.has(e.paid_by)) dollars[e.paid_by] += amt
      for (const s of e.splits) {
        if (memberIds.has(s.user_id))
          dollars[s.user_id] -= Number(s.share_amount)
      }
    }
    for (const p of payments) {
      const amt = Number(p.amount)
      if (memberIds.has(p.paid_by)) dollars[p.paid_by] += amt
      if (memberIds.has(p.paid_to)) dollars[p.paid_to] -= amt
    }
    const settlement = greedyPairing(dollars)
    return {
      balanceCents: settlement.balances,
      transfers: settlement.transfers,
      totalSpent: total,
    }
  }, [expenses, payments, members])

  const yourCents = currentUserId ? (balanceCents[currentUserId] ?? 0) : 0
  const magnitudeTotal =
    members.reduce((s, m) => s + Math.abs(balanceCents[m.user_id] ?? 0), 0) || 1

  return (
    <div className="pt-3">
      <div className="flex flex-col bg-card border border-black/[.045] rounded-[18px] p-4">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {yourCents >= 0 ? "You're owed" : 'You owe'}
        </span>
        <span
          className={`font-mono tabular text-[32px] font-semibold leading-tight tracking-tight mt-0.5 mb-3.5 ${
            yourCents >= 0 ? 'text-brand' : 'text-accent'
          }`}
        >
          {formatUSD(Math.abs(yourCents) / 100)}
        </span>
        <div className="flex gap-1 h-[7px]" aria-hidden="true">
          {members.map((m) => {
            const cents = balanceCents[m.user_id] ?? 0
            return (
              <span
                key={m.user_id}
                className={`rounded min-w-[6px] ${
                  cents >= 0 ? 'bg-brand' : 'bg-accent'
                }`}
                style={{ flex: Math.abs(cents) / magnitudeTotal }}
              />
            )
          })}
        </div>
      </div>

      <SectionHead label="Balances" trailing={formatUSD(totalSpent)} />
      <ul className="flex flex-col gap-2">
        {members.map((m) => {
          const cents = balanceCents[m.user_id] ?? 0
          const state = cents > 0 ? 'is owed' : cents < 0 ? 'owes' : 'settled'
          const color =
            cents > 0 ? 'text-brand' : cents < 0 ? 'text-accent' : 'text-muted'
          return (
            <li
              key={m.user_id}
              className="flex items-center gap-3 px-3 py-3 bg-card border border-black/[.045] rounded-2xl min-h-[48px]"
            >
              <Avatar name={m.display_name} size={34} />
              <span className="flex-1 min-w-0 text-[14.5px] font-semibold text-ink truncate">
                {m.display_name}
              </span>
              <span className={`text-[12.5px] shrink-0 ${color}`}>
                {state === 'settled' ? (
                  'settled'
                ) : (
                  <>
                    {state}{' '}
                    <b className="font-mono tabular font-semibold">
                      {formatUSD(Math.abs(cents) / 100)}
                    </b>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>

      <SectionHead
        label="Transfers"
        trailing={`${transfers.length} to settle`}
      />
      {transfers.length === 0 ? (
        <EmptyState
          icon={CheckIcon}
          title="Everyone's settled"
          body="No transfers needed."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {transfers.map((t, i) => (
            <li
              key={i}
              className="flex items-center gap-2.5 px-3 py-3 bg-card border border-black/[.045] rounded-2xl text-muted"
            >
              <Avatar name={nameById[t.from] ?? '?'} size={30} />
              <span className="text-[13.5px] font-semibold text-ink truncate">
                {nameById[t.from] ?? t.from}
              </span>
              <ArrowRightIcon size={16} />
              <Avatar name={nameById[t.to] ?? '?'} size={30} />
              <span className="text-[13.5px] font-semibold text-ink truncate">
                {nameById[t.to] ?? t.to}
              </span>
              <span className="ml-auto shrink-0 font-mono tabular text-[13.5px] font-semibold text-ink">
                {formatUSD(t.amount)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onRecordPayment}
        className="w-full mt-4 py-3.5 rounded-full bg-brand text-white text-[14.5px] font-semibold hover:bg-brand-dark transition min-h-[44px]"
      >
        Record a payment
      </button>

      <SectionHead label="Payments" trailing={`${payments.length} logged`} />
      {payments.length === 0 ? (
        <p className="px-1 text-sm text-muted">
          Payments you record show up here and are folded into the balances
          above.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex items-start gap-3 px-3 py-3 bg-card border border-black/[.045] rounded-2xl"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm text-ink truncate">
                  <span className="font-semibold">
                    {nameById[p.paid_by] ?? 'Unknown'}
                  </span>
                  <span className="text-muted"> paid </span>
                  <span className="font-semibold">
                    {nameById[p.paid_to] ?? 'Unknown'}
                  </span>
                </div>
                {p.note?.trim() && (
                  <div className="mt-0.5 text-[11.5px] text-muted truncate">
                    {p.note}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono tabular text-sm font-semibold text-ink">
                  {formatUSD(Number(p.amount))}
                </div>
                {p.created_by === currentUserId && (
                  <button
                    type="button"
                    onClick={() => onDeletePayment(p.id)}
                    className="mt-0.5 text-[11px] text-accent-dark hover:underline px-1 py-1"
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
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

/** Initials bubble — two letters, derived from the display name. */
function Avatar({ name, size }: { name: string; size: number }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
  return (
    <span
      className="shrink-0 grid place-items-center rounded-full bg-ink text-card font-bold"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  )
}
