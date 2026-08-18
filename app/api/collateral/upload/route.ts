import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionUser } from '@/lib/auth-guard'

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require authenticated session
    const sessionUser = await getSessionUser()
    if (!sessionUser) {
      return NextResponse.json({ error: 'Unauthorized — login required' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const path = formData.get('path') as string

    if (!file || !path) {
      return NextResponse.json({ error: 'Missing file or path' }, { status: 400 })
    }

    // SECURITY: Validate path format — must be bookings/{uuid}/... or pop/{uuid}/...
    const validPathPattern = /^(bookings|pop)\/[a-f0-9-]+\/.+$/i
    if (!validPathPattern.test(path)) {
      return NextResponse.json({ error: 'Invalid upload path' }, { status: 400 })
    }

    // Extract booking ID from path to verify user is a participant
    const pathParts = path.split('/')
    const bookingId = pathParts[1]

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // SECURITY: Verify user is a participant in this booking
    const { data: booking } = await supabase
      .from('bookings')
      .select('advertiser_id, host_id')
      .eq('id', bookingId)
      .single()

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (booking.advertiser_id !== sessionUser.id && booking.host_id !== sessionUser.id) {
      return NextResponse.json({ error: 'Forbidden — you are not a participant in this booking' }, { status: 403 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const { error } = await supabase.storage
      .from('booking-collateral')
      .upload(path, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('booking-collateral')
      .getPublicUrl(path)

    return NextResponse.json({ url: urlData.publicUrl, path })
  } catch (err) {
    console.error('[Collateral Upload] Error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
