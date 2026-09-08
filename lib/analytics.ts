/**
 * Analytics — dataLayer event helpers (GTM)
 *
 * Architecture: site → dataLayer → GTM → platforms (GA4, Meta, TikTok, ...)
 * The site NEVER talks to ad platforms directly. It announces events once to
 * the dataLayer; GTM tags listen and fan them out to each platform.
 *
 * Event names follow GA4 recommended-event vocabulary. GTM maps them to each
 * platform's dialect (e.g. purchase → Meta "Purchase", TikTok "CompletePayment").
 *
 * All listing-related events carry listing_id (as items[].item_id) so dynamic
 * catalog retargeting (Meta Advantage+ / TikTok) works from day one.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
  }
}

/** Low-level push. Safe on server (no-op) and if GTM is blocked. */
function push(event: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push(event)
  } catch {
    /* analytics must never break the app */
  }
}

export interface ListingItem {
  listing_id: string
  listing_title?: string
  category?: string
  price_per_day?: number
  city?: string
  state?: string
}

function toItem(l: ListingItem) {
  return {
    item_id: l.listing_id,
    item_name: l.listing_title,
    item_category: l.category,
    price: l.price_per_day,
  }
}

/** Fired once after a successful account creation. */
export function trackSignUp(role: 'advertiser' | 'host' | 'both') {
  push({ event: 'sign_up', method: 'email', user_role: role })
}

/** Fired when a listing detail page loads with real data. */
export function trackViewListing(listing: ListingItem) {
  push({
    event: 'view_listing',
    listing_id: listing.listing_id,
    ecommerce: { currency: 'USD', value: listing.price_per_day, items: [toItem(listing)] },
  })
}

/** Fired when the advertiser starts checkout (clicks through to Stripe). */
export function trackBeginCheckout(params: {
  listing: ListingItem
  value: number
  days?: number
}) {
  push({
    event: 'begin_checkout',
    listing_id: params.listing.listing_id,
    booking_days: params.days,
    ecommerce: { currency: 'USD', value: params.value, items: [toItem(params.listing)] },
  })
}

/**
 * Fired once per booking on the payment-success page.
 * Caller must dedupe (e.g. localStorage guard) — success pages get reloaded.
 */
export function trackPurchase(params: {
  bookingId: string
  value: number
  listing: ListingItem
}) {
  push({
    event: 'purchase',
    listing_id: params.listing.listing_id,
    transaction_id: params.bookingId,
    ecommerce: {
      currency: 'USD',
      value: params.value,
      transaction_id: params.bookingId,
      items: [toItem(params.listing)],
    },
  })
}

/** Fired once when a host successfully publishes a listing (supply-side conversion). */
export function trackPublishListing(listing: ListingItem) {
  push({
    event: 'publish_listing',
    listing_id: listing.listing_id,
    listing_category: listing.category,
    price_per_day: listing.price_per_day,
  })
}
