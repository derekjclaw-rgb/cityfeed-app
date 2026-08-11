/**
 * Financial calculation helpers for the admin dashboard.
 * Delegates to lib/fees.ts — the SINGLE SOURCE OF TRUTH for money math.
 * Admin queries must select: total_price, subtotal, buyer_fee, seller_fee,
 * print_fee_charged, payout_amount (+ start_date/end_date for day counts).
 */
import { getBookingFinancials, round2, parseBookingDate, type BookingMoneyRow } from './fees'

export function calcFinancials(booking: BookingMoneyRow) {
  const fin = getBookingFinancials(booking)
  const totalPrice = fin.advertiserTotal
  const stripeFeeEstimate = round2(totalPrice * 0.029 + 0.30)
  const platformTake = round2(totalPrice - fin.hostPayout)
  const netPlatformProfit = round2(platformTake - stripeFeeEstimate)

  return {
    totalPrice,
    subtotal: fin.subtotal,
    printFee: fin.printFee,
    buyerFee: fin.buyerFee,
    sellerFee: fin.sellerFee,
    stripeFeeEstimate,
    hostPayout: fin.hostPayout,
    platformTake,
    netPlatformProfit,
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateStr: string): string {
  // Date-only strings ('YYYY-MM-DD') must parse as LOCAL midnight or they
  // render a day early in US timezones. Timestamps parse normally.
  const d = dateStr.includes('T') ? new Date(dateStr) : parseBookingDate(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function shortId(uuid: string): string {
  return 'CF-' + uuid.replace(/-/g, '').substring(0, 6).toUpperCase()
}
