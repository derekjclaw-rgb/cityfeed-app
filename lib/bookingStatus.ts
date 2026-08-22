/**
 * lib/bookingStatus.ts — SINGLE SOURCE OF TRUTH for booking display status.
 *
 * Every UI surface (dashboard tiles, bookings list, booking detail, My Campaigns)
 * must derive status through this module so shipping states, creative upload
 * states, and date-based states all agree.
 *
 * Two delivery paths:
 *   HOST PRINTS:     Awaiting creative → Creative uploaded → (POP → Complete)
 *   SHIP / DROP-OFF: Awaiting materials → Shipped/Dropped off → Received → (POP → Complete)
 */

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface BookingStatusInput {
  status: string
  start_date: string
  end_date: string
  delivery_mode?: 'self_deliver' | 'host_prints' | null
  shipped_at?: string | null
  received_at?: string | null
  dropped_off_at?: string | null
  hasCreativeFiles?: boolean
  requires_print?: boolean
}

export interface DerivedStatus {
  /** Machine key */
  key: string
  /** Short user-facing label */
  label: string
  /** Descriptive hint (for callouts / hints) */
  hint: string
  /** Background color */
  bg: string
  /** Text color */
  text: string
  /** Grouping bucket for list views */
  group: 'needs_action' | 'live' | 'upcoming' | 'completed' | 'cancelled' | 'in_progress'
}

// ─── Core Helpers ──────────────────────────────────────────────────────────────

export function isLive(status: string, startDate: string, endDate: string): boolean {
  const now = new Date()
  const end = endDate ? new Date(endDate + 'T23:59:59') : null
  const start = startDate ? new Date(startDate + 'T00:00:00') : null
  void start
  // LIVE = proof of posting exists (submitted or approved) and campaign hasn't ended.
  // POP before start_date still counts — the ad is physically up, so it IS live
  // (early posting is common and a feature, not a bug).
  // confirmed/active without POP are NEVER live — the ad may not actually be up.
  // (Fixed 2026-08-22: previously any confirmed booking inside its date range showed LIVE.)
  return ['completed', 'pop_pending', 'pop_review'].includes(status) && !!(end && now <= end)
}

/** Campaign window has started (start_date reached). */
export function windowStarted(startDate: string): boolean {
  const start = startDate ? new Date(startDate + 'T00:00:00') : null
  return !!(start && new Date() >= start)
}

/** Campaign window has fully ended (end_date passed). */
export function windowEnded(endDate: string): boolean {
  const end = endDate ? new Date(endDate + 'T23:59:59') : null
  return !!(end && new Date() > end)
}

export function isComplete(status: string, endDate: string): boolean {
  if (status !== 'completed') return false
  const end = endDate ? new Date(endDate + 'T00:00:00') : null
  return !!(end && new Date() > end)
}

export function isFuture(status: string, startDate: string): boolean {
  if (!['confirmed', 'pending', 'active'].includes(status)) return false
  const start = startDate ? new Date(startDate + 'T00:00:00') : null
  return !!(start && new Date() < start)
}

// ─── Advertiser Status ─────────────────────────────────────────────────────────

export function getAdvertiserStatus(b: BookingStatusInput): DerivedStatus {
  const { status, start_date, end_date, delivery_mode, shipped_at, dropped_off_at, received_at, hasCreativeFiles } = b

  // Terminal states
  if (status === 'cancelled') return { key: 'cancelled', label: 'Cancelled', hint: 'This booking was cancelled.', bg: '#fef2f2', text: '#dc2626', group: 'cancelled' }
  if (status === 'disputed') return { key: 'disputed', label: 'Disputed', hint: 'Under review by City Feed.', bg: '#fef2f2', text: '#dc2626', group: 'cancelled' }

  // Date-based overrides
  if (isLive(status, start_date, end_date)) return { key: 'live', label: 'LIVE', hint: 'Your campaign is live.', bg: '#dcfce7', text: '#15803d', group: 'live' }
  if (isComplete(status, end_date)) return { key: 'completed', label: 'Complete', hint: 'Campaign complete — leave a review.', bg: '#f0fdf4', text: '#16a34a', group: 'completed' }

  // Pending host approval
  if (status === 'pending') return { key: 'pending', label: 'Pending Review', hint: 'Awaiting host approval.', bg: '#fef9ec', text: '#b45309', group: 'needs_action' }

  // POP states
  if (['pop_pending', 'pop_review'].includes(status)) return { key: 'pop_submitted', label: 'Proof Submitted', hint: 'Proof of posting submitted — under review.', bg: '#f0f8f5', text: '#2b6b5e', group: 'in_progress' }

  // Campaign window started but no proof of posting yet
  if (['confirmed', 'active'].includes(status) && windowStarted(start_date)) {
    if (windowEnded(end_date)) return { key: 'pop_missing_ended', label: 'Ended — No Proof', hint: 'Campaign window ended without proof of posting. Contact support if the ad was never posted.', bg: '#fef2f2', text: '#dc2626', group: 'needs_action' }
    return { key: 'posting_pending', label: 'Being Posted', hint: 'Campaign window has started — your host is posting the ad. You\u2019ll be notified when proof is uploaded.', bg: '#eff6ff', text: '#1d4ed8', group: 'in_progress' }
  }

  // ── Shipping path (self_deliver) ──
  if (delivery_mode === 'self_deliver') {
    if (received_at) return { key: 'materials_received', label: 'Materials Received', hint: 'Your host confirmed receipt — setup in progress.', bg: '#f0fdf4', text: '#16a34a', group: 'upcoming' }
    if (shipped_at || dropped_off_at) return { key: 'materials_shipped', label: shipped_at ? 'Materials Shipped' : 'Dropped Off', hint: 'Materials shipped — awaiting host receipt.', bg: '#eff6ff', text: '#1d4ed8', group: 'upcoming' }
    return { key: 'awaiting_materials', label: 'Ship Materials', hint: 'Ship or drop off your printed materials.', bg: '#fef9ec', text: '#b45309', group: 'needs_action' }
  }

  // ── Host-print path ──
  if (delivery_mode === 'host_prints') {
    if (hasCreativeFiles) return { key: 'creative_received', label: 'Creative Submitted', hint: 'Creative submitted — your host will print and install.', bg: '#f0fdf4', text: '#16a34a', group: 'upcoming' }
    return { key: 'awaiting_creative', label: 'Upload Creative', hint: 'Upload your creative files so your host can print them.', bg: '#fef9ec', text: '#b45309', group: 'needs_action' }
  }

  // ── No delivery mode chosen yet (requires_print listings) ──
  if (b.requires_print && !delivery_mode) {
    return { key: 'choose_delivery', label: 'Choose Delivery', hint: 'Choose how your materials will arrive.', bg: '#fef9ec', text: '#b45309', group: 'needs_action' }
  }

  // ── Default (non-print listings or host_prints not chosen yet) ──
  if (hasCreativeFiles) return { key: 'creative_received', label: 'Creative Submitted', hint: 'Creative submitted — awaiting host setup.', bg: '#f0fdf4', text: '#16a34a', group: 'upcoming' }
  if (['confirmed', 'active'].includes(status)) return { key: 'awaiting_creative', label: 'Upload Creative', hint: 'Upload your creative files.', bg: '#fef9ec', text: '#b45309', group: 'needs_action' }

  return { key: status, label: status, hint: '', bg: '#f8f8f5', text: '#888', group: 'in_progress' }
}

// ─── Host Status ───────────────────────────────────────────────────────────────

export function getHostStatus(b: BookingStatusInput): DerivedStatus {
  const { status, start_date, end_date, delivery_mode, shipped_at, dropped_off_at, received_at, hasCreativeFiles } = b

  // Terminal states
  if (status === 'cancelled') return { key: 'cancelled', label: 'Cancelled', hint: 'This booking was cancelled.', bg: '#fef2f2', text: '#dc2626', group: 'cancelled' }
  if (status === 'disputed') return { key: 'disputed', label: 'Disputed', hint: 'Under review by City Feed.', bg: '#fef2f2', text: '#dc2626', group: 'cancelled' }

  // Date-based overrides
  if (isLive(status, start_date, end_date)) return { key: 'live', label: 'LIVE', hint: 'Campaign is live.', bg: '#dcfce7', text: '#15803d', group: 'live' }
  if (isComplete(status, end_date)) return { key: 'completed', label: 'Complete', hint: 'Campaign complete — payout processed.', bg: '#f0fdf4', text: '#16a34a', group: 'completed' }

  // Pending host approval
  if (status === 'pending') return { key: 'pending', label: 'Review Request', hint: 'New booking request — accept or decline.', bg: '#fef9ec', text: '#b45309', group: 'needs_action' }

  // POP states
  if (['pop_pending', 'pop_review'].includes(status)) return { key: 'pop_submitted', label: 'Proof Submitted', hint: 'Proof of posting submitted — payout incoming.', bg: '#f0f8f5', text: '#2b6b5e', group: 'in_progress' }

  // Campaign window started but no proof of posting yet — host must act NOW
  if (['confirmed', 'active'].includes(status) && windowStarted(start_date)) {
    if (windowEnded(end_date)) return { key: 'pop_missing_ended', label: 'Proof Overdue', hint: 'Campaign window ended without proof of posting — upload it now to receive your payout.', bg: '#fef2f2', text: '#dc2626', group: 'needs_action' }
    return { key: 'post_ad_now', label: 'Post Ad Now', hint: 'Campaign window has started — post the ad and upload proof of posting to get paid.', bg: '#fef9ec', text: '#b45309', group: 'needs_action' }
  }

  // ── Shipping path (self_deliver) ──
  if (delivery_mode === 'self_deliver') {
    if (received_at) return { key: 'materials_received', label: 'Materials Received', hint: 'Materials received — begin installation.', bg: '#f0fdf4', text: '#16a34a', group: 'upcoming' }
    if (shipped_at || dropped_off_at) return { key: 'materials_shipped', label: shipped_at ? 'Materials Shipped' : 'Dropped Off', hint: 'Materials on the way — confirm receipt when they arrive.', bg: '#eff6ff', text: '#1d4ed8', group: 'needs_action' }
    return { key: 'awaiting_materials', label: 'Awaiting Materials', hint: 'Waiting for advertiser to ship or drop off materials.', bg: '#eff6ff', text: '#1d4ed8', group: 'in_progress' }
  }

  // ── Host-print path ──
  if (delivery_mode === 'host_prints') {
    if (hasCreativeFiles) return { key: 'creative_received', label: 'Creative Received', hint: 'Creative files received — print and install.', bg: '#f0fdf4', text: '#16a34a', group: 'needs_action' }
    return { key: 'awaiting_creative', label: 'Awaiting Creative', hint: 'Waiting for advertiser to upload creative files.', bg: '#eff6ff', text: '#1d4ed8', group: 'in_progress' }
  }

  // ── Default (non-print listings) ──
  if (hasCreativeFiles) return { key: 'creative_received', label: 'Creative Received', hint: 'Creative files received — begin setup.', bg: '#f0fdf4', text: '#16a34a', group: 'needs_action' }
  if (['confirmed', 'active'].includes(status)) return { key: 'awaiting_creative', label: 'Awaiting Creative', hint: 'Waiting for creative files from advertiser.', bg: '#eff6ff', text: '#1d4ed8', group: 'in_progress' }

  return { key: status, label: status, hint: '', bg: '#f8f8f5', text: '#888', group: 'in_progress' }
}

// ─── Convenience: pick by role ─────────────────────────────────────────────────

export function getBookingDisplayStatus(b: BookingStatusInput, isHost: boolean): DerivedStatus {
  return isHost ? getHostStatus(b) : getAdvertiserStatus(b)
}

/**
 * Determines whether the advertiser has a pending action.
 * Used by My Campaigns needs-action bucketing.
 */
export function advertiserNeedsAction(b: BookingStatusInput): boolean {
  const s = getAdvertiserStatus(b)
  return s.group === 'needs_action'
}

/**
 * Determines whether the host has a pending action.
 * Used by host dashboard needs-action bucketing.
 */
export function hostNeedsAction(b: BookingStatusInput): boolean {
  const s = getHostStatus(b)
  return s.group === 'needs_action'
}
