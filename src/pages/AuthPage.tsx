import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { NicklWordmark } from '../components/Wordmark'
import { recoveryLinkError } from '../lib/recovery'

type Mode = 'signin' | 'signup' | 'reset'

export default function AuthPage() {
  const { signIn, signUp, sendPasswordReset } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // A dud reset link lands back here; say so instead of showing a bare form.
  const [error, setError] = useState<string | null>(recoveryLinkError)
  const [emailTakenError, setEmailTakenError] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setEmailTakenError(false)
    setMessage(null)
    setSubmitting(true)

    if (mode === 'reset') {
      const { error: resetError } = await sendPasswordReset(email.trim())
      setSubmitting(false)
      if (resetError) {
        setError(resetError.message)
        return
      }
      // Deliberately not confirming whether the address has an account —
      // that would let anyone probe for members.
      setMessage(
        'If that email has an account, a reset link is on its way. The link works once and expires.',
      )
      return
    }

    if (mode === 'signin') {
      const { error: authError } = await signIn(email.trim(), password)
      setSubmitting(false)
      if (authError) {
        setError(authError.message)
      }
      return
    }

    const { error: authError, emailAlreadyInUse } = await signUp(
      email.trim(),
      password,
    )
    setSubmitting(false)

    if (emailAlreadyInUse) {
      setEmailTakenError(true)
      return
    }

    if (authError) {
      setError(authError.message)
      return
    }

    setMessage('Check your email to confirm your account.')
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setEmailTakenError(false)
    setMessage(null)
  }

  const isSignIn = mode === 'signin'
  const isReset = mode === 'reset'

  return (
    <main className="min-h-screen flex items-center justify-center bg-app px-4 py-8">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="inline-flex">
            <NicklWordmark size={56} />
          </div>
        </div>

        <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-6">
          {isReset ? (
            <div className="mb-5">
              <p className="text-sm font-semibold text-ink mb-1">
                Reset your password
              </p>
              <p className="text-sm text-muted">
                We'll email you a link that lets you set a new one.
              </p>
            </div>
          ) : (
            <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition min-h-[44px] ${
                  isSignIn ? 'bg-card text-brand shadow-sm' : 'text-muted'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition min-h-[44px] ${
                  !isSignIn ? 'bg-card text-brand shadow-sm' : 'text-muted'
                }`}
              >
                Sign up
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              />
            </div>

            {!isReset && (
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Password
                  </label>
                  {isSignIn && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs font-semibold text-brand hover:text-brand-dark"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete={isSignIn ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                />
              </div>
            )}

            {emailTakenError && (
              <div
                role="alert"
                className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                An account with this email already exists. Try{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="underline font-medium hover:text-red-800"
                >
                  signing in
                </button>{' '}
                instead.
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

            {message && (
              <div
                role="status"
                className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark disabled:opacity-60 disabled:cursor-not-allowed transition min-h-[44px]"
            >
              {submitting
                ? 'Please wait…'
                : isReset
                  ? 'Send reset link'
                  : isSignIn
                    ? 'Sign in'
                    : 'Create account'}
            </button>

            {isReset && (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="w-full text-sm font-medium text-muted hover:text-ink transition"
              >
                Back to sign in
              </button>
            )}
          </form>
        </div>
      </div>
    </main>
  )
}
