/**
 * lib/fees.ts — SINGLE SOURCE OF TRUTH for all City Feed money math.
 *
 * Fee model (locked by Michael, 2026-08-10):
 *   feeBase         = subtotal + printFee     ← the full transaction value
 *   buyerFee        = 7% of feeBase           ← advertiser pays on top
 *   sellerFee       = 7% of feeBase           ← deducted from host payout
 *   advertiserTotal = feeBase + buyerFee
 *   hostPayout      = feeBase − sellerFee
 *   platformRevenue = buyerFee + sellerFee
 *
 * RULES — read this before touching money code:
 *   1. Amounts are computed ONCE at checkout (computeBookingFinancials) and
 *      stored on the booking row: subtotal, buyer_fee, seller_fee,
 *      print_fee_charged, total_price. payout_amount is stamped from the
 *      actual Stripe transfer.
 *   2. Every UI surface, email, and payout MUST read via
 *      getBookingFinancials(booking) — NEVER re-derive from total_price.
 *   3. Legacy bookings (created before the itemized columns existed) used the
 *      OLD fee model (7% buyer fee on subtotal only; print fee un-fee'd).
 *      getBookingFinancials falls back to that derivation so historical
 *      receipts stay accurate to what was actually charged.
 */
import { BUYER_FEE_PCT, SELLER_FEE_PCT } from './constants'

export const round2 = (n: number) => Math.round(n * 100) / 100

export interface BookingFinancials {
  /** price/day derived from stored subtotal ÷ days (display only) */
  pricePerDay: number | null
  days: number | null
  subtotal: number
  printFee: number
  buyerFee: number
  sellerFee: number
  /** what the advertiser was charged */
  advertiserTotal: number
  /** actual payout if transferred (payout_amount), else expected payout */
  hostPayout: number
  platformRevenue: number
  /** true when derived from a pre-itemization booking */
  isLegacy: boolean
}

/**
 * Forward computation — used at CHECKOUT time only.
 * Everything else reads stored values via getBookingFinancials().
 */
export function computeBookingFinancials(
  pricePerDay: number,
  days: number,
  printFee = 0
): BookingFinancials {
  const subtotal = round2(pricePerDay * days)
  const feeBase = round2(subtotal + printFee)
  const buyerFee = round2(feeBase * BUYER_FEE_PCT)
  const sellerFee = round2(feeBase * SELLER_FEE_PCT)
  return {
    pricePerDay,
    days,
    subtotal,
    printFee: round2(printFee),
    buyerFee,
    sellerFee,
    advertiserTotal: round2(feeBase + buyerFee),
    hostPayout: round2(feeBase - sellerFee),
    platformRevenue: round2(buyerFee + sellerFee),
    isLegacy: false,
  }
}

/** Minimal booking row shape needed for money display. Add these fields to your select(). */
export interface BookingMoneyRow {
  total_price: number | null
  subtotal?: number | null
  buyer_fee?: number | null
  seller_fee?: number | null
  print_fee_charged?: number | null
  payout_amount?: number | null
  start_date?: string | null
  end_date?: string | null
}

/**
 * THE canonical reader. Prefers stored itemized columns; falls back to the
 * legacy derivation for old bookings. All receipts/cards/emails go through here.
 */
export function getBookingFinancials(b: BookingMoneyRow): BookingFinancials {
  const printFee = round2(Number(b.print_fee_charged ?? 0) || 0)
  const days =
    b.start_date && b.end_date ? bookingDays(b.start_date, b.end_date) : null

  // ── New path: stored itemized amounts ────────────────────────────────────
  if (b.subtotal != null && b.buyer_fee != null && b.seller_fee != null) {
    const subtotal = round2(Number(b.subtotal))
    const buyerFee = round2(Number(b.buyer_fee))
    const sellerFee = round2(Number(b.seller_fee))
    const feeBase = round2(subtotal + printFee)
    return {
      pricePerDay: days ? round2(subtotal / days) : null,
      days,
      subtotal,
      printFee,
      buyerFee,
      sellerFee,
      advertiserTotal:
        b.total_price != null ? round2(Number(b.total_price)) : round2(feeBase + buyerFee),
      hostPayout:
        b.payout_amount != null ? round2(Number(b.payout_amount)) : round2(feeBase - sellerFee),
      platformRevenue: round2(buyerFee + sellerFee),
      isLegacy: false,
    }
  }

  // ── Legacy path: derive under the OLD model (buyer fee on subtotal only) ──
  const total = round2(Number(b.total_price ?? 0))
  const subtotal = round2((total - printFee) / (1 + BUYER_FEE_PCT))
  const buyerFee = round2(total - printFee - subtotal)
  const sellerFee = round2(subtotal * SELLER_FEE_PCT)
  return {
    pricePerDay: days ? round2(subtotal / days) : null,
    days,
    subtotal,
    printFee,
    buyerFee,
    sellerFee,
    advertiserTotal: total,
    hostPayout:
      b.payout_amount != null
        ? round2(Number(b.payout_amount))
        : round2(subtotal - sellerFee + printFee),
    platformRevenue: round2(buyerFee + sellerFee),
    isLegacy: true,
  }
}

// ─── Dates — timezone-safe helpers ──────────────────────────────────────────
// Booking dates are stored as 'YYYY-MM-DD'. `new Date('YYYY-MM-DD')` parses as
// UTC midnight and shifts a day backward in US timezones. ALWAYS parse local.

export function parseBookingDate(d: string): Date {
  return new Date(d + 'T00:00:00')
}

/**
 * Today as 'YYYY-MM-DD' in the USER'S LOCAL timezone.
 * NEVER use `new Date().toISOString().split('T')[0]` for "today" in client code —
 * after 5pm PDT that returns TOMORROW (UTC has rolled over), which shifted
 * calendar "today" markers, min-dates, and status buckets by one day
 * (root cause of the Aug 22 off-by-one booking-dates bug, CF-40237D).
 */
export function todayLocalStr(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

/** Format any local Date object as 'YYYY-MM-DD' (local parts, never UTC). */
export function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Canonical day count — INCLUSIVE of the end date (Michael's call, Aug 23 2026):
 * campaigns run THROUGH the end date, so Aug 24 → Aug 26 = 3 days.
 * days = calendar difference + 1, min 1 (same-day booking = 1 day).
 * Every surface (booking sheet, checkout, receipts, earnings) must agree.
 * NOTE: legacy bookings were charged under the old exclusive count; their
 * stored money amounts are untouched — only the displayed day count/day rate
 * derivation shifts.
 */
export function bookingDays(start: string, end: string): number {
  const ms = parseBookingDate(end).getTime() - parseBookingDate(start).getTime()
  return Math.max(1, Math.round(ms / 86_400_000) + 1)
}

export function formatBookingDate(
  d: string,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
): string {
  return parseBookingDate(d).toLocaleDateString('en-US', opts)
}
