'use client'

/**
 * Saved/Favorited Listings
 *
 * SQL to run in Supabase:
 * -- create table if not exists public.favorites (
 * --   id uuid primary key default gen_random_uuid(),
 * --   user_id uuid references public.profiles(id) on delete cascade,
 * --   listing_id uuid references public.listings(id) on delete cascade,
 * --   created_at timestamptz not null default now(),
 * --   unique(user_id, listing_id)
 * -- );
 * -- alter table public.favorites enable row level security;
 * -- create policy "Users manage own favorites" on public.favorites for all using (auth.uid() = user_id);
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Loader2, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SavedListing {
  id: string
  listing_id: string
  listing_title: string
  listing_price: number
  listing_location: string
  listing_image?: string
  listing_type: string
}

export default function SavedPage() {
  const router = useRouter()
  const [saved, setSaved] = useState<SavedListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('favorites')
        .select(`
          id,
          listing_id,
          listings(id, title, price_per_day, location, images, listing_type)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      const mapped: SavedListing[] = (data ?? []).map((f: Record<string, unknown>) => {
        const listing = f.listings as Record<string, unknown> | null
        const images = listing?.images as string[] | null
        return {
          id: f.id as string,
          listing_id: f.listing_id as string,
          listing_title: (listing?.title as string) ?? 'Listing',
          listing_price: (listing?.price_per_day as number) ?? 0,
          listing_location: (listing?.location as string) ?? '',
          listing_image: images?.[0],
          listing_type: (listing?.listing_type as string) ?? 'Placement',
        }
      })

      setSaved(mapped)
      setLoading(false)
    })
  }, [router])

  async function unsave(favoriteId: string) {
    const supabase = createClient()
    await supabase.from('favorites').delete().eq('id', favoriteId)
    setSaved(prev => prev.filter(s => s.id !== favoriteId))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 pb-12" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="hover:opacity-70" style={{ color: '#888' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>Saved Listings</h1>
            <p className="text-sm" style={{ color: '#888' }}>{saved.length} saved placement{saved.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {saved.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <Heart className="w-12 h-12 mx-auto mb-4" style={{ color: '#e0e0d8' }} />
            <h2 className="text-lg font-semibold mb-2" style={{ color: '#2b2b2b' }}>No saved listings yet</h2>
            <p className="text-sm mb-6" style={{ color: '#888' }}>
              Browse the marketplace and tap the heart icon to save listings for later.
            </p>
            <Link
              href="/marketplace"
              className="inline-block px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#ef4135', color: '#fff' }}
            >
              Browse Marketplace
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {saved.map(item => (
              <div
                key={item.id}
                className="rounded-2xl overflow-hidden"
                style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
              >
                {/* Image */}
                <div className="relative aspect-video" style={{ backgroundColor: '#f0f0ea' }}>
                  {item.listing_image ? (
                    <img src={item.listing_image} alt={item.listing_title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-8 h-8" style={{ color: '#e0e0d8' }} />
                    </div>
                  )}
                  {/* Unsave button */}
                  <button
                    onClick={() => unsave(item.id)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
                    title="Remove from saved"
                  >
                    <Heart className="w-4 h-4 fill-current" style={{ color: '#7ecfc0' }} />
                  </button>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm leading-tight" style={{ color: '#2b2b2b' }}>
                      {item.listing_title}
                    </h3>
                    <span className="text-xs font-semibold whitespace-nowrap" style={{ color: '#7ecfc0' }}>
                      ${item.listing_price}/day
                    </span>
                  </div>
                  {item.listing_location && (
                    <p className="text-xs flex items-center gap-1 mb-3" style={{ color: '#888' }}>
                      <MapPin className="w-3 h-3" />
                      {item.listing_location}
                    </p>
                  )}
                  <Link
                    href={`/marketplace/${item.listing_id}`}
                    className="block w-full text-center py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: '#f0f0ec', color: '#7ecfc0' }}
                  >
                    View Listing
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
