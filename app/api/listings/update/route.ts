import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUser } from '@/lib/auth-guard'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

export async function POST(req: NextRequest) {
  try {
    const { listingId, updates } = await req.json()

    if (!listingId || !updates) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // SECURITY: Server-side session check — userId comes from session, not client
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized — login required' }, { status: 401 })
    }

    const supabase = getSupabase()

    // Verify the listing exists
    const { data: listing } = await supabase
      .from('listings')
      .select('host_id')
      .eq('id', listingId)
      .single()

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // SECURITY: Ownership check — only the host can update their own listing
    if (listing.host_id !== sessionUser.id) {
      return NextResponse.json({ error: 'Unauthorized — you can only edit your own listings' }, { status: 403 })
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
