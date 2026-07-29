/**
 * Flags describing how the app was opened, read from the URL hash.
 *
 * Supabase sends a password-reset link back to the site with the session in
 * the hash (`#access_token=…&type=recovery`), or with an explanation when the
 * one-time token is stale (`#error=access_denied&error_code=otp_expired`).
 * supabase-js consumes and clears that hash as soon as it initialises, so both
 * have to be captured at module load — before anything else touches the URL.
 */

export type AuthHash = {
  /** This page load came from a "reset your password" email. */
  isRecovery: boolean
  /** Why the emailed link was rejected, if it was. */
  error: string | null
}

export function parseAuthHash(hash: string): AuthHash {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  return {
    isRecovery: params.get('type') === 'recovery',
    error: params.get('error')
      ? (params.get('error_description') ??
        'That link is no longer valid. Request a new one.')
      : null,
  }
}

const current = parseAuthHash(
  typeof window === 'undefined' ? '' : window.location.hash,
)

export const openedFromRecoveryLink = current.isRecovery
export const recoveryLinkError = current.error
