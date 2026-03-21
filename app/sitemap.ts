import { MetadataRoute } from 'next'
import { createClient } from '@supabase/supabase-js'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cityfeed-app.vercel.app'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/marketplace`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/how-it-works`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  // Dynamic listing pages
  let listingPages: MetadataRoute.Sitemap = []
  try {
    const { data: listings } = await supabase
      .from('listings')
      .select('id, updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1000)

    listingPages = (listings ?? []).map(listing => ({
      url: `${baseUrl}/marketplace/${listing.id}`,
      lastModified: new Date(listing.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch {
    // Silently fail — static pages still served
  }

  // Dynamic public profile pages
  let profilePages: MetadataRoute.Sitemap = []
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, updated_at')
      .eq('role', 'host')
      .limit(500)

    profilePages = (profiles ?? []).map(profile => ({
      url: `${baseUrl}/profile/${profile.id}`,
      lastModified: new Date(profile.updated_at ?? new Date()),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }))
  } catch {
    // Silently fail
  }

  return [...staticPages, ...listingPages, ...profilePages]
}
