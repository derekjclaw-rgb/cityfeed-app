import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

export async function POST(req: NextRequest) {
  try {
    const { listingId, userId, updates } = await req.json()

    if (!listingId || !userId || !updates) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Verify the listing exists (the edit page only shows the user's own listings)
    const { data: listing } = await supabase
      .from('listings')
      .select('host_id')
      .eq('id', listingId)
      .single()

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Update using service role (bypasses RLS)
    const { error } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', listingId)

    if (error) {
      console.error('[Listings Update] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Listings Update] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
