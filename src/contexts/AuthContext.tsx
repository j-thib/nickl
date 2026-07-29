import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { AuthError, Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { openedFromRecoveryLink } from '../lib/recovery'

type AuthResult = { error: AuthError | null }
type SignUpResult = AuthResult & { emailAlreadyInUse: boolean }
// `currentPasswordInvalid` separates "you mistyped your old password" from a
// genuine failure, so the UI can point at the right field.
type UpdatePasswordResult = AuthResult & { currentPasswordInvalid: boolean }

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<SignUpResult>
  signOut: () => Promise<AuthResult>
  updatePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<UpdatePasswordResult>
  /**
   * True from the moment a reset-password link is opened until the new
   * password is set (or the attempt is abandoned). The link signs the user in,
   * so without this the app would drop them straight into their groups with
   * the password still unknown to them.
   */
  recovering: boolean
  sendPasswordReset: (email: string) => Promise<AuthResult>
  /** Sets a new password without knowing the old one. Recovery flow only. */
  completeRecovery: (newPassword: string) => Promise<AuthResult>
  /** Dismisses the success screen and hands over to the app. */
  finishRecovery: () => void
  /** Abandons the reset and returns to a signed-out state. */
  cancelRecovery: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // Seeded from the URL because supabase-js clears the hash during init; the
  // PASSWORD_RECOVERY event below is the second, belt-and-braces signal.
  const [recovering, setRecovering] = useState(openedFromRecoveryLink)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        if (event === 'PASSWORD_RECOVERY') setRecovering(true)
        setSession(nextSession)
        setUser(nextSession?.user ?? null)
        setLoading(false)
      },
    )

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        return { error }
      },
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password })
        const identities = data.user?.identities
        const emailAlreadyInUse =
          !error &&
          ((data.user == null && data.session == null) ||
            (data.user != null &&
              (identities == null || identities.length === 0)))
        return { error, emailAlreadyInUse }
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut()
        return { error }
      },
      updatePassword: async (currentPassword, newPassword) => {
        // Re-authenticate first. Supabase will happily change the password on
        // any live session, so without this anyone holding an unlocked device
        // could lock the owner out of their own account.
        // (An account with no email can't be re-checked this way; the UI only
        // offers the form when there is one.)
        const email = user?.email
        if (email) {
          const { error: reauthError } =
            await supabase.auth.signInWithPassword({
              email,
              password: currentPassword,
            })
          if (reauthError) {
            return { error: reauthError, currentPasswordInvalid: true }
          }
        }
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        })
        return { error, currentPasswordInvalid: false }
      },
      recovering,
      sendPasswordReset: async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          // Whatever origin the request came from — production, a preview
          // build, or localhost. Each one has to be in Supabase's redirect
          // allow-list or the link bounces.
          redirectTo: window.location.origin,
        })
        return { error }
      },
      completeRecovery: async (newPassword) => {
        // No re-authentication here, unlike updatePassword: the emailed link
        // *is* the proof of identity, and the whole point is that the old
        // password is unknown.
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        })
        return { error }
      },
      finishRecovery: () => setRecovering(false),
      cancelRecovery: async () => {
        setRecovering(false)
        await supabase.auth.signOut()
      },
    }),
    [user, session, loading, recovering],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
