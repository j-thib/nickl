import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { NicklWordmark } from '../components/Wordmark'
import { CenteredSpinner } from '../components/Spinner'

/**
 * Shown when the app is opened from a "reset your password" email. The link
 * already established a session, so all that's left is to set a new password.
 */
export default function ResetPasswordPage() {
  const { user, loading, completeRecovery, finishRecovery, cancelRecovery } =
    useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Use at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError("Those don't match.")
      return
    }

    setSubmitting(true)
    const { error: updateError } = await completeRecovery(password)
    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setDone(true)
  }

  // The link's session is exchanged asynchronously on load, so wait for it
  // before deciding whether the link worked.
  if (loading) {
    return (
      <Shell>
        <CenteredSpinner label="Checking your link" />
      </Shell>
    )
  }

  // Session resolved and there's still nobody signed in: the token was already
  // used, or it expired.
  if (!user) {
    return (
      <Shell>
        <p className="text-sm text-ink mb-1 font-semibold">
          That link didn't work
        </p>
        <p className="text-sm text-muted mb-5">
          Reset links can only be used once, and they expire. Request a fresh
          one and try again.
        </p>
        <button
          type="button"
          onClick={() => void cancelRecovery()}
          className="w-full py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark transition min-h-[44px]"
        >
          Back to sign in
        </button>
      </Shell>
    )
  }

  if (done) {
    return (
      <Shell>
        <p className="text-sm text-ink mb-1 font-semibold">Password updated</p>
        <p className="text-sm text-muted mb-5">
          You're signed in as {user.email}. Use the new password next time.
        </p>
        <button
          type="button"
          onClick={finishRecovery}
          className="w-full py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark transition min-h-[44px]"
        >
          Continue to Nickl
        </button>
      </Shell>
    )
  }

  return (
    <Shell>
      <p className="text-sm text-ink mb-1 font-semibold">Choose a password</p>
      <p className="text-sm text-muted mb-5">
        Setting a new password for {user.email}.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="new-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
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
          className="w-full py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed transition min-h-[44px]"
        >
          {submitting ? 'Saving…' : 'Set new password'}
        </button>

        <button
          type="button"
          onClick={() => void cancelRecovery()}
          className="w-full text-sm font-medium text-muted hover:text-ink transition"
        >
          Cancel
        </button>
      </form>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-app px-4 py-8">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="inline-flex">
            <NicklWordmark size={56} />
          </div>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-6">
          {children}
        </div>
      </div>
    </main>
  )
}
