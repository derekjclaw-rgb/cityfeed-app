import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function getStripe() { return new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2026-02-25.clover' }) }
function getSupabase() { return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '') }
export async function GET(req: NextRequest) {
  const stripe = getStripe()
  const supabase = getSupabase()
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('account_id')
  const userId = searchParams.get('user_id')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cityfeed-app.vercel.app'

  if (!accountId || !userId) {
    return NextResponse.redirect(`${baseUrl}/dashboard/stripe-onboarding?error=missing_params`)
  }

  try {
    // Verify the account exists and check its status
    const account = await stripe.accounts.retrieve(accountId)

    // Fully connected = charges AND payouts enabled
    const fullyConnected = account.charges_enabled === true && account.payouts_enabled === true
    // Partially connected = details submitted but not fully enabled yet
    const partiallyConnected = account.details_submitted === true

    // Update the user's profile
    await supabase
      .from('profiles')
      .update({
        stripe_account_id: accountId,
        stripe_connected: fullyConnected,
      })
      .eq('id', userId)

    if (fullyConnected) {
      // Fully set up — redirect to dashboard with success toast
      return NextResponse.redirect(`${baseUrl}/dashboard?stripe_success=true`)
    } else if (partiallyConnected) {
      // Details submitted but not fully enabled — show incomplete state
      return NextResponse.redirect(`${baseUrl}/dashboard/stripe-onboarding?incomplete=true`)
    } else {
      // Not even submitted yet
      return NextResponse.redirect(`${baseUrl}/dashboard/stripe-onboarding?incomplete=true`)
    }
  } catch (err) {
    console.error('[Stripe Callback] Error:', err)
    return NextResponse.redirect(`${baseUrl}/dashboard/stripe-onboarding?error=verification_failed`)
  }
}
