/**
 * Email notification utility — nodemailer SMTP via Gmail
 * SMTP: smtp.gmail.com:465 (SSL)
 * User: derekjclaw@gmail.com
 * App Password: tgpi oqil qoeu sank
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
        user: process.env.SMTP_USER || 'derekjclaw@gmail.com',
        pass: process.env.SMTP_PASS || 'tgpi oqil qoeu sank',
      },
    })
  }
  return transporter
}

const FROM = 'City Feed <derekjclaw@gmail.com>'
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
  | { type: 'new_booking_request'; hostEmail: string; listingTitle: string; advertiserName: string; dates: string; total: number; platformFee: number; bookingId?: string }
  | { type: 'booking_confirmed'; advertiserEmail: string; listingTitle: string; dates: string; total: number; bookingId?: string }
  | { type: 'booking_cancelled'; recipientEmail: string; listingTitle: string; dates: string; role: 'host' | 'advertiser' }
  | { type: 'booking_approved_advertiser'; advertiserEmail: string; listingTitle: string; dates: string; bookingId: string }
  | { type: 'collateral_uploaded'; hostEmail: string; listingTitle: string; advertiserName: string; bookingId: string }
  | { type: 'pop_submitted'; advertiserEmail: string; listingTitle: string; bookingId: string }
  | { type: 'pop_approved'; hostEmail: string; listingTitle: string; amount: number }
  | { type: 'collateral_reminder'; advertiserEmail: string; listingTitle: string; bookingId: string; campaignStartDate: string }

export async function sendEmail(event: EmailEvent): Promise<void> {
  const mailer = getTransporter()

  try {
    switch (event.type) {
      case 'new_booking_request': {
        const subtotal = event.total - event.platformFee
        const sellerFee = subtotal * 0.07
        const payout = subtotal - sellerFee
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
            <p style="color:#555;margin:0 0 20px">Log in to review and accept or decline this booking.</p>
            <a href="${BASE_URL}/dashboard/bookings" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">Review Booking →</a>
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
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0 0 8px;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
              <p style="margin:0 0 4px;color:#888">Dates: ${formatDateRange(event.dates)}</p>
              <p style="margin:0;color:#888">Total charged: <strong style="color:#2b2b2b">$${event.total.toLocaleString()}</strong></p>
            </div>
            <p style="color:#555;margin:0 0 8px"><strong>Next steps:</strong></p>
            <ol style="color:#555;margin:0 0 20px;padding-left:20px">
              <li style="margin-bottom:6px">Upload your creative files in the booking dashboard</li>
              <li style="margin-bottom:6px">The host will review and begin setup</li>
              <li>You'll receive proof of posting when your ad goes live</li>
            </ol>
            <a href="${BASE_URL}/dashboard/bookings" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Booking →</a>
          `),
        })
        break

      case 'booking_approved_advertiser':
        await mailer.sendMail({
          from: FROM,
          to: event.advertiserEmail,
          subject: `✅ Your booking has been approved — "${event.listingTitle}"`,
          html: emailTemplate(`
            <h2 style="color:#2b2b2b;margin:0 0 16px">Booking Approved ✅</h2>
            <p style="font-family:monospace;font-size:14px;font-weight:700;color:#7ecfc0;margin:0 0 12px;letter-spacing:0.05em">${confirmationCode(event.bookingId)}</p>
            <p style="color:#555;margin:0 0 12px">The host has approved your booking request.</p>
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
            <a href="${BASE_URL}/dashboard/bookings" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Dashboard →</a>
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
            </div>
            <p style="color:#555;margin:0 0 20px">Review the files and begin setup when ready.</p>
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
            <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
              <p style="margin:0;color:#2b2b2b"><strong>${event.listingTitle}</strong></p>
            </div>
            <p style="color:#555;margin:0 0 20px">Please review and approve within 72 hours. If no action is taken, it will be auto-approved.</p>
            <a href="${BASE_URL}/dashboard/bookings/${event.bookingId}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">Review POP →</a>
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
              <p style="margin:0;color:#888">Payout amount: <strong style="color:#16a34a">$${event.amount.toLocaleString()}</strong></p>
            </div>
            <p style="color:#555;margin:0 0 20px">Your payout is being processed via Stripe.</p>
            <a href="${BASE_URL}/dashboard" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none">View Dashboard →</a>
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
