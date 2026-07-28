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
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
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
    }),
    [user, session, loading],
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
