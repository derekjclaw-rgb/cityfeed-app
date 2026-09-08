/**
 * CAPI — server-side conversion events (Meta Conversions API + TikTok Events API)
 *
 * Architecture: the Stripe webhook is the source of truth for purchases.
 * When checkout.session.completed fires, we report the purchase directly to
 * Meta and TikTok — server-to-server, immune to ad blockers / iOS privacy.
 *
 * DEDUPLICATION: event_id = booking id on BOTH the browser pixel and these
 * server events. Platforms match the two reports and count once.
 * - TikTok browser tag (GTM "TikTok — CompletePayment") already sends
 *   Event ID = {{DLV — transaction_id}} = booking id.
 * - Meta browser tag needs its "eventId" field set to {{DLV — transaction_id}}
 *   in GTM (template supports it — maps to fbq eventID).
 *
 * All sends are fire-and-forget: a CAPI failure must NEVER break the webhook
 * (booking creation/emails are the critical path).
 *
 * Env vars (Vercel):
 * - META_CAPI_ACCESS_TOKEN   — Meta Events Manager → dataset Settings → Conversions API → Generate access token
 * - TIKTOK_EVENTS_API_TOKEN  — TikTok Events Manager → pixel → Settings → Events API → Generate Access Token
 */

import { createHash } from 'crypto'

const META_DATASET_ID = '1073411375091030'
const TIKTOK_PIXEL_CODE = 'DAFKPCJC77UCRCTVBN1G'
const META_API_VERSION = 'v21.0'

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

export interface PurchaseEvent {
  bookingId: string
  value: number
  listingId: string
  /** Advertiser email (hashed before sending — never sent raw) */
  email?: string | null
  /** Advertiser user id (hashed — improves match quality) */
  userId?: string | null
  /** Landing URL for the event (booking success page) */
  sourceUrl?: string
  /** Buyer IP captured at checkout creation (sent raw per Meta/TikTok spec) */
  clientIp?: string | null
  /** Buyer user agent captured at checkout creation (sent raw per spec) */
  clientUserAgent?: string | null
}

/** Report a purchase to Meta Conversions API. Fire-and-forget. */
async function sendMetaPurchase(ev: PurchaseEvent): Promise<void> {
  const token = process.env.META_CAPI_ACCESS_TOKEN
  if (!token) {
    console.log('[CAPI] META_CAPI_ACCESS_TOKEN not set — skipping Meta server event')
    return
  }

  const userData: Record<string, string[] | string> = {}
  if (ev.email) userData.em = [sha256(ev.email)]
  if (ev.userId) userData.external_id = [sha256(ev.userId)]
  // IP + UA are sent raw (never hashed) per Meta spec — improves match quality
  if (ev.clientIp) userData.client_ip_address = ev.clientIp
  if (ev.clientUserAgent) userData.client_user_agent = ev.clientUserAgent

  const body = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: ev.bookingId,
        action_source: 'website',
        event_source_url: ev.sourceUrl ?? 'https://www.cityfeed.io/booking/success',
        user_data: userData,
        custom_data: {
          value: ev.value,
          currency: 'USD',
          content_ids: [ev.listingId],
          content_type: 'product',
        },
      },
    ],
  }

  const res = await fetch(
    `https://graph.facebook.com/${META_API_VERSION}/${META_DATASET_ID}/events?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    console.error('[CAPI] Meta Purchase failed:', res.status, JSON.stringify(json))
  } else {
    console.log('[CAPI] Meta Purchase sent:', ev.bookingId, JSON.stringify(json))
  }
}

/** Report a purchase to TikTok Events API. Fire-and-forget. */
async function sendTikTokPurchase(ev: PurchaseEvent): Promise<void> {
  const token = process.env.TIKTOK_EVENTS_API_TOKEN
  if (!token) {
    console.log('[CAPI] TIKTOK_EVENTS_API_TOKEN not set — skipping TikTok server event')
    return
  }

  const user: Record<string, string> = {}
  if (ev.email) user.email = sha256(ev.email)
  if (ev.userId) user.external_id = sha256(ev.userId)
  if (ev.clientIp) user.ip = ev.clientIp
  if (ev.clientUserAgent) user.user_agent = ev.clientUserAgent

  const body = {
    event_source: 'web',
    event_source_id: TIKTOK_PIXEL_CODE,
    data: [
      {
        event: 'CompletePayment',
        event_time: Math.floor(Date.now() / 1000),
        event_id: ev.bookingId,
        user,
        properties: {
          value: ev.value,
          currency: 'USD',
          content_ids: [ev.listingId],
          content_type: 'product',
        },
        page: { url: ev.sourceUrl ?? 'https://www.cityfeed.io/booking/success' },
      },
    ],
  }

  const res = await fetch('https://business-api.tiktok.com/open_api/v1.3/event/track/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Access-Token': token },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => null)
  // TikTok returns 200 with a code field; code 0 = success
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const code = (json as any)?.code
  if (!res.ok || (code !== undefined && code !== 0)) {
    console.error('[CAPI] TikTok CompletePayment failed:', res.status, JSON.stringify(json))
  } else {
    console.log('[CAPI] TikTok CompletePayment sent:', ev.bookingId)
  }
}

/**
 * Report a purchase to all server-side destinations. Never throws.
 * Call AFTER the booking is safely created/confirmed — analytics must never
 * block or break the money path.
 */
export async function reportPurchase(ev: PurchaseEvent): Promise<void> {
  try {
    await Promise.allSettled([sendMetaPurchase(ev), sendTikTokPurchase(ev)])
  } catch (err) {
    // Promise.allSettled shouldn't throw, but belt and suspenders
    console.error('[CAPI] reportPurchase unexpected error:', err)
  }
}
