'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LayoutGrid, PlusCircle, MessageSquare, ClipboardList, User, TrendingUp } from 'lucide-react'

interface Profile {
  full_name: string
  email: string
  role: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', user.id)
        .single()
      setProfile(data)
      setLoading(false)
    })
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e6e6dd' }}>
        <div className="animate-spin w-8 h-8 border-3 border-t-transparent rounded-full" style={{ borderColor: '#e6964d' }} />
      </div>
    )
  }

  const isHost = profile?.role === 'host' || profile?.role === 'admin'

  const hostLinks = [
    { href: '/dashboard/create-listing', label: 'Create Listing', desc: 'List a new ad placement', icon: PlusCircle },
    { href: '/dashboard/listings', label: 'My Listings', desc: 'Manage your active listings', icon: LayoutGrid },
    { href: '/dashboard/messages', label: 'Messages', desc: 'Chat with advertisers', icon: MessageSquare },
    { href: '/dashboard/bookings', label: 'Bookings', desc: 'View booking requests', icon: ClipboardList },
  ]

  const advertiserLinks = [
    { href: '/marketplace', label: 'Browse Placements', desc: 'Find ad spaces to book', icon: TrendingUp },
    { href: '/dashboard/bookings', label: 'My Bookings', desc: 'Track your active campaigns', icon: ClipboardList },
    { href: '/dashboard/messages', label: 'Messages', desc: 'Chat with hosts', icon: MessageSquare },
  ]

  const links = isHost ? hostLinks : advertiserLinks

  return (
    <div className="min-h-screen pt-20 px-6 pb-12" style={{ backgroundColor: '#e6e6dd' }}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#2b2b2b' }}>
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm" style={{ color: '#888' }}>
            {isHost ? 'Manage your listings and bookings' : 'Find and manage your ad campaigns'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group bg-white rounded-2xl p-6 hover:shadow-lg transition-all hover:-translate-y-0.5"
              style={{ border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: '#fdf3e8' }}>
                  <link.icon className="w-6 h-6" style={{ color: '#e6964d' }} />
                </div>
                <div>
                  <h3 className="font-semibold mb-1 group-hover:text-[#e6964d] transition-colors" style={{ color: '#2b2b2b' }}>
                    {link.label}
                  </h3>
                  <p className="text-sm" style={{ color: '#888' }}>{link.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
