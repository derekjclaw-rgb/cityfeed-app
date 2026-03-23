'use client'

/**
 * Leave a Review — after booking completion (POP approved)
 * 1-5 stars + comment, inserts into reviews table
 */
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface BookingInfo {
  id: string
  host_id: string
  advertiser_id: string
  status: string
  listing_title: string
}

export default function ReviewPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<BookingInfo | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('id, host_id, advertiser_id, status, listings(title)')
        .eq('id', bookingId)
        .single()

      if (bookingError || !bookingData) {
        setError('Booking not found.')
        setLoading(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bk = bookingData as any
      setBooking({
        id: bk.id,
        host_id: bk.host_id,
        advertiser_id: bk.advertiser_id,
        status: bk.status,
        listing_title: bk.listings?.title ?? 'Booking',
      })

      // Check if user is a party to this booking
      if (bk.host_id !== user.id && bk.advertiser_id !== user.id) {
        setError('You are not authorized to review this booking.')
        setLoading(false)
        return
      }

      // Check if already reviewed
      const revieweeId = bk.host_id === user.id ? bk.advertiser_id : bk.host_id
      const { data: existing } = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', user.id)
        .eq('reviewee_id', revieweeId)
        .eq('booking_id', bookingId)
        .single()

      if (existing) setAlreadyReviewed(true)

      setLoading(false)
    }

    load()
  }, [bookingId, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating.'); return }
    if (!comment.trim()) { setError('Please write a comment.'); return }
    if (!booking || !currentUserId) return

    setSubmitting(true)
    setError('')

    const supabase = createClient()
    const revieweeId = booking.host_id === currentUserId ? booking.advertiser_id : booking.host_id

    const { error: insertError } = await supabase.from('reviews').insert({
      booking_id: bookingId,
      reviewer_id: currentUserId,
      reviewee_id: revieweeId,
      rating,
      comment: comment.trim(),
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
    } else {
      setSubmitted(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#7ecfc0' }} />
          <p className="text-sm mb-4" style={{ color: '#888' }}>{error}</p>
          <Link href="/dashboard/bookings" className="text-sm font-medium" style={{ color: '#7ecfc0' }}>Back to Bookings</Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CheckCircle className="w-8 h-8" style={{ color: '#16a34a' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Review Submitted!</h2>
          <p className="text-sm mb-6" style={{ color: '#888' }}>Your review has been posted to their public profile.</p>
          <Link
            href="/dashboard/bookings"
            className="inline-block px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: '#ef4135', color: '#fff' }}
          >
            Back to Bookings
          </Link>
        </div>
      </div>
    )
  }

  if (alreadyReviewed) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <div className="text-center max-w-sm">
          <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#16a34a' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Already Reviewed</h2>
          <p className="text-sm mb-6" style={{ color: '#888' }}>You&apos;ve already submitted a review for this booking.</p>
          <Link href="/dashboard/bookings" className="text-sm font-medium" style={{ color: '#7ecfc0' }}>Back to Bookings</Link>
        </div>
      </div>
    )
  }

  const isReviewingHost = booking?.advertiser_id === currentUserId
  const reviewLabel = isReviewingHost ? 'Rate the Host' : 'Rate the Advertiser'

  return (
    <div className="min-h-screen pt-20 px-6 pb-12" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard/bookings" className="hover:opacity-70" style={{ color: '#888' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>Leave a Review</h1>
            <p className="text-sm" style={{ color: '#888' }}>{booking?.listing_title}</p>
          </div>
        </div>

        <div className="rounded-2xl p-8" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star Rating */}
            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: '#2b2b2b' }}>{reviewLabel}</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(n)}
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="transition-transform hover:scale-110"
                  >
                    <Star
                      className="w-8 h-8"
                      fill={n <= (hoverRating || rating) ? '#7ecfc0' : 'none'}
                      style={{ color: n <= (hoverRating || rating) ? '#7ecfc0' : '#e0e0d8' }}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="text-sm font-medium ml-2" style={{ color: '#888' }}>
                    {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
                  </span>
                )}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#2b2b2b' }}>Your Review</label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={5}
                placeholder="Share your experience with this booking — was communication good? Did everything go smoothly?"
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8', color: '#2b2b2b' }}
              />
              <p className="text-xs mt-1" style={{ color: '#aaa' }}>{comment.length}/500 characters</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#ef4135', color: '#fff' }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Review
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
