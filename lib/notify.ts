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

/**
 * Client-safe SYSTEM message helper — routes through /api/messages/system
 * (service role). System messages are self-addressed to the target party so
 * RLS scopes visibility to exactly that user and the chat renders them as
 * neutral centered notes (no user impersonation).
 * Fire-and-forget: never throws.
 */
export async function systemMessage(payload: {
  booking_id: string
  to: 'host' | 'advertiser'
  content: string
  image_url?: string | null
}): Promise<void> {
  try {
    await fetch('/api/messages/system', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    /* non-fatal */
  }
}
