/**
 * Global feature flags
 *
 * NEXT_PUBLIC_SHOW_MOCK_DATA=true  → mock/demo listings shown in marketplace
 * NEXT_PUBLIC_SHOW_MOCK_DATA=false → only real Supabase data (production mode)
 *
 * Toggle via Vercel env vars to switch between demo and live modes without code changes.
 */
export const SHOW_MOCK_DATA = process.env.NEXT_PUBLIC_SHOW_MOCK_DATA === 'true'

/**
 * Platform fee percentages
 */
export const BUYER_FEE_PCT = 0.07   // 7% added to advertiser total
export const SELLER_FEE_PCT = 0.07  // 7% deducted from host payout

/**
 * Cancellation policy
 */
export const CANCEL_FULL_REFUND_DAYS = 7     // Days before start for full refund
export const CANCEL_PROCESSING_FEE = 0.05    // 5% kept for processing
export const CANCEL_HALF_REFUND_PCT = 0.5    // 50% refund within window
