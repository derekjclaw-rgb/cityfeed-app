import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cityfeed.io'

/**
 * Server-side metadata for listing detail pages.
 *
 * The page itself is a client component, so this layout provides the SEO
 * surface: unique title/description per listing, correct self-canonical
 * (the root layout used to declare the homepage as canonical for every
 * page — which told Google not to index listings), and OG image for shares.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const canonical = `${baseUrl}/marketplace/${id}`

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (url && key) {
      const supabase = createClient(url, key)
      const { data: l } = await supabase
        .from('listings')
        .select('title, description, category, city, state, price_per_day, images, status')
        .eq('id', id)
        .single()

      if (l && l.status === 'active') {
        const title = `${l.title} — ${l.city}, ${l.state}`
        const description =
          l.description?.slice(0, 155) ||
          `Book this ${String(l.category).replace(/_/g, ' ')} ad space in ${l.city}, ${l.state} from $${l.price_per_day}/day on City Feed.`
        return {
          title,
          description,
          alternates: { canonical },
          openGraph: {
            title,
            description,
            url: canonical,
            images: l.images?.[0] ? [{ url: l.images[0] }] : undefined,
          },
        }
      }
    }
  } catch {
    /* metadata must never break the page — fall through to defaults */
  }

  return { alternates: { canonical } }
}

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return children
}
