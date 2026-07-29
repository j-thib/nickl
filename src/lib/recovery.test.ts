import { describe, expect, it } from 'vitest'
import { parseAuthHash } from './recovery'

describe('parseAuthHash', () => {
  it('treats a plain page load as neither', () => {
    expect(parseAuthHash('')).toEqual({ isRecovery: false, error: null })
  })

  it('recognises a recovery link', () => {
    const hash =
      '#access_token=eyJhbGc.abc&expires_in=3600&refresh_token=xyz&token_type=bearer&type=recovery'
    expect(parseAuthHash(hash)).toEqual({ isRecovery: true, error: null })
  })

  it('does not mistake a magic link for a recovery link', () => {
    expect(parseAuthHash('#access_token=eyJhbGc.abc&type=magiclink')).toEqual({
      isRecovery: false,
      error: null,
    })
  })

  it('surfaces an expired link, decoding the description', () => {
    const hash =
      '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'
    expect(parseAuthHash(hash)).toEqual({
      isRecovery: false,
      error: 'Email link is invalid or has expired',
    })
  })

  it('falls back to its own wording when the description is missing', () => {
    const { error } = parseAuthHash('#error=access_denied')
    expect(error).toBe('That link is no longer valid. Request a new one.')
  })

  it('tolerates a hash with no leading #', () => {
    expect(parseAuthHash('type=recovery').isRecovery).toBe(true)
  })
})
