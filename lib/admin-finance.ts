/**
 * Financial calculation helpers for the admin dashboard.
 * Single source of truth for fee math.
 */

export function calcFinancials(totalPrice: number, payoutAmount?: number | null) {
  const subtotal = Math.round((totalPrice / 1.07) * 100) / 100
  const buyerFee = Math.round(subtotal * 0.07 * 100) / 100
  const sellerFee = Math.round(subtotal * 0.07 * 100) / 100
  const stripeFeeEstimate = Math.round((totalPrice * 0.029 + 0.30) * 100) / 100
  const hostPayout = payoutAmount ?? Math.round((subtotal - sellerFee) * 100) / 100
  const platformTake = Math.round((totalPrice - hostPayout) * 100) / 100
  const netPlatformProfit = Math.round((platformTake - stripeFeeEstimate) * 100) / 100

  return {
    totalPrice,
    subtotal,
    buyerFee,
    sellerFee,
    stripeFeeEstimate,
    hostPayout,
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
  return new Date(dateStr).toLocaleDateString('en-US', {
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
