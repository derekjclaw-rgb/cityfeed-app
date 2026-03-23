import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' }) }
function getSupabase() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '') }
export async function POST(req: NextRequest) {
  const stripe = getStripe()
  const supabase = getSupabase()
  try {
    const { userId, email } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Check if user already has a Stripe Connect account
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single()

    let accountId = profile?.stripe_account_id

    if (!accountId) {
      // Create a new Express account
      const account = await stripe.accounts.create({
        type: 'express',
        email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: { user_id: userId },
      })
      accountId = account.id

      // Save account ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', userId)
    }

    // Create Account Link for onboarding
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cityfeed-app.vercel.app'
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/dashboard/stripe-onboarding?refresh=true`,
      return_url: `${baseUrl}/api/stripe/connect/callback?account_id=${accountId}&user_id=${userId}`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url, accountId })
  } catch (err) {
    console.error('[Stripe Connect] Error:', err)
    return NextResponse.json({ error: 'Failed to create Connect account' }, { status: 500 })
  }
}
