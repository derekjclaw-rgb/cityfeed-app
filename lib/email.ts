/**
 * Email notification utility — nodemailer SMTP via Gmail
 * SMTP: smtp.gmail.com:465 (SSL)
 * User: hello@cityfeed.io
 * App Password: sweu xtsj gktz mgqr
 */

import nodemailer from 'nodemailer'

// Create transporter lazily so it only initializes in server context
let transporter: ReturnType<typeof nodemailer.createTransport> | null = null

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL
      auth: {
        user: process.env.SMTP_USER || 'hello@cityfeed.io',
        pass: process.env.SMTP_PASS || 'sweu xtsj gktz mgqr',
      },
    })
  }
  return transporter
}

const FROM = 'City Feed <hello@cityfeed.io>'
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://cityfeed.io'

/** Derive a human-readable confirmation code from a booking UUID */
function confirmationCode(bookingId: string): string {
  return 'CF-' + bookingId.replace(/-/g, '').substring(0, 6).toUpperCase()
}

/** Format a full name as 'First L.' for privacy */
export function formatNamePrivacy(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return parts[0] || fullName
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

/** Format a date string like '2026-04-13' as 'Apr 13' */
function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Format a date range string like '2026-04-13 → 2026-04-15' as 'Apr 13 → Apr 15' */
function formatDateRange(dates: string): string {
  const parts = dates.split('→').map(s => s.trim())
  if (parts.length === 2) {
    return `${formatDateShort(parts[0])} → ${formatDateShort(parts[1])}`
  }
  return dates
}

export type EmailEvent =
  | { type: 'new_booking_request'; hostEmail: string; listingTitle: string; advertiserName: string; dates: string; total: number; platformFee: number; bookingId?: string; isStatic?: boolean; hostPrints?: boolean }
  | { type: 'new_booking_instant'; hostEmail: string; listingTitle: string; advertiserName: string; dates: string; total: number; platformFee: number; bookingId?: string; isStatic?: boolean; hostPrints?: boolean }
  | { type: 'booking_confirmed'; advertiserEmail: string; listingTitle: string; dates: string; total: number; bookingId?: string; isStatic?: boolean; hostPrints?: boolean; listingImage?: string }
  | { type: 'booking_cancelled'; recipientEmail: string; listingTitle: string; dates: string; role: 'host' | 'advertiser'; bookingId?: string }
  | { type: 'booking_request_submitted'; advertiserEmail: string; listingTitle: string; dates: string; total: number; bookingId?: string }
  | { type: 'booking_approved_advertiser'; advertiserEmail: string; listingTitle: string; dates: string; bookingId: string }
  | { type: 'creative_submitted_advertiser'; advertiserEmail: string; listingTitle: string; bookingId: string; dates?: string; hostPrints?: boolean; isStatic?: boolean }
  | { type: 'collateral_uploaded'; hostEmail: string; listingTitle: string; advertiserName: string; bookingId: string; dates?: string; hostPrints?: boolean }
  | { type: 'pop_submitted'; advertiserEmail: string; listingTitle: string; bookingId: string; dates?: string; popPhotoUrl?: string }
  | { type: 'pop_approved'; hostEmail: string; listingTitle: string; amount: number; bookingId?: string; dates?: string }
  | { type: 'pop_submitted_host'; hostEmail: string; listingTitle: string; bookingId: string; dates?: string; amount?: number }
  | { type: 'collateral_reminder'; advertiserEmail: string; listingTitle: string; bookingId: string; campaignStartDate: string }
  | { type: 'pop_reminder_morning'; hostEmail: string; listingTitle: string; bookingId: string }
  | { type: 'listing_published'; hostEmail: string; listingTitle: string; listingId: string; listingImage?: string; pricePerDay?: number }
  | { type: 'materials_shipped'; hostEmail: string; listingTitle: string; advertiserName: string; bookingId: string; trackingNumber?: string; isDropOff?: boolean; dates?: string }
  | { type: 'materials_received'; advertiserEmail: string; listingTitle: string; bookingId: string; dates?: string }
  | { type: 'materials_shipped_confirm'; advertiserEmail: string; listingTitle: string; bookingId: string; isDropOff?: boolean; trackingNumber?: string; dates?: string }
  | { type: 'materials_received_host'; hostEmail: string; listingTitle: string; bookingId: string; startDate?: string; dates?: string }

export async function sendEmail(event: EmailEvent): Promise<void> {
  const mailer = getTransporter()

  try {
    switch (event.type) {
      case 'new_booking_request': {
        // total = subtotal + buyerFee (both 7% of subtotal)
        // platformFee passed here is buyer+seller combined — derive subtotal correctly
        const subtotal = Math.round(event.total / 1.07 * 100) / 100
        const sellerFee = Math.round(subtotal * 0.07 * 100) / 100
        const payout = Math.round((subtotal - sellerFee) * 100) / 100
        const prettyDates = formatDateRange(event.dates)
        const privacyName = formatNamePrivacy(event.advertiserName)
        await mailer.sendMail({
          from: FROM,
          to: event.hostEmail,
          subject: `New booking request for "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">New Booking Request</h2>
            <p style="color:#555;margin:0 0 12px"><strong>${privacyName}</strong> has requested to book your listing.</p>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              <p style="margin:0 0 4px;color:#888">Dates: ${prettyDates}</p>
              <p style="margin:0 0 4px;color:#888">Subtotal: <strong style="color:#2b2b2b">$${subtotal.toFixed(2)}</strong></p>
              <p style="margin:0 0 4px;color:#888">City Feed fee (7%): <strong style="color:#dc2626">-$${sellerFee.toFixed(2)}</strong></p>
              <p style="margin:0;color:#888">Your expected payout: <strong style="color:#16a34a">$${payout.toFixed(2)}</strong></p>
            </div>
            <p style="color:#555;margin:0 0 20px">${event.hostPrints ? 'The advertiser paid the print fee — they\u2019ll upload creative files and you\u2019ll print and install.' : event.isStatic ? 'The advertiser will coordinate material delivery with you.' : 'Once confirmed, creative files will be uploaded by the advertiser.'} Log in to review and accept or decline this booking.</p>
            <a href="${BASE_URL}/dashboard/bookings${event.bookingId ? `/${event.bookingId}` : ''}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">Review Booking →</a>
          `),
        })
        break
      }

      case 'new_booking_instant': {
        const subtotal = Math.round(event.total / 1.07 * 100) / 100
        const sellerFee = Math.round(subtotal * 0.07 * 100) / 100
        const payout = Math.round((subtotal - sellerFee) * 100) / 100
        const prettyDates = formatDateRange(event.dates)
        const privacyName = formatNamePrivacy(event.advertiserName)
        await mailer.sendMail({
          from: FROM,
          to: event.hostEmail,
          subject: `New booking — "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">New Booking 🎉</h2>
            <p style="color:#555;margin:0 0 12px"><strong>${privacyName}</strong> has booked your listing.</p>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              <p style="margin:0 0 4px;color:#888">Dates: ${prettyDates}</p>
              <p style="margin:0 0 4px;color:#888">Subtotal: <strong style="color:#2b2b2b">$${subtotal.toFixed(2)}</strong></p>
              <p style="margin:0 0 4px;color:#888">City Feed fee (7%): <strong style="color:#dc2626">-$${sellerFee.toFixed(2)}</strong></p>
              <p style="margin:0;color:#888">Your expected payout: <strong style="color:#16a34a">$${payout.toFixed(2)}</strong></p>
            </div>
            <p style="color:#555;margin:0 0 20px">${event.hostPrints ? 'The advertiser paid the print fee — they\u2019ll upload creative files and you\u2019ll print and install.' : event.isStatic ? 'The advertiser will coordinate material delivery with you.' : 'The advertiser will upload their creative files shortly.'}</p>
            <a href="${BASE_URL}/dashboard/bookings${event.bookingId ? `/${event.bookingId}` : ''}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking →</a>
          `),
        })
        break
      }

      case 'booking_confirmed':
        await mailer.sendMail({
          from: FROM,
          to: event.advertiserEmail,
          subject: `Your booking is confirmed — "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Booking Confirmed! 🎉</h2>
            ${event.bookingId ? `<p style="font-family:monospace;font-size:14px;font-weight:700;color:#7ecfc0;margin:0 0 12px;letter-spacing:0.05em">${confirmationCode(event.bookingId)}</p>` : ''}
            <p style="color:#555;margin:0 0 12px">Great news — your booking has been confirmed.</p>
            ${event.listingImage ? `<img src="${event.listingImage}" alt="${event.listingTitle}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:12px;margin:0 0 4px" />` : ''}
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              <p style="margin:0 0 4px;color:#888">Dates: ${formatDateRange(event.dates)}</p>
              <p style="margin:0;color:#888">Total charged: <strong style="color:#2b2b2b">$${event.total.toLocaleString()}</strong></p>
            </div>
            <p style="color:#555;margin:0 0 8px"><strong>Next steps:</strong></p>
            ${event.hostPrints ? `
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">Upload your creative files — your host will print and install them</li>
              <li style="margin-bottom:6px">Your print fee is included in the total</li>
              <li>You'll receive proof of posting when your ad goes live</li>
            </ol>` : event.isStatic ? `
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">Prepare your printed materials to match the creative specs</li>
              <li style="margin-bottom:6px">Coordinate delivery timing with your host via messenger</li>
              <li>You'll receive proof of posting when your ad goes live</li>
            </ol>` : `
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">Upload your creative files in the booking dashboard</li>
              <li style="margin-bottom:6px">The host will review and begin setup</li>
              <li>You'll receive proof of posting when your ad goes live</li>
            </ol>`}
            <a href="${BASE_URL}/dashboard/bookings${event.bookingId ? `/${event.bookingId}` : ''}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking →</a>
          `),
        })
        break

      case 'booking_request_submitted': {
        await mailer.sendMail({
          from: FROM,
          to: event.advertiserEmail,
          subject: `Booking request submitted — "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Booking Request Submitted ⏳</h2>
            ${event.bookingId ? `<p style="font-family:monospace;font-size:14px;font-weight:700;color:#7ecfc0;margin:0 0 12px;letter-spacing:0.05em">${confirmationCode(event.bookingId)}</p>` : ''}
            <p style="color:#555;margin:0 0 12px">Your request has been submitted and is awaiting host approval.</p>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              <p style="margin:0 0 4px;color:#888">Dates: ${formatDateRange(event.dates)}</p>
              <p style="margin:0;color:#888">Total: <strong style="color:#2b2b2b">$${event.total.toLocaleString()}</strong></p>
            </div>
            <p style="color:#555;margin:0 0 8px"><strong>What happens next:</strong></p>
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">The host will review your request within 24 hours</li>
              <li style="margin-bottom:6px">You'll be notified once the host accepts your booking</li>
              <li>After acceptance, upload your creative files to get started</li>
            </ol>
            <a href="${BASE_URL}/dashboard/bookings${event.bookingId ? `/${event.bookingId}` : ''}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking →</a>
          `),
        })
        break
      }

      case 'booking_approved_advertiser':
        await mailer.sendMail({
          from: FROM,
          to: event.advertiserEmail,
          subject: `✅ Your booking has been accepted — "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Booking Accepted ✅</h2>
            <p style="font-family:monospace;font-size:14px;font-weight:700;color:#7ecfc0;margin:0 0 12px;letter-spacing:0.05em">${confirmationCode(event.bookingId)}</p>
            <p style="color:#555;margin:0 0 12px">The host has accepted your booking request.</p>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              <p style="margin:0;color:#888">Dates: ${formatDateRange(event.dates)}</p>
            </div>
            <p style="color:#555;margin:0 0 8px"><strong>Next steps:</strong></p>
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">Upload your creative/collateral files</li>
              <li style="margin-bottom:6px">Review the creative specs on the booking page</li>
              <li>The host will begin setup once materials are received</li>
            </ol>
            <a href="${BASE_URL}/dashboard/bookings/${event.bookingId}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">Upload Creative →</a>
          `),
        })
        break

      case 'booking_cancelled':
        await mailer.sendMail({
          from: FROM,
          to: event.recipientEmail,
          subject: `Booking cancelled — "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Booking Cancelled</h2>
            <p style="color:#555;margin:0 0 12px">A booking has been cancelled.</p>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              <p style="margin:0;color:#888">Dates: ${formatDateRange(event.dates)}</p>
            </div>
            <a href="${BASE_URL}/dashboard/bookings${event.bookingId ? `/${event.bookingId}` : ''}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking →</a>
          `),
        })
        break

      case 'creative_submitted_advertiser':
        await mailer.sendMail({
          from: FROM,
          to: event.advertiserEmail,
          subject: `Creative files submitted — "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Creative Submitted ✅</h2>
            <p style="font-family:monospace;font-size:14px;font-weight:700;color:#7ecfc0;margin:0 0 12px;letter-spacing:0.05em">${confirmationCode(event.bookingId)}</p>
            <p style="color:#555;margin:0 0 12px">Your creative files have been submitted successfully.</p>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              ${event.dates ? `<p style="margin:0;color:#888">Dates: ${formatDateRange(event.dates)}</p>` : ''}
            </div>
            <p style="color:#555;margin:0 0 8px"><strong>What happens next:</strong></p>
            ${event.hostPrints ? `
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">Your host will print your creative — the print fee is covered</li>
              <li style="margin-bottom:6px">Your host will handle installation</li>
              <li>You'll receive proof of posting when your ad goes live</li>
            </ol>` : event.isStatic ? `
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">Prepare your printed materials to match the creative specs</li>
              <li style="margin-bottom:6px">Coordinate delivery timing with your host via messenger</li>
              <li>You'll receive proof of posting when your ad goes live</li>
            </ol>` : `
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">The host will review your creative files</li>
              <li style="margin-bottom:6px">Setup will begin once materials are received</li>
              <li>You'll receive proof of posting when your ad goes live</li>
            </ol>`}
            <a href="${BASE_URL}/dashboard/bookings/${event.bookingId}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking →</a>
          `),
        })
        break

      case 'collateral_uploaded':
        await mailer.sendMail({
          from: FROM,
          to: event.hostEmail,
          subject: `Creative files uploaded for "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Creative Files Ready 📎</h2>
            <p style="color:#555;margin:0 0 12px"><strong>${formatNamePrivacy(event.advertiserName)}</strong> has uploaded their creative files.</p>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              ${event.dates ? `<p style="margin:4px 0 0;color:#888">Dates: ${formatDateRange(event.dates)}</p>` : ''}
            </div>
            <p style="color:#555;margin:0 0 20px">${event.hostPrints ? 'The advertiser covered the print fee \u2014 print the files and handle installation.' : 'Review the files and begin setup when ready.'}</p>
            <a href="${BASE_URL}/dashboard/bookings/${event.bookingId}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Files →</a>
          `),
        })
        break

      case 'pop_submitted':
        await mailer.sendMail({
          from: FROM,
          to: event.advertiserEmail,
          subject: `Proof of posting submitted for "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Proof of Posting Submitted 📸</h2>
            <p style="color:#555;margin:0 0 12px">The host has submitted proof that your ad is live.</p>
            ${event.popPhotoUrl ? `<img src="${event.popPhotoUrl}" alt="Proof of posting" style="width:100%;max-width:520px;border-radius:12px;display:block;margin:0 0 16px" />` : ''}
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              ${event.dates ? `<p style="margin:4px 0 0;color:#888">Dates: ${formatDateRange(event.dates)}</p>` : ''}
            </div>
            <p style="color:#555;margin:0 0 20px">Your campaign is now active. You can view the proof photos in your booking dashboard.</p>
            <a href="${BASE_URL}/dashboard/bookings/${event.bookingId}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Campaign →</a>
          `),
        })
        break

      case 'pop_approved':
        await mailer.sendMail({
          from: FROM,
          to: event.hostEmail,
          subject: `POP approved — payout incoming for "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">POP Approved 🎉</h2>
            <p style="color:#555;margin:0 0 12px">The advertiser has approved your proof of posting.</p>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              ${event.dates ? `<p style="margin:0 0 4px;color:#888">Dates: ${formatDateRange(event.dates)}</p>` : ''}
              <p style="margin:0;color:#888">Payout amount: <strong style="color:#16a34a">$${event.amount.toLocaleString()}</strong></p>
            </div>
            <p style="color:#555;margin:0 0 20px">Your payout is being processed via Stripe.</p>
            <a href="${BASE_URL}/dashboard/bookings${event.bookingId ? `/${event.bookingId}` : ''}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking →</a>
          `),
        })
        break

      case 'pop_submitted_host': {
        const popEndDate = event.dates?.split('\u2192')[1]?.trim()
        await mailer.sendMail({
          from: FROM,
          to: event.hostEmail,
          subject: `Proof of posting submitted — payout incoming for "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Proof of Posting Submitted ✅</h2>
            <p style="font-family:monospace;font-size:14px;font-weight:700;color:#7ecfc0;margin:0 0 12px;letter-spacing:0.05em">${confirmationCode(event.bookingId)}</p>
            <p style="color:#555;margin:0 0 12px">Your proof of posting for <strong>${event.listingTitle}</strong> has been submitted successfully.</p>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              ${event.dates ? `<p style="margin:0 0 4px;color:#888">Dates: ${formatDateRange(event.dates)}</p>` : ''}
              <p style="margin:0 0 4px;color:#888">Status: <strong style="color:#16a34a">Live</strong></p>
              ${popEndDate ? `<p style="margin:0 0 4px;color:#888">Campaign ends: <strong style="color:#2b2b2b">${formatDateShort(popEndDate)}</strong></p>` : ''}
              ${event.amount != null ? `<p style="margin:0;color:#888">Your payout: <strong style="color:#16a34a">$${event.amount.toFixed(2)}</strong></p>` : ''}
            </div>
            <p style="color:#555;margin:0 0 8px"><strong>What happens next:</strong></p>
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">Your payout is being processed via Stripe</li>
              <li style="margin-bottom:6px">Expect funds within 2 business days</li>
              <li>Track your payout anytime at <a href="${BASE_URL}/dashboard/payouts" style="color:#7ecfc0">your payouts page</a></li>
            </ol>
            <a href="${BASE_URL}/dashboard/bookings/${event.bookingId}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking →</a>
          `),
        })
        break
      }

      case 'pop_reminder_morning':
        await mailer.sendMail({
          from: FROM,
          to: event.hostEmail,
          subject: `📸 Campaign starts today — post the ad for "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">📸 Your Campaign Starts Today</h2>
            <p style="color:#555;margin:0 0 12px">The advertiser has uploaded their creative files and your campaign for <strong>${event.listingTitle}</strong> starts today.</p>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              <p style="margin:0;color:#888">Creative files: <strong style="color:#16a34a">Uploaded ✓</strong></p>
            </div>
            <p style="color:#555;margin:0 0 8px"><strong>What to do:</strong></p>
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">Review the creative files on the booking page</li>
              <li style="margin-bottom:6px">Post the ad at your location</li>
              <li>Upload your proof of posting (photo/video of the ad live)</li>
            </ol>
            <p style="color:#555;margin:0 0 20px">Payout is released once proof of posting is approved.</p>
            <a href="${BASE_URL}/dashboard/bookings/${event.bookingId}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking & Post Ad →</a>
          `),
        })
        break

      case 'collateral_reminder':
        await mailer.sendMail({
          from: FROM,
          to: event.advertiserEmail,
          subject: `Reminder: Upload your creative for "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">⏰ Creative Files Needed</h2>
            <p style="color:#555;margin:0 0 12px">Your campaign starts <strong>${formatDateShort(event.campaignStartDate)}</strong> and we haven't received your creative files yet.</p>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
            </div>
            <p style="color:#555;margin:0 0 20px">Please upload your files so the host can begin setup on time.</p>
            <a href="${BASE_URL}/dashboard/bookings/${event.bookingId}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">Upload Now →</a>
          `),
        })
        break

      case 'materials_shipped': {
        const privacyNameShip = formatNamePrivacy(event.advertiserName)
        const actionLabel = event.isDropOff ? 'dropped off' : 'shipped'
        await mailer.sendMail({
          from: FROM,
          to: event.hostEmail,
          subject: `Materials ${actionLabel} for "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Materials ${event.isDropOff ? 'Dropped Off' : 'Shipped'} 📦</h2>
            <div style="color:#555;margin:0 0 12px"><strong>${privacyNameShip}</strong> has ${actionLabel} their printed materials for your listing.</div>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <div style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></div>
              ${event.dates ? `<div style="margin:0 0 4px;color:#888">Dates: ${formatDateRange(event.dates)}</div>` : ''}
              ${event.trackingNumber ? `<div style="margin:0;color:#888">Tracking: <strong style="color:#2b2b2b">${event.trackingNumber}</strong></div>` : ''}
            </div>
            <div style="color:#555;margin:0 0 20px">${event.isDropOff ? 'Please confirm receipt once you have the materials.' : 'Please confirm receipt once the package arrives.'}</div>
            <a href="${BASE_URL}/dashboard/bookings/${event.bookingId}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking →</a>
          `),
        })
        break
      }

      case 'materials_received':
        await mailer.sendMail({
          from: FROM,
          to: event.advertiserEmail,
          subject: `Your materials arrived — "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Materials Received ✅</h2>
            <div style="color:#555;margin:0 0 12px">Great news — your host has confirmed receipt of your printed materials.</div>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <div style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></div>
              ${event.dates ? `<div style="margin:0;color:#888">Dates: ${formatDateRange(event.dates)}</div>` : ''}
            </div>
            <div style="color:#555;margin:0 0 8px"><strong>What happens next:</strong></div>
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">Your host will install your ad at the placement</li>
              <li style="margin-bottom:6px">You'll receive proof of posting once your ad is live</li>
              <li>Sit back — your campaign is in good hands</li>
            </ol>
            <a href="${BASE_URL}/dashboard/bookings/${event.bookingId}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking →</a>
          `),
        })
        break

      case 'materials_shipped_confirm': {
        const confirmLabel = event.isDropOff ? 'dropped off' : 'shipped'
        await mailer.sendMail({
          from: FROM,
          to: event.advertiserEmail,
          subject: `Materials marked ${confirmLabel} — "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Materials ${event.isDropOff ? 'Dropped Off' : 'Shipped'} 📦</h2>
            <div style="color:#555;margin:0 0 12px">You marked your printed materials as ${confirmLabel}. Your host has been notified.</div>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <div style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></div>
              ${event.dates ? `<div style="margin:0 0 4px;color:#888">Dates: ${formatDateRange(event.dates)}</div>` : ''}
              ${event.trackingNumber ? `<div style="margin:0;color:#888">Tracking: <strong style="color:#2b2b2b">${event.trackingNumber}</strong></div>` : ''}
            </div>
            <div style="color:#555;margin:0 0 20px">Your host will confirm receipt when the materials arrive — you'll get an email the moment they do.</div>
            <a href="${BASE_URL}/dashboard/bookings/${event.bookingId}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking →</a>
          `),
        })
        break
      }

      case 'materials_received_host':
        await mailer.sendMail({
          from: FROM,
          to: event.hostEmail,
          subject: `Receipt confirmed — next: post the ad ("${event.listingTitle}")`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Receipt Confirmed ✅</h2>
            <div style="color:#555;margin:0 0 12px">You confirmed the advertiser's materials arrived. One thing left:</div>
            <div style="background:#fef9ec;border:1px solid #f5edda;border-radius:12px;padding:16px;margin:16px 0">
              <div style="margin:0 0 4px;color:#2b2b2b"><strong>Post the ad on or before ${event.startDate ?? 'the campaign start date'}</strong></div>
              <div style="margin:0;color:#888">Then upload proof of posting to get paid — no proof, no payout.</div>
            </div>
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <div style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></div>
              ${event.dates ? `<div style="margin:0;color:#888">Dates: ${formatDateRange(event.dates)}</div>` : ''}
            </div>
            <a href="${BASE_URL}/dashboard/bookings/${event.bookingId}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking →</a>
          `),
        })
        break

      case 'listing_published':
        await mailer.sendMail({
          from: FROM,
          to: event.hostEmail,
          subject: `Your listing is live — "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Your Listing Is Live 🎉</h2>
            <p style="color:#555;margin:0 0 12px">Congrats — <strong>${event.listingTitle}</strong> is now live on the City Feed marketplace and visible to advertisers.</p>
            ${event.listingImage ? `<img src="${event.listingImage}" alt="${event.listingTitle}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:12px;margin:0 0 16px" />` : ''}
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0 0 4px;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              ${event.pricePerDay ? `<p style="margin:0;color:#888">$${event.pricePerDay}/day</p>` : ''}
            </div>
            <p style="color:#555;margin:0 0 8px"><strong>What happens next:</strong></p>
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">Advertisers can find and book your space instantly</li>
              <li style="margin-bottom:6px">You'll get an email when a booking request comes in</li>
              <li>Funds are released to you after you upload proof of posting</li>
            </ol>
            <a href="${BASE_URL}/dashboard/listings" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">Manage Listing →</a>
          `),
        })
        break
    }
  } catch (err) {
    console.error('[EMAIL] Failed to send email:', err)
  }
}

function emailTemplate(body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;padding:0 20px">
    <div style="text-align:center;margin-bottom:24px">
      <img src="https://www.cityfeed.io/logo-nav.png" alt="City Feed" style="height: 40px; margin-bottom: 16px;" />
    </div>
    <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e0e0d8">
      ${body}
    </div>
    <p style="text-align:center;color:#aaa;font-size:12px;margin-top:20px">
      City Feed · The marketplace for ad placements<br>
      <a href="${BASE_URL}" style="color:#aaa">cityfeed.io</a>
    </p>
  </div>
</body>
</html>
  `.trim()
}
