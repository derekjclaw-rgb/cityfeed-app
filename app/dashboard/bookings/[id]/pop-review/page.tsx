'use client'

/**
 * POP Review page — redirects to booking detail.
 * The approval gate has been removed; payout is triggered automatically on POP upload.
 * Advertisers can see proof in the messenger chat and report issues directly.
 */
import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function POPReviewRedirectPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  useEffect(() => {
    router.replace(`/dashboard/bookings/${bookingId}`)
  }, [bookingId, router])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f0f0ec' }}>
      <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
    </div>
  )
}
