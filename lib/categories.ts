// ─── Category Delivery Logic — SINGLE SOURCE OF TRUTH (batch 9.11 #4) ─────────
//
// Every surface that needs to know "is this placement physical or digital?"
// imports from THIS file. Do not create local category lists — that's how the
// 9.11 email bug happened (three drifted copies of STATIC_CATEGORIES).
//
// Hierarchy of truth at runtime:
//   1. booking.delivery_mode  — what the advertiser actually chose (bookings)
//   2. listing.requires_print — what the host declared (listings)
//   3. classifyCategory()     — keyword fallback ONLY for form defaults / hints

/** Categories that are always physical media (legacy list + keyword match). */
export const STATIC_CATEGORIES = [
  'outdoor_static',
  'indoor_static',
  'static_billboards',
  'billboard',
  'storefront',
  'window',
  'vehicle_wrap',
]

/** Category is clearly digital when its value contains digital/display. */
export const isDigitalCat = (cat: string): boolean => {
  const c = (cat || '').toLowerCase()
  return c.includes('digital') || c.includes('display')
}

/** Category is clearly static/physical (list membership or 'static' keyword). */
export const isStaticCat = (cat: string): boolean => {
  const c = (cat || '').toLowerCase()
  return STATIC_CATEGORIES.includes(c) || c.includes('static')
}

/**
 * Delivery classification for the create/edit listing flow (batch 9.11 #5):
 *  - 'digital'   → no question; advertisers upload files
 *  - 'static'    → no question; print/delivery flow is on
 *  - 'ambiguous' → host answers "How do advertisers deliver their ad?"
 */
export type DeliveryClass = 'digital' | 'static' | 'ambiguous'

export function classifyCategory(cat: string): DeliveryClass {
  const c = (cat || '').toLowerCase()
  if (!c) return 'ambiguous'
  if (c.includes('digital') || c.includes('display')) return 'digital'
  if (c.includes('static')) return 'static'
  return 'ambiguous'
}

/**
 * Smart default for the ambiguous-category delivery question.
 * True = pre-select "Printed materials". Hosts can always change it.
 */
const PRINT_DEFAULT_CATEGORIES = [
  'billboard',
  'storefront',
  'window',
  'vehicle_wrap',
  'transit',
  'street_furniture',
  'event_based',
  'human_based',
]

export const printDefault = (cat: string): boolean =>
  PRINT_DEFAULT_CATEGORIES.includes((cat || '').toLowerCase())

/**
 * Final requires_print decision for a listing being created/edited.
 * Digital categories can never require print; static categories always do;
 * ambiguous categories use the host's answer.
 */
export function resolveRequiresPrint(cat: string, hostAnswer: boolean): boolean {
  const cls = classifyCategory(cat)
  if (cls === 'digital') return false
  if (cls === 'static') return true
  return hostAnswer
}
