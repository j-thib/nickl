import { useState } from 'react'
import type { FormEvent } from 'react'
import Sheet from '../../components/Sheet'
import { supabase } from '../../lib/supabase'
import type { Group, GroupMember, Payment } from '../../lib/database.types'

type Props = {
  group: Group
  members: GroupMember[]
  currentUserId: string
  onClose: () => void
  onSaved: (payment: Payment) => void
}

export default function PaymentSheet({
  group,
  members,
  currentUserId,
  onClose,
  onSaved,
}: Props) {
  const initialFrom =
    members.find((m) => m.user_id === currentUserId)?.user_id ??
    members[0]?.user_id ??
    ''
  const initialTo =
    members.find((m) => m.user_id !== initialFrom)?.user_id ?? ''

  const [paidBy, setPaidBy] = useState(initialFrom)
  const [paidTo, setPaidTo] = useState(initialTo)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const amtNum = parseFloat(amount)

    if (!paidBy || !paidTo) {
      setError('Pick both people')
      return
    }
    if (paidBy === paidTo) {
      setError('From and To must be different')
      return
    }
    if (!Number.isFinite(amtNum) || amtNum <= 0) {
      setError('Enter an amount greater than 0')
      return
    }

    setSubmitting(true)
    setError(null)

    const trimmedNote = note.trim()
    const { data: inserted, error: insertError } = await supabase
      .from('payments')
      .insert({
        group_id: group.id,
        paid_by: paidBy,
        paid_to: paidTo,
        amount: amtNum,
        note: trimmedNote ? trimmedNote : null,
        created_by: currentUserId,
      })
      .select()
      .single()

    if (insertError || !inserted) {
      setError(insertError?.message ?? 'Could not record payment')
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onSaved(inserted)
  }

  return (
    <Sheet title="Record Payment" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="pay-from"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            From
          </label>
          <select
            id="pay-from"
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
          <label
            htmlFor="pay-to"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            To
          </label>
          <select
            id="pay-to"
            value={paidTo}
            onChange={(e) => setPaidTo(e.target.value)}
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
          <label
            htmlFor="pay-amount"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Amount
          </label>
          <input
            id="pay-amount"
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
            htmlFor="pay-note"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Note <span className="text-muted font-normal">(optional)</span>
          </label>
          <input
            id="pay-note"
            type="text"
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Venmo, cash, …"
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-brand text-white font-medium rounded-full hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed transition min-h-[44px]"
        >
          {submitting ? 'Saving…' : 'Record Payment'}
        </button>
      </form>
    </Sheet>
  )
}
