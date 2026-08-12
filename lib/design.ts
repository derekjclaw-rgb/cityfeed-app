/**
 * Design System Constants — City Feed V2
 * Single source of truth for colors, styles, and status configs.
 * Use these instead of hardcoded hex values.
 */

// ─── Status Configurations ─────────────────────────────────────────────────────

export const STATUS_STYLES: Record<string, React.CSSProperties> = {
  pending: { backgroundColor: 'var(--gold-light, #f5edda)', color: 'var(--gold-dark, #c9a54e)', border: '1px solid rgba(222,187,115,0.3)' },
  confirmed: { backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe' },
  active: { backgroundColor: 'rgba(126,207,192,0.1)', color: 'var(--mint, #7ecfc0)', border: '1px solid rgba(126,207,192,0.3)' },
  pop_pending: { backgroundColor: '#f0f8f5', color: '#2b6b5e', border: '1px solid #e8f5f3' },
  pop_review: { backgroundColor: '#f0f8f5', color: '#2b6b5e', border: '1px solid #e8f5f3' },
  completed: { backgroundColor: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7' },
  cancelled: { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
  disputed: { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
  inactive: { backgroundColor: 'var(--light-gray, #f8f8f5)', color: 'var(--text-secondary, #888)', border: '1px solid var(--border, #e0e0d8)' },
  rejected: { backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
}

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  pending_payment: 'Pending Payment',
  confirmed: 'Confirmed',
  active: 'Active',
  pop_pending: 'Proof Submitted',
  pop_review: 'Under Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
  inactive: 'Paused',
  rejected: 'Rejected',
}

// ─── Shared Style Objects ───────────────────────────────────────────────────────

export const cardStyle: React.CSSProperties = {
  backgroundColor: 'var(--white, #fff)',
  border: '1px solid var(--border, #e0e0d8)',
  boxShadow: 'var(--shadow-sm, 0 1px 4px rgba(0,0,0,0.05))',
  borderRadius: 'var(--radius-md, 16px)',
}

export const inputStyle: React.CSSProperties = {
  backgroundColor: 'var(--light-gray, #f8f8f5)',
  border: '1px solid var(--border, #e0e0d8)',
  color: 'var(--charcoal, #2b2b2b)',
  borderRadius: '12px',
  padding: '10px 16px',
  fontSize: '14px',
  width: '100%',
  outline: 'none',
}

export const pageBg: React.CSSProperties = {
  backgroundColor: 'var(--cream, #f0f0ec)',
}

export const ctaStyle: React.CSSProperties = {
  backgroundColor: 'var(--gold, #debb73)',
  color: 'var(--charcoal, #2b2b2b)',
  boxShadow: '0 4px 16px rgba(222,187,115,0.3)',
}

export const ctaSecondaryStyle: React.CSSProperties = {
  backgroundColor: 'var(--mint, #7ecfc0)',
  color: '#fff',
}

export const dangerStyle: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  color: '#dc2626',
  border: '1px solid #fecaca',
}

// ─── Color References (for inline use where CSS vars don't work) ────────────────

export const colors = {
  charcoal: 'var(--charcoal, #2b2b2b)',
  cream: 'var(--cream, #f0f0ec)',
  mint: 'var(--mint, #7ecfc0)',
  mintDark: 'var(--mint-dark, #5bb8a8)',
  gold: 'var(--gold, #debb73)',
  goldDark: 'var(--gold-dark, #c9a54e)',
  goldLight: 'var(--gold-light, #f5edda)',
  white: 'var(--white, #fff)',
  border: 'var(--border, #e0e0d8)',
  lightGray: 'var(--light-gray, #f8f8f5)',
  textSecondary: 'var(--text-secondary, #888)',
  textTertiary: 'var(--text-tertiary, #9a9a90)',
  red: '#dc2626',
  green: '#16a34a',
  blue: '#1d4ed8',
}

// ─── Category Labels ────────────────────────────────────────────────────────────

/** Canonical raw-value → display-label map for all listing categories */
export const CATEGORY_LABELS: Record<string, string> = {
  digital_billboards: 'Digital Billboard',
  static_billboards: 'Static Billboard',
  billboard: 'Billboard',
  transit: 'Transit',
  outdoor_static: 'Outdoor Static',
  outdoor_digital: 'Outdoor Digital',
  display_on_premise: 'Display On-Premise',
  event_based: 'Event-Based',
  human_based: 'Human-Based',
  experiential: 'Experiential',
  indoor_digital: 'Indoor Digital',
  indoor_static: 'Indoor Static',
  street_furniture: 'Street Furniture',
  unique: 'Unique',
  storefront: 'Storefront',
  window: 'Window Display',
  vehicle_wrap: 'Vehicle Wrap',
  other: 'Other',
  // Legacy (no longer in create forms but may exist in DB)
  digital_screen: 'Digital Screen',
  event_space: 'Event Space',
}

/** Get human-readable label for a category value. Falls back to title-casing the raw value. */
export function getCategoryLabel(raw: string): string {
  return CATEGORY_LABELS[raw] ?? raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Active category options for forms and filters (value = raw DB key, label = display) */
export const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: 'digital_billboards', label: 'Digital Billboard' },
  { value: 'static_billboards', label: 'Static Billboard' },
  { value: 'billboard', label: 'Billboard' },
  { value: 'transit', label: 'Transit' },
  { value: 'outdoor_static', label: 'Outdoor Static' },
  { value: 'outdoor_digital', label: 'Outdoor Digital' },
  { value: 'display_on_premise', label: 'Display On-Premise' },
  { value: 'event_based', label: 'Event-Based' },
  { value: 'human_based', label: 'Human-Based' },
  { value: 'experiential', label: 'Experiential' },
  { value: 'indoor_digital', label: 'Indoor Digital' },
  { value: 'indoor_static', label: 'Indoor Static' },
  { value: 'street_furniture', label: 'Street Furniture' },
  { value: 'unique', label: 'Unique' },
  { value: 'storefront', label: 'Storefront' },
  { value: 'window', label: 'Window Display' },
  { value: 'vehicle_wrap', label: 'Vehicle Wrap' },
  { value: 'other', label: 'Other' },
]

// ─── Notification Icons ─────────────────────────────────────────────────────────

export const NOTIF_ICONS: Record<string, string> = {
  new_booking: '📋',
  booking_confirmed: '✅',
  booking_approved: '✅',
  booking_cancelled: '❌',
  new_message: '💬',
  collateral_uploaded: '📎',
  pop_submitted: '📸',
  pop_approved: '🎉',
  materials_received: '📦',
}
