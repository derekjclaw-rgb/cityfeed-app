/**
 * Email notification utility
 * MVP: logs events to console.
 * Wire to Resend when email provider is configured:
 *   import { Resend } from 'resend'
 *   const resend = new Resend(process.env.RESEND_API_KEY)
 *   await resend.emails.send({ from: 'noreply@cityfeed.io', to: ..., subject: ..., html: ... })
 */

type EmailEvent =
  | { type: 'new_booking_request'; hostEmail: string; listingTitle: string; advertiserName: string; dates: string; total: number }
  | { type: 'booking_confirmed'; advertiserEmail: string; listingTitle: string; dates: string; total: number }
  | { type: 'pop_submitted'; advertiserEmail: string; listingTitle: string; bookingId: string }
  | { type: 'pop_approved'; hostEmail: string; listingTitle: string; amount: number }
  // Phase 5b: 48-hour collateral reminder
  // Wire to Resend when email provider is configured
  | { type: 'collateral_reminder'; advertiserEmail: string; listingTitle: string; bookingId: string; campaignStartDate: string }

export function sendEmail(event: EmailEvent): void {
  switch (event.type) {
    case 'new_booking_request':
      console.log(`[EMAIL] → ${event.hostEmail}
Subject: New booking request for "${event.listingTitle}"
Body: ${event.advertiserName} has requested to book your listing for ${event.dates}. Total: $${event.total}.
Action: Log in to City Feed to approve or decline.`)
      break

    case 'booking_confirmed':
      console.log(`[EMAIL] → ${event.advertiserEmail}
Subject: Your booking is confirmed — "${event.listingTitle}"
Body: Great news! Your booking for ${event.dates} has been confirmed. Total charged: $${event.total}.
Action: Log in to City Feed to view booking details.`)
      break

    case 'pop_submitted':
      console.log(`[EMAIL] → ${event.advertiserEmail}
Subject: Proof of Performance submitted for "${event.listingTitle}"
Body: The host has submitted proof of performance for booking #${event.bookingId}.
Action: Log in to City Feed to review and approve.`)
      break

    case 'pop_approved':
      console.log(`[EMAIL] → ${event.hostEmail}
Subject: POP approved — payout incoming for "${event.listingTitle}"
Body: The advertiser has approved your proof of performance. Your payout of $${event.amount} is being processed.`)
      break

    // Phase 5b — 48-hour collateral reminder
    // Wire to Resend when email provider is configured
    case 'collateral_reminder':
      console.log(`[EMAIL] → ${event.advertiserEmail}
Subject: Reminder: Upload your collateral for "${event.listingTitle}"
Body: Your campaign starts ${event.campaignStartDate}. Please upload your creative files for booking #${event.bookingId} so the host can begin setup.
Action: Log in to City Feed → Dashboard → Bookings to upload your files.
[TODO: Wire to Resend when email provider is configured]`)
      break
  }
}
