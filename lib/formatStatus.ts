/**
 * Shared status formatting helper — converts raw DB status strings to human-readable labels.
 * Import this everywhere a status is shown to the user.
 */

const STATUS_MAP: Record<string, string> = {
  pending: 'Pending Review',
  confirmed: 'Confirmed',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  pop_pending: 'Awaiting Proof of Posting',
  pop_review: 'Proof of Posting Under Review',
  disputed: 'Disputed',
  pending_payment: 'Pending Payment',
  // Listing statuses
  inactive: 'Paused',
  rejected: 'Rejected',
}

export function formatStatus(status: string): string {
  return STATUS_MAP[status] ?? status
}
