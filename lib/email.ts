/**
 * Email notification utility
 * MVP: logs events to console. Wire to SendGrid/Resend in Phase 4.
 */

type EmailEvent =
  | { type: 'new_booking_request'; hostEmail: string; listingTitle: string; advertiserName: string; dates: string; total: number }
  | { type: 'booking_confirmed'; advertiserEmail: string; listingTitle: string; dates: string; total: number }
  | { type: 'pop_submitted'; advertiserEmail: string; listingTitle: string; bookingId: string }
  | { type: 'pop_approved'; hostEmail: string; listingTitle: string; amount: number }

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
  }
}
