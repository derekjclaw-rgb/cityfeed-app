'use client'

/**
 * Public Profile Page — Airbnb/Uber style, privacy-first
 * Shows first name + last initial only, no email/phone/company
 */
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Star, Shield, CheckCircle, MessageSquare, MapPin, Loader2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface PublicProfile {
  id: string
  full_name: string
  role: string
  avatar_url?: string
  bio?: string
  created_at: string
  email_verified?: boolean
}

interface Review {
  id: string
  reviewer_id: string
  rating: number
  comment: string
  created_at: string
  reviewer_name: string
  reviewer_avatar?: string
}

interface Listing {
  id: string
  title: string
  city: string
  state: string
}

function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={s}
          fill={n <= Math.round(rating) ? '#debb73' : 'none'}
          style={{ color: n <= Math.round(rating) ? '#7ecfc0' : '#e0e0d8' }}
        />
      ))}
    </div>
  )
}

function formatName(fullName: string): string {
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`
}

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const profileId = params.id as string

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function load() {
      // Get current user (for contact button)
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id ?? null)

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url, bio, created_at')
        .eq('id', profileId)
        .single()

      if (profileError || !profileData) {
        setError('Profile not found.')
        setLoading(false)
        return
      }

      setProfile(profileData)

      // Fetch reviews
      const { data: reviewData } = await supabase
        .from('reviews')
        .select('id, reviewer_id, rating, comment, created_at')
        .eq('reviewee_id', profileId)
        .order('created_at', { ascending: false })

      if (reviewData && reviewData.length > 0) {
        // Fetch reviewer names
        const reviewerIds = [...new Set(reviewData.map(r => r.reviewer_id))]
        const { data: reviewerProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', reviewerIds)

        const profileMap = new Map(reviewerProfiles?.map(p => [p.id, p]) ?? [])
        const enriched = reviewData.map(r => ({
          ...r,
          reviewer_name: formatName(profileMap.get(r.reviewer_id)?.full_name ?? 'Anonymous'),
          reviewer_avatar: profileMap.get(r.reviewer_id)?.avatar_url,
        }))
        setReviews(enriched)
      }

      // Fetch active listings if host
      if (profileData.role === 'host' || profileData.role === 'admin') {
        const { data: listingData } = await supabase
          .from('listings')
          .select('id, title, city, state')
          .eq('host_id', profileId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })

        if (listingData) setListings(listingData)
      }

      setLoading(false)
    }

    load()
  }, [profileId])

  function handleContactHost() {
    if (!currentUserId) {
      router.push(`/login?redirect=/profile/${profileId}`)
      return
    }
    // Redirect to messages — they'll need an existing booking or we go to listings
    router.push('/dashboard/messages')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#7ecfc0' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Profile Not Found</h2>
          <p className="text-sm mb-6" style={{ color: '#888' }}>This profile doesn&apos;t exist or has been removed.</p>
          <Link href="/marketplace" className="text-sm font-medium" style={{ color: '#7ecfc0' }}>
            Browse Marketplace
          </Link>
        </div>
      </div>
    )
  }

  const displayName = formatName(profile.full_name)
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const isHost = profile.role === 'host' || profile.role === 'admin'
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0

  const initials = profile.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <div className="min-h-screen pt-20 px-6 pb-12" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-3xl mx-auto">
        {/* Profile Header Card */}
        <div className="rounded-2xl p-8 mb-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="w-24 h-24 rounded-full object-cover"
                  style={{ border: '3px solid #7ecfc0' }}
                />
              ) : (
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-bold"
                  style={{ backgroundColor: 'rgba(126,207,192,0.15)', color: '#7ecfc0', border: '3px solid #7ecfc0' }}
                >
                  {initials}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>{displayName}</h1>
                <span
                  className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
                  style={{ backgroundColor: isHost ? 'rgba(126,207,192,0.15)' : 'rgba(43,43,43,0.08)', color: isHost ? '#7ecfc0' : '#2b2b2b' }}
                >
                  {isHost ? 'Host' : 'Advertiser'}
                </span>
              </div>

              {/* Rating */}
              {reviews.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <StarDisplay rating={avgRating} size="sm" />
                  <span className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>{avgRating.toFixed(1)}</span>
                  <span className="text-sm" style={{ color: '#888' }}>({reviews.length} review{reviews.length !== 1 ? 's' : ''})</span>
                </div>
              )}

              <p className="text-sm mb-3" style={{ color: '#888' }}>Member since {memberSince}</p>

              {/* Verified Badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#16a34a' }}>
                  <CheckCircle className="w-4 h-4" />
                  Email Verified
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: '#888' }}>
                  <Shield className="w-4 h-4" />
                  ID Not Verified
                </div>
              </div>
            </div>

            {/* Contact button */}
            {currentUserId !== profileId && (
              <button
                onClick={handleContactHost}
                className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
              >
                <MessageSquare className="w-4 h-4" />
                {isHost ? 'Contact Host' : 'Send Message'}
              </button>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mt-6 pt-6" style={{ borderTop: '1px solid #f0f0ea' }}>
              <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{profile.bio}</p>
            </div>
          )}

          {/* Response info */}
          <div className="mt-6 pt-6 grid grid-cols-2 sm:grid-cols-3 gap-4" style={{ borderTop: '1px solid #f0f0ea' }}>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: '#aaa' }}>Response Rate</p>
              <p className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>~95%</p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: '#aaa' }}>Response Time</p>
              <p className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>Within a day</p>
            </div>
            {isHost && listings.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: '#aaa' }}>Active Listings</p>
                <p className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>{listings.length}</p>
              </div>
            )}
          </div>
        </div>

        {/* Active Listings (hosts only) */}
        {isHost && listings.length > 0 && (
          <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <h2 className="font-bold text-lg mb-4" style={{ color: '#2b2b2b' }}>Active Listings</h2>
            <div className="space-y-3">
              {listings.map(listing => (
                <Link
                  key={listing.id}
                  href={`/marketplace/${listing.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: '#f8f8f5', border: '1px solid #ececea' }}
                >
                  <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#7ecfc0' }} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#2b2b2b' }}>{listing.title}</p>
                    <p className="text-xs" style={{ color: '#888' }}>{listing.city}, {listing.state}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-lg" style={{ color: '#2b2b2b' }}>
              Reviews {reviews.length > 0 && (
                <span style={{ color: '#888' }}>({reviews.length})</span>
              )}
            </h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <StarDisplay rating={avgRating} />
                <span className="text-sm font-bold" style={{ color: '#2b2b2b' }}>{avgRating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <Star className="w-10 h-10 mx-auto mb-3" style={{ color: '#e0e0d8' }} />
              <p className="text-sm" style={{ color: '#888' }}>No reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {reviews.map(review => (
                <div key={review.id} className="pb-5" style={{ borderBottom: '1px solid #f0f0ea' }}>
                  <div className="flex items-start gap-3 mb-2">
                    {review.reviewer_avatar ? (
                      <img src={review.reviewer_avatar} alt={review.reviewer_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: 'rgba(126,207,192,0.15)', color: '#7ecfc0' }}>
                        {review.reviewer_name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold" style={{ color: '#2b2b2b' }}>{review.reviewer_name}</span>
                        <StarDisplay rating={review.rating} />
                      </div>
                      <p className="text-xs mb-2" style={{ color: '#aaa' }}>
                        {new Date(review.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-sm leading-relaxed" style={{ color: '#555' }}>{review.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
