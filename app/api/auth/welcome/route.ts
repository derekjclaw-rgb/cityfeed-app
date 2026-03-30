/**
 * POST /api/auth/welcome
 * Sends a welcome email to a newly signed-up user.
 * Called from the signup page after successful account creation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://cityfeed.io'

export async function POST(req: NextRequest) {
  try {
    const { email, name, role } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Missing email' }, { status: 400 })
    }

    const firstName = name?.split(' ')[0] || 'there'
    const isHost = role === 'host'

    // Build welcome email HTML inline (reuse emailTemplate pattern from lib/email.ts)
    const nodemailer = await import('nodemailer')
    const transporter = nodemailer.default.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.SMTP_USER || 'derekjclaw@gmail.com',
        pass: process.env.SMTP_PASS || 'tgpi oqil qoeu sank',
      },
    })

    const ctaPrimary = isHost
      ? { label: 'Create Your First Listing →', url: `${BASE_URL}/dashboard/create-listing` }
      : { label: 'Browse Ad Placements →', url: `${BASE_URL}/marketplace` }

    const ctaSecondary = isHost
      ? { label: 'Set Up Payouts', url: `${BASE_URL}/dashboard/stripe-onboarding` }
      : { label: 'List Your Own Space', url: `${BASE_URL}/dashboard/create-listing` }

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="max-width:560px;margin:40px auto;padding:0 20px">
    <div style="text-align:center;margin-bottom:24px">
      <img src="https://www.cityfeed.io/logo-nav.png" alt="City Feed" style="height:40px;margin-bottom:16px;" />
    </div>
    <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e0e0d8">
      <h2 style="color:#2b2b2b;margin:0 0 16px">Welcome to City Feed, ${firstName}! 🎉</h2>
      <p style="color:#555;margin:0 0 16px">
        ${isHost
          ? "You're all set to start listing your ad space and earning from local advertisers."
          : "You're all set to discover and book premium ad placements across the city."}
      </p>
      <div style="background:#f8f8f5;border-radius:12px;padding:16px;margin:16px 0">
        <p style="margin:0 0 10px;color:#2b2b2b;font-weight:600">Here's how to get started:</p>
        ${isHost ? `
        <ol style="color:#555;margin:0;padding-left:20px">
          <li style="margin-bottom:8px">Create your first listing — describe your ad space, upload photos, set pricing</li>
          <li style="margin-bottom:8px">Connect your bank account to receive payouts via Stripe</li>
          <li>Start accepting booking requests from advertisers</li>
        </ol>
        ` : `
        <ol style="color:#555;margin:0;padding-left:20px">
          <li style="margin-bottom:8px">Browse the marketplace to find the perfect ad placement</li>
          <li style="margin-bottom:8px">Book a space — choose your dates and confirm your campaign</li>
          <li>Upload your creative files and track your campaign in the dashboard</li>
        </ol>
        `}
      </div>
      <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
        <a href="${ctaPrimary.url}" style="display:inline-block;background:#debb73;color:#2b2b2b;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none;margin-bottom:8px">${ctaPrimary.label}</a>
        <a href="${ctaSecondary.url}" style="display:inline-block;background:#f8f8f5;color:#555;border:1px solid #e0e0d8;padding:12px 24px;border-radius:10px;font-weight:600;text-decoration:none;margin-bottom:8px">${ctaSecondary.label}</a>
      </div>
      <p style="color:#aaa;font-size:12px;margin:20px 0 0">
        Questions? Reply to this email or visit <a href="${BASE_URL}/how-it-works" style="color:#7ecfc0">How It Works</a>.
      </p>
    </div>
    <p style="text-align:center;color:#aaa;font-size:12px;margin-top:20px">
      City Feed · The marketplace for ad placements<br>
      <a href="${BASE_URL}" style="color:#aaa">cityfeed.io</a>
    </p>
  </div>
</body>
</html>
    `.trim()

    await transporter.sendMail({
      from: 'City Feed <derekjclaw@gmail.com>',
      to: email,
      subject: `Welcome to City Feed, ${firstName}! 🎉`,
      html,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[welcome email]', err)
    return NextResponse.json({ error: 'Failed to send welcome email' }, { status: 500 })
  }
}
