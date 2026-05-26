import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { CenteredSpinner } from '../components/Spinner'
import SplitSlider from '../components/SplitSlider'
import type { Group, GroupMember } from '../lib/database.types'

type Props = {
  group: Group
  onBack: () => void
  onLeft: () => void
  onGroupUpdated: (group: Group) => void
}

export default function GroupSettingsPage({
  group,
  onBack,
  onLeft,
  onGroupUpdated,
}: Props) {
  const { user } = useAuth()
  const { show: showToast } = useToast()

  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingGroupName, setEditingGroupName] = useState(false)
  const [groupNameDraft, setGroupNameDraft] = useState(group.name)
  const [savingGroupName, setSavingGroupName] = useState(false)

  const [editingDisplayName, setEditingDisplayName] = useState(false)
  const [displayNameDraft, setDisplayNameDraft] = useState('')
  const [savingDisplayName, setSavingDisplayName] = useState(false)

  const [leaving, setLeaving] = useState(false)

  const [editingSplitMode, setEditingSplitMode] = useState(false)
  const [splitModeDraft, setSplitModeDraft] = useState<
    'equal' | 'percentage'
  >(group.split_mode)
  const [pctDrafts, setPctDrafts] = useState<Record<string, string>>({})
  const [savingSplitMode, setSavingSplitMode] = useState(false)

  const isCreator = user?.id === group.created_by
  const me = members.find((m) => m.user_id === user?.id)
  const isTwoPerson = members.length === 2

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', group.id)
      .order('joined_at')
    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }
    setMembers(data ?? [])
    setLoading(false)
  }, [group.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (me) setDisplayNameDraft(me.display_name)
  }, [me])

  async function handleSaveGroupName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = groupNameDraft.trim()
    if (!trimmed || trimmed === group.name) {
      setEditingGroupName(false)
      setGroupNameDraft(group.name)
      return
    }
    setSavingGroupName(true)
    const { data, error: updateError } = await supabase
      .from('groups')
      .update({ name: trimmed })
      .eq('id', group.id)
      .select()
      .single()
    setSavingGroupName(false)
    if (updateError || !data) {
      setError(updateError?.message ?? 'Could not save group name')
      return
    }
    onGroupUpdated(data)
    setEditingGroupName(false)
    showToast('Group renamed')
  }

  async function handleSaveDisplayName(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!me) return
    const trimmed = displayNameDraft.trim()
    if (!trimmed || trimmed === me.display_name) {
      setEditingDisplayName(false)
      setDisplayNameDraft(me.display_name)
      return
    }
    setSavingDisplayName(true)
    const { error: updateError } = await supabase
      .from('group_members')
      .update({ display_name: trimmed })
      .eq('id', me.id)
    setSavingDisplayName(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setMembers((prev) =>
      prev.map((m) => (m.id === me.id ? { ...m, display_name: trimmed } : m)),
    )
    setEditingDisplayName(false)
    showToast('Display name updated')
  }

  function startEditSplitMode() {
    setSplitModeDraft(group.split_mode)
    // Initial input values: use saved percentages if present, else 50/50.
    const next: Record<string, string> = {}
    for (const m of members) {
      const val = m.split_percentage
      next[m.user_id] =
        val == null || Number.isNaN(val) ? '50' : String(Number(val))
    }
    setPctDrafts(next)
    setEditingSplitMode(true)
  }

  function updatePctDraft(userId: string, val: string) {
    const num = parseFloat(val)
    const other = members.find((m) => m.user_id !== userId)
    setPctDrafts((prev) => {
      const next = { ...prev, [userId]: val }
      if (other && Number.isFinite(num)) {
        // Auto-balance the other side so the pair sums to 100.
        const otherVal = Math.round((100 - num) * 100) / 100
        next[other.user_id] = String(otherVal)
      }
      return next
    })
  }

  async function handleSaveSplitMode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isCreator || !isTwoPerson) return

    setSavingSplitMode(true)
    setError(null)

    let pctA: number | null = null
    let pctB: number | null = null

    if (splitModeDraft === 'percentage') {
      pctA = parseFloat(pctDrafts[members[0].user_id])
      pctB = parseFloat(pctDrafts[members[1].user_id])
      if (!Number.isFinite(pctA) || !Number.isFinite(pctB)) {
        setError('Enter valid percentages')
        setSavingSplitMode(false)
        return
      }
      if (Math.abs(pctA + pctB - 100) > 0.5) {
        setError('Percentages must sum to 100')
        setSavingSplitMode(false)
        return
      }
    }

    // Update the group first, then the two member rows. Not transactional;
    // a partial failure surfaces an error and the user can retry.
    const { data: updatedGroup, error: groupErr } = await supabase
      .from('groups')
      .update({ split_mode: splitModeDraft })
      .eq('id', group.id)
      .select()
      .single()
    if (groupErr || !updatedGroup) {
      setError(groupErr?.message ?? 'Could not save split mode')
      setSavingSplitMode(false)
      return
    }

    const memberUpdates =
      splitModeDraft === 'percentage'
        ? [
            { id: members[0].id, split_percentage: pctA },
            { id: members[1].id, split_percentage: pctB },
          ]
        : members.map((m) => ({ id: m.id, split_percentage: null }))

    for (const update of memberUpdates) {
      const { error: memErr } = await supabase
        .from('group_members')
        .update({ split_percentage: update.split_percentage })
        .eq('id', update.id)
      if (memErr) {
        setError(memErr.message)
        setSavingSplitMode(false)
        return
      }
    }

    setMembers((prev) =>
      prev.map((m) => {
        const u = memberUpdates.find((x) => x.id === m.id)
        return u ? { ...m, split_percentage: u.split_percentage } : m
      }),
    )
    onGroupUpdated(updatedGroup)
    setEditingSplitMode(false)
    setSavingSplitMode(false)
    showToast('Split mode updated')
  }

  async function handleCopyInvite() {
    try {
      await navigator.clipboard.writeText(group.invite_code)
      showToast('Invite code copied')
    } catch {
      showToast('Could not copy — try long-pressing the code')
    }
  }

  async function handleLeave() {
    const confirmed = window.confirm(
      members.length <= 1
        ? "You're the last member — leaving will delete this group. Continue?"
        : 'Leave this group?',
    )
    if (!confirmed) return

    setLeaving(true)
    const { error: rpcError } = await supabase.rpc('leave_group', {
      target_group_id: group.id,
    })
    setLeaving(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    showToast('You left the group')
    onLeft()
  }

  return (
    <main className="min-h-screen bg-app pb-12">
      <header className="bg-card border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="w-11 h-11 -ml-2 flex items-center justify-center text-gray-700 hover:text-ink"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-lg font-semibold text-ink truncate">
            Group settings
          </h1>
        </div>
      </header>

      <div className="max-w-[480px] mx-auto px-4 pt-4 space-y-6">
        {error && (
          <div
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          >
            {error}
          </div>
        )}

        {loading ? (
          <CenteredSpinner label="Loading group" />
        ) : (
          <>
            {/* Group name */}
            <Section title="Group name">
              {editingGroupName ? (
                <form onSubmit={handleSaveGroupName} className="space-y-3">
                  <input
                    type="text"
                    value={groupNameDraft}
                    onChange={(e) => setGroupNameDraft(e.target.value)}
                    autoFocus
                    maxLength={80}
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingGroupName(false)
                        setGroupNameDraft(group.name)
                      }}
                      className="flex-1 py-3 bg-card border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingGroupName}
                      className="flex-1 py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark disabled:opacity-60"
                    >
                      {savingGroupName ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3 bg-card rounded-xl border border-gray-100 px-4 py-3 min-h-[56px]">
                  <span className="text-ink truncate">{group.name}</span>
                  {isCreator && (
                    <button
                      type="button"
                      onClick={() => setEditingGroupName(true)}
                      className="text-sm text-brand font-medium hover:text-brand-dark px-2"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </Section>

            {/* Invite code */}
            <Section title="Invite code" hint="Share this code so others can join.">
              <div className="flex items-center justify-between gap-3 bg-card rounded-xl border border-gray-100 px-4 py-3 min-h-[56px]">
                <span className="font-mono tabular tracking-widest text-lg text-ink">
                  {group.invite_code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyInvite}
                  aria-label="Copy invite code"
                  className="flex items-center gap-1 text-sm text-brand font-medium hover:text-brand-dark px-2 py-1 min-h-[44px]"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </button>
              </div>
            </Section>

            {/* My display name */}
            {me && (
              <Section title="My display name">
                {editingDisplayName ? (
                  <form onSubmit={handleSaveDisplayName} className="space-y-3">
                    <input
                      type="text"
                      value={displayNameDraft}
                      onChange={(e) => setDisplayNameDraft(e.target.value)}
                      autoFocus
                      maxLength={60}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDisplayName(false)
                          setDisplayNameDraft(me.display_name)
                        }}
                        className="flex-1 py-3 bg-card border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingDisplayName}
                        className="flex-1 py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark disabled:opacity-60"
                      >
                        {savingDisplayName ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3 bg-card rounded-xl border border-gray-100 px-4 py-3 min-h-[56px]">
                    <span className="text-ink truncate">
                      {me.display_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditingDisplayName(true)}
                      className="text-sm text-brand font-medium hover:text-brand-dark px-2"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </Section>
            )}

            {/* Split mode — 2-person groups only */}
            {isTwoPerson && (
              <Section title="Split mode">
                {editingSplitMode ? (
                  <form
                    onSubmit={handleSaveSplitMode}
                    className="space-y-3"
                  >
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        type="button"
                        onClick={() => setSplitModeDraft('equal')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-md transition min-h-[44px] ${
                          splitModeDraft === 'equal'
                            ? 'bg-card text-brand shadow-sm'
                            : 'text-muted'
                        }`}
                      >
                        Equal
                      </button>
                      <button
                        type="button"
                        onClick={() => setSplitModeDraft('percentage')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-md transition min-h-[44px] ${
                          splitModeDraft === 'percentage'
                            ? 'bg-card text-brand shadow-sm'
                            : 'text-muted'
                        }`}
                      >
                        Custom %
                      </button>
                    </div>

                    {splitModeDraft === 'percentage' && members.length === 2 && (
                      <div className="bg-card rounded-xl border border-gray-100 px-4 py-5">
                        <SplitSlider
                          leftName={members[0].display_name}
                          rightName={members[1].display_name}
                          value={parseFloat(
                            pctDrafts[members[0].user_id] ?? '50',
                          )}
                          onChange={(v) =>
                            updatePctDraft(members[0].user_id, String(v))
                          }
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingSplitMode(false)}
                        className="flex-1 py-3 bg-card border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingSplitMode}
                        className="flex-1 py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark disabled:opacity-60"
                      >
                        {savingSplitMode ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between gap-3 bg-card rounded-xl border border-gray-100 px-4 py-3 min-h-[56px]">
                    <span className="text-ink truncate">
                      {group.split_mode === 'percentage'
                        ? members
                            .map((m) => {
                              const pct = m.split_percentage ?? 50
                              return `${m.display_name} ${formatPct(Number(pct))}`
                            })
                            .join(' · ')
                        : 'Equal'}
                    </span>
                    {isCreator && (
                      <button
                        type="button"
                        onClick={startEditSplitMode}
                        className="text-sm text-brand font-medium hover:text-brand-dark px-2"
                      >
                        Edit
                      </button>
                    )}
                  </div>
                )}
              </Section>
            )}

            {/* Members */}
            <Section title={`Members (${members.length})`}>
              <ul className="bg-card rounded-xl border border-gray-100 divide-y divide-gray-100">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="px-4 py-3 flex items-center justify-between min-h-[56px]"
                  >
                    <span className="text-ink truncate">
                      {m.display_name}
                    </span>
                    {m.user_id === user?.id && (
                      <span className="text-xs text-muted">You</span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>

            {/* Leave */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleLeave}
                disabled={leaving}
                className="w-full py-3 bg-card border border-red-200 text-red-700 font-medium rounded-lg hover:bg-red-50 disabled:opacity-60 min-h-[44px]"
              >
                {leaving ? 'Leaving…' : 'Leave Group'}
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function formatPct(n: number): string {
  // Display integers without a decimal, otherwise one decimal of precision.
  return Number.isInteger(n) ? `${n}%` : `${n.toFixed(1)}%`
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2 px-1">
        {title}
      </h2>
      {children}
      {hint && <p className="mt-2 px-1 text-xs text-muted">{hint}</p>}
    </section>
  )
}
