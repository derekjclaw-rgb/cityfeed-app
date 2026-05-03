/**
 * Admin data API — single endpoint for all admin dashboard queries.
 * Protected by admin_session cookie check.
 * Uses service role key to bypass RLS.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

function isAuthenticated(req: NextRequest): boolean {
  return req.cookies.get('admin_session')?.value === 'authenticated'
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const view = searchParams.get('view')
  const supabase = getSupabase()

  try {
    switch (view) {
      case 'dashboard': {
        const [bookingsRes, usersRes, listingsRes] = await Promise.all([
          supabase.from('bookings').select(`
            id, status, total_price, payout_amount, created_at, start_date, end_date,
            listings(title),
            advertiser:profiles!bookings_advertiser_id_fkey(full_name),
            host:profiles!bookings_host_id_fkey(full_name)
          `).order('created_at', { ascending: false }),
          supabase.from('profiles').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }),
          supabase.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        ])
        return NextResponse.json({
          bookings: bookingsRes.data ?? [],
          users: usersRes.data ?? [],
          activeListingCount: listingsRes.count ?? 0,
        })
      }

      case 'bookings': {
        const { data } = await supabase
          .from('bookings')
          .select(`
            id, status, total_price, payout_amount, created_at, start_date, end_date,
            listings(title),
            advertiser:profiles!bookings_advertiser_id_fkey(full_name),
            host:profiles!bookings_host_id_fkey(full_name)
          `)
          .order('created_at', { ascending: false })
        return NextResponse.json({ bookings: data ?? [] })
      }

      case 'booking-detail': {
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
        const { data } = await supabase
          .from('bookings')
          .select(`
            id, status, total_price, platform_fee, payout_amount, payout_at,
            stripe_transfer_id, stripe_payment_intent_id, created_at,
            start_date, end_date, delivery_mode, shipped_at, received_at, tracking_number,
            listing_id, advertiser_id, host_id,
            listings(title, category, price_per_day),
            advertiser:profiles!bookings_advertiser_id_fkey(id, full_name, email),
            host:profiles!bookings_host_id_fkey(id, full_name, email)
          `)
          .eq('id', id)
          .single()
        return NextResponse.json({ booking: data })
      }

      case 'listings': {
        const [listData, bookingData] = await Promise.all([
          supabase.from('listings').select(`
            id, title, category, city, state, price_per_day, status, created_at, host_id,
            host:profiles!listings_host_id_fkey(full_name)
          `).order('created_at', { ascending: false }),
          supabase.from('bookings').select('listing_id, total_price').in('status', ['confirmed', 'completed', 'pop_pending']),
        ])
        return NextResponse.json({
          listings: listData.data ?? [],
          bookingAggs: bookingData.data ?? [],
        })
      }

      case 'users': {
        const [profileRes, bookingRes, listingRes] = await Promise.all([
          supabase.from('profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('bookings').select(`
            id, listing_id, advertiser_id, host_id, status, total_price, payout_amount,
            created_at, start_date, end_date, listings(title)
          `).order('created_at', { ascending: false }),
          supabase.from('listings').select('id, title, host_id, status, price_per_day'),
        ])
        return NextResponse.json({
          profiles: profileRes.data ?? [],
          bookings: bookingRes.data ?? [],
          listings: listingRes.data ?? [],
        })
      }

      case 'financials': {
        const { data } = await supabase
          .from('bookings')
          .select(`
            id, status, total_price, payout_amount, created_at, start_date, end_date,
            listings(title),
            advertiser:profiles!bookings_advertiser_id_fkey(full_name),
            host:profiles!bookings_host_id_fkey(full_name)
          `)
          .order('created_at', { ascending: true })
        return NextResponse.json({ bookings: data ?? [] })
      }

      default:
        return NextResponse.json({ error: 'Unknown view' }, { status: 400 })
    }
  } catch (err) {
    console.error('[Admin API] Error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
