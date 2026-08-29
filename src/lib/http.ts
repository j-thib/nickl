// fetch has no timeout of its own. A server that accepts the connection and
// then never answers — which is exactly how a wedged Supabase auth container
// behaves — leaves the request pending forever, so the app sits on a spinner
// with nothing to tell the user. Everything below puts a ceiling on that.

/**
 * How long to wait for Supabase before giving up. A healthy round trip is
 * 100–200ms, so ten seconds is far past "slow" while still short enough that
 * the UI doesn't feel hung.
 */
export const REQUEST_TIMEOUT_MS = 10_000

/**
 * Shown to the user when a request times out, so it has to read as plain
 * advice rather than as a diagnostic. supabase-js surfaces the abort reason's
 * message on the `error` it hands back, which is what the sign-in form
 * renders.
 */
export const TIMEOUT_MESSAGE =
  "Couldn't reach the server. Check your connection and try again."

/**
 * `fetch`, but it gives up after `REQUEST_TIMEOUT_MS`. A caller-supplied
 * signal still works — whichever fires first wins.
 */
export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(new DOMException(TIMEOUT_MESSAGE, 'TimeoutError')),
    REQUEST_TIMEOUT_MS,
  )

  // supabase-js cancels some requests itself; don't swallow that.
  const caller = init.signal
  if (caller) {
    if (caller.aborted) controller.abort(caller.reason)
    else {
      caller.addEventListener('abort', () => controller.abort(caller.reason), {
        once: true,
      })
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timer)
  })
}
