import { afterEach, describe, expect, it, vi } from 'vitest'
import { REQUEST_TIMEOUT_MS, TIMEOUT_MESSAGE, fetchWithTimeout } from './http'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('fetchWithTimeout', () => {
  it('passes a prompt response straight through', async () => {
    const response = new Response('ok')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

    await expect(fetchWithTimeout('https://example.test')).resolves.toBe(
      response,
    )
  })

  it('gives up on a request that never answers', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(init.signal?.reason),
            )
          }),
      ),
    )

    const pending = fetchWithTimeout('https://example.test')
    const rejects = expect(pending).rejects.toThrow(TIMEOUT_MESSAGE)
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS)
    await rejects
  })

  it("aborts when the caller's own signal fires first", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_input: RequestInfo | URL, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () =>
              reject(init.signal?.reason),
            )
          }),
      ),
    )

    const caller = new AbortController()
    const pending = fetchWithTimeout('https://example.test', {
      signal: caller.signal,
    })
    caller.abort(new Error('cancelled by supabase-js'))

    await expect(pending).rejects.toThrow('cancelled by supabase-js')
  })

  it('clears its timer once the response lands', async () => {
    vi.useFakeTimers()
    const clear = vi.spyOn(globalThis, 'clearTimeout')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('ok')))

    await fetchWithTimeout('https://example.test')

    expect(clear).toHaveBeenCalled()
  })
})
