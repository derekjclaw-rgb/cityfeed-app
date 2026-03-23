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
    const isConnected = account.details_submitted

    // Update the user's profile with the stripe account id and connection status
    await supabase
      .from('profiles')
      .update({
        stripe_account_id: accountId,
        stripe_connected: isConnected,
      })
      .eq('id', userId)

    if (isConnected) {
      return NextResponse.redirect(`${baseUrl}/dashboard/stripe-onboarding?success=true`)
    } else {
      return NextResponse.redirect(`${baseUrl}/dashboard/stripe-onboarding?incomplete=true`)
    }
  } catch (err) {
    console.error('[Stripe Callback] Error:', err)
    return NextResponse.redirect(`${baseUrl}/dashboard/stripe-onboarding?error=verification_failed`)
  }
}
