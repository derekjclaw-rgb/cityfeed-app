import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const bookingId = req.nextUrl.searchParams.get('bookingId')
  if (!bookingId) return NextResponse.json({ error: 'Missing bookingId' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  // Support both regular collateral (bookings/UUID) and POP files (pop/UUID)
  const folderPath = bookingId.startsWith('pop-') 
    ? `pop/${bookingId.replace('pop-', '')}` 
    : `bookings/${bookingId}`
  const { data, error } = await supabase.storage
    .from('booking-collateral')
    .list(folderPath, { sortBy: { column: 'created_at', order: 'desc' } })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const files = await Promise.all(
    (data ?? []).map(async (item) => {
      const { data: urlData } = supabase.storage
        .from('booking-collateral')
        .getPublicUrl(`${folderPath}/${item.name}`)
      return {
        name: item.name,
        path: `${folderPath}/${item.name}`,
        size: item.metadata?.size ?? 0,
        type: item.metadata?.mimetype ?? '',
        created_at: item.created_at,
        url: urlData?.publicUrl,
      }
    })
  )

  return NextResponse.json({ files })
}
