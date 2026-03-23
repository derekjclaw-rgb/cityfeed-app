'use client'

/**
 * Stripe Connect Host Onboarding
 * Hosts connect their bank account here to receive payouts
 */
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, AlertCircle, Loader2, CreditCard, DollarSign, Shield, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  email: string
  full_name: string
  stripe_account_id?: string
  stripe_connected?: boolean
}

function StripeOnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')

  const success = searchParams.get('success') === 'true'
  const incomplete = searchParams.get('incomplete') === 'true'
  const refresh = searchParams.get('refresh') === 'true'
  const err = searchParams.get('error')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, stripe_account_id, stripe_connected')
        .eq('id', user.id)
        .single()

      if (data) setProfile({ ...data, email: user.email ?? '' })
      setLoading(false)
    })
  }, [router])

  async function handleConnect() {
    if (!profile) return
    setConnecting(true)
    setError('')

    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id, email: profile.email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start onboarding')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setConnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  const isConnected = profile?.stripe_connected === true

  return (
    <div className="min-h-screen pt-20 px-4 sm:px-6 pb-12" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="hover:opacity-70" style={{ color: '#888' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>Payout Setup</h1>
            <p className="text-sm" style={{ color: '#888' }}>Connect your bank account to receive payouts</p>
          </div>
        </div>

        {/* Status Banner */}
        {success && (
          <div className="flex items-center gap-3 rounded-xl px-5 py-4 mb-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#16a34a' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#16a34a' }}>Bank account connected!</p>
              <p className="text-xs mt-0.5" style={{ color: '#15803d' }}>You're all set to receive payouts when campaigns complete.</p>
            </div>
          </div>
        )}

        {incomplete && (
          <div className="flex items-center gap-3 rounded-xl px-5 py-4 mb-6" style={{ backgroundColor: '#fef9ec', border: '1px solid #fde68a' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#b45309' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: '#b45309' }}>Setup incomplete</p>
              <p className="text-xs mt-0.5" style={{ color: '#92400e' }}>Please complete your Stripe onboarding to receive payouts.</p>
            </div>
          </div>
        )}

        {(err || refresh) && (
          <div className="flex items-center gap-3 rounded-xl px-5 py-4 mb-6" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#dc2626' }} />
            <p className="text-sm" style={{ color: '#dc2626' }}>
              {refresh ? 'The onboarding link expired. Please try again.' : 'An error occurred. Please try again.'}
            </p>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {isConnected ? (
            <>
              {/* Connected State */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f0fdf4' }}>
                  <CheckCircle className="w-7 h-7" style={{ color: '#16a34a' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: '#2b2b2b' }}>Payouts: Connected ✅</h2>
                  <p className="text-sm" style={{ color: '#888' }}>Your bank account is linked and ready for payouts</p>
                </div>
              </div>

              <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: '#f8f8f5', border: '1px solid #e8e8e0' }}>
                <p className="text-xs font-semibold mb-2" style={{ color: '#888' }}>HOW PAYOUTS WORK</p>
                <ul className="space-y-2">
                  <li className="text-sm flex items-start gap-2" style={{ color: '#555' }}>
                    <span style={{ color: '#7ecfc0' }}>1.</span>
                    Advertiser completes their campaign and approves your POP
                  </li>
                  <li className="text-sm flex items-start gap-2" style={{ color: '#555' }}>
                    <span style={{ color: '#7ecfc0' }}>2.</span>
                    City Feed releases payment to your bank account (minus 7% platform fee)
                  </li>
                  <li className="text-sm flex items-start gap-2" style={{ color: '#555' }}>
                    <span style={{ color: '#7ecfc0' }}>3.</span>
                    Funds typically arrive in 2-3 business days
                  </li>
                </ul>
              </div>

              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ border: '1px solid #e0e0d8', color: '#555', backgroundColor: '#f8f8f5' }}
              >
                {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Bank Account
              </button>
            </>
          ) : (
            <>
              {/* Not Connected State */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#f0f8f5' }}>
                  <CreditCard className="w-7 h-7" style={{ color: '#7ecfc0' }} />
                </div>
                <div>
                  <h2 className="text-lg font-bold" style={{ color: '#2b2b2b' }}>Payouts: Setup Required ⚠️</h2>
                  <p className="text-sm" style={{ color: '#888' }}>Connect your bank to receive earnings from bookings</p>
                </div>
              </div>

              {/* Feature List */}
              <div className="space-y-3 mb-6">
                {[
                  { icon: DollarSign, text: 'Receive payouts directly to your bank account', color: '#16a34a' },
                  { icon: Shield, text: 'Powered by Stripe — bank-grade security', color: '#7ecfc0' },
                  { icon: Clock, text: 'Setup takes about 5 minutes', color: '#888' },
                ].map(({ icon: Icon, text, color }) => (
                  <div key={text} className="flex items-center gap-3">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}18` }}>
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                    <p className="text-sm" style={{ color: '#555' }}>{text}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm mb-4" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full font-semibold py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
              >
                {connecting && <Loader2 className="w-4 h-4 animate-spin" />}
                {connecting ? 'Redirecting to Stripe...' : 'Connect Your Bank Account'}
              </button>

              <p className="text-xs text-center mt-4" style={{ color: '#aaa' }}>
                You'll be redirected to Stripe to complete setup securely.
              </p>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link href="/dashboard" className="text-sm hover:opacity-70" style={{ color: '#888' }}>
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function StripeOnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: "#f0f0ec" }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    }>
      <StripeOnboardingContent />
    </Suspense>
  )
}
