import Link from 'next/link'
import { MapPin, Users, CheckCircle, ArrowRight, Zap, Shield, TrendingUp } from 'lucide-react'

/**
 * City Feed Landing Page
 * Dark, startup-forward design with green accents
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0f]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#22c55e] flex items-center justify-center">
              <MapPin className="w-4 h-4 text-black" />
            </div>
            <span className="font-bold text-lg tracking-tight">City Feed</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-white/60">
            <Link href="/marketplace" className="hover:text-white transition-colors">Browse</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
            <Link href="#for-hosts" className="hover:text-white transition-colors">List your space</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm bg-[#22c55e] text-black font-semibold px-4 py-2 rounded-lg hover:bg-[#16a34a] transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-xs font-medium px-3 py-1.5 rounded-full mb-8">
            <Zap className="w-3 h-3" />
            The future of local advertising
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-[1.05]">
            Advertise on{' '}
            <span className="text-[#22c55e]">your terms</span>
          </h1>
          <p className="text-xl md:text-2xl text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed">
            The peer-to-peer marketplace for local advertising. Book real-world ad placements in minutes — billboards, storefronts, digital screens, and more.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/marketplace"
              className="group inline-flex items-center gap-2 bg-[#22c55e] text-black font-semibold px-8 py-4 rounded-xl text-lg hover:bg-[#16a34a] transition-all hover:scale-105"
            >
              Find Ad Space
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/signup?role=host"
              className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-white/10 transition-all hover:scale-105"
            >
              List Your Space
            </Link>
          </div>

          {/* Social proof */}
          <p className="mt-10 text-sm text-white/30">
            Trusted by brands and local businesses across the US
          </p>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-white/5 py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '2,400+', label: 'Active placements' },
            { value: '180+', label: 'Cities covered' },
            { value: '$0', label: 'Listing fee' },
            { value: '48hr', label: 'Avg. booking time' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-3xl font-bold text-[#22c55e] mb-1">{stat.value}</div>
              <div className="text-sm text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Dead simple to use</h2>
            <p className="text-white/40 text-lg">From search to live in three steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: MapPin,
                title: 'Find your spot',
                desc: 'Browse thousands of verified ad placements by location, format, and budget. See traffic data, photos, and real specs.',
              },
              {
                step: '02',
                icon: CheckCircle,
                title: 'Book instantly',
                desc: 'Select your dates, upload your creative, and pay securely through Stripe. No haggling, no phone calls.',
              },
              {
                step: '03',
                icon: TrendingUp,
                title: 'Go live',
                desc: 'Your host posts the ad and submits proof of posting. You see it happen. Track your campaign from your dashboard.',
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative p-8 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-[#22c55e]/30 transition-colors group"
              >
                <div className="text-6xl font-black text-white/5 absolute top-6 right-6 leading-none">
                  {item.step}
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#22c55e]/10 flex items-center justify-center mb-5">
                  <item.icon className="w-5 h-5 text-[#22c55e]" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{item.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Hosts */}
      <section id="for-hosts" className="py-24 px-6 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Users className="w-3 h-3" />
              For hosts
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight">
              Turn empty walls into passive income
            </h2>
            <p className="text-white/40 mb-8 leading-relaxed">
              Own a storefront, parking lot, vehicle fleet, or event space? List it on City Feed and start earning from advertisers looking for exactly what you have.
            </p>
            <ul className="space-y-4">
              {[
                'Free to list — no upfront costs',
                'You set the price and availability',
                'Stripe payouts directly to your account',
                'Verified advertisers only',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-white/60">
                  <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup?role=host"
              className="mt-10 inline-flex items-center gap-2 bg-[#22c55e] text-black font-semibold px-6 py-3 rounded-xl hover:bg-[#16a34a] transition-colors"
            >
              Start listing today
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Visual placeholder */}
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-[#22c55e]/10 to-[#22c55e]/0 border border-[#22c55e]/10 flex items-center justify-center">
              <div className="text-center">
                <div className="text-7xl font-black text-[#22c55e]/20 mb-4">$$$</div>
                <div className="text-white/20 text-sm">Your space, earning for you</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-center">
          {[
            { icon: Shield, title: 'Secure payments', desc: 'Stripe-powered escrow. Funds release only after proof of posting.' },
            { icon: CheckCircle, title: 'Verified hosts', desc: 'Every listing goes through manual review before going live.' },
            { icon: Zap, title: 'Instant booking', desc: 'No back-and-forth. Book a placement in under 5 minutes.' },
          ].map((item) => (
            <div key={item.title} className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[#22c55e]/10 flex items-center justify-center">
                <item.icon className="w-6 h-6 text-[#22c55e]" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-white/40 text-sm">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to get your brand{' '}
            <span className="text-[#22c55e]">out there?</span>
          </h2>
          <p className="text-white/40 mb-10 text-lg">
            Join thousands of advertisers and hosts already on City Feed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-[#22c55e] text-black font-semibold px-8 py-4 rounded-xl text-lg hover:bg-[#16a34a] transition-colors"
            >
              Create free account
            </Link>
            <Link
              href="/marketplace"
              className="bg-white/5 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl text-lg hover:bg-white/10 transition-colors"
            >
              Browse placements
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#22c55e] flex items-center justify-center">
              <MapPin className="w-3 h-3 text-black" />
            </div>
            <span className="font-bold text-sm">City Feed</span>
          </div>
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} City Feed. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-white/30">
            <Link href="#" className="hover:text-white/60 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="#" className="hover:text-white/60 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
