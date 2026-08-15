/**
 * Client-safe notification helper — routes through /api/notify (service role)
 * so cross-user notification inserts aren't blocked by RLS.
 * Fire-and-forget: never throws, notification failure is always non-fatal.
 */
export async function notify(payload: {
  user_id: string
  type: string
  title: string
  body?: string
  href?: string
}): Promise<void> {
  try {
    await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    /* non-fatal */
  }
}
