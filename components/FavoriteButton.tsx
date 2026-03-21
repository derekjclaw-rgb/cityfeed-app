'use client'

/**
 * FavoriteButton — heart icon to save/unsave a listing
 * Requires favorites table in Supabase (see SQL in app/dashboard/saved/page.tsx)
 */
import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FavoriteButtonProps {
  listingId: string
  className?: string
  size?: number
}

export default function FavoriteButton({ listingId, className = '', size = 20 }: FavoriteButtonProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [favoriteId, setFavoriteId] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      // Check if already favorited
      const { data } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('listing_id', listingId)
        .single()

      if (data) {
        setIsSaved(true)
        setFavoriteId(data.id)
      }
    })
  }, [listingId])

  if (!mounted) return null

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      // Redirect to login if not authenticated
      window.location.href = '/login'
      return
    }

    setLoading(true)
    const supabase = createClient()

    if (isSaved && favoriteId) {
      await supabase.from('favorites').delete().eq('id', favoriteId)
      setIsSaved(false)
      setFavoriteId(null)
    } else {
      const { data } = await supabase
        .from('favorites')
        .insert({ user_id: userId, listing_id: listingId })
        .select('id')
        .single()
      if (data) {
        setIsSaved(true)
        setFavoriteId(data.id)
      }
    }
    setLoading(false)
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center justify-center rounded-full transition-all hover:scale-110 ${className}`}
      title={isSaved ? 'Remove from saved' : 'Save listing'}
      aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
    >
      <Heart
        style={{
          width: size,
          height: size,
          color: isSaved ? '#e6964d' : '#888',
          fill: isSaved ? '#e6964d' : 'none',
          transition: 'all 0.2s',
          opacity: loading ? 0.5 : 1,
        }}
      />
    </button>
  )
}
