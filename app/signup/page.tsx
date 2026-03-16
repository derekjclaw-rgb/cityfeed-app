'use client'

/**
 * Signup page — email/password with role selection (advertiser | host)
 */
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapPin, Eye, EyeOff, Loader2, Megaphone, Building2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

type Role = 'advertiser' | 'host'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = (searchParams.get('role') as Role) || 'advertiser'

  const [role, setRole] = useState<Role>(defaultRole)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-[#22c55e]" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Check your email</h2>
        <p className="text-white/40 text-sm mb-6">
          We sent a confirmation link to <strong className="text-white/60">{email}</strong>.
          Click it to activate your account.
        </p>
        <Link
          href="/login"
          className="text-[#22c55e] hover:text-[#16a34a] font-medium text-sm transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-2">Create your account</h1>
      <p className="text-white/40 text-sm mb-8">Free forever. No credit card required.</p>

      {/* Role selector */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { value: 'advertiser' as Role, icon: Megaphone, label: 'Advertiser', desc: 'Find ad space' },
          { value: 'host' as Role, icon: Building2, label: 'Host', desc: 'List your space' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRole(option.value)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
              role === option.value
                ? 'border-[#22c55e] bg-[#22c55e]/10 text-white'
                : 'border-white/[0.08] bg-white/[0.02] text-white/40 hover:border-white/20'
            }`}
          >
            <option.icon className={`w-5 h-5 ${role === option.value ? 'text-[#22c55e]' : ''}`} />
            <div>
              <div className="font-semibold text-sm">{option.label}</div>
              <div className="text-xs opacity-60">{option.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={handleSignup} className="space-y-5">
        {/* Full name */}
        <div>
          <label className="block text-sm text-white/60 mb-2" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-colors text-sm"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm text-white/60 mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-colors text-sm"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm text-white/60 mb-2" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 pr-11 text-white placeholder:text-white/20 focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20 transition-colors text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#22c55e] text-black font-semibold py-3 rounded-xl hover:bg-[#16a34a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Create account
        </button>

        <p className="text-center text-xs text-white/20">
          By signing up, you agree to our{' '}
          <Link href="#" className="underline hover:text-white/40">Terms</Link>{' '}
          and{' '}
          <Link href="#" className="underline hover:text-white/40">Privacy Policy</Link>
        </p>
      </form>
    </>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-8 h-8 rounded bg-[#22c55e] flex items-center justify-center">
            <MapPin className="w-5 h-5 text-black" />
          </div>
          <span className="font-bold text-xl text-white tracking-tight">City Feed</span>
        </Link>

        {/* Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8">
          <Suspense fallback={<div className="text-white/40 text-sm">Loading...</div>}>
            <SignupForm />
          </Suspense>
        </div>

        {/* Sign in link */}
        <p className="text-center text-sm text-white/30 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#22c55e] hover:text-[#16a34a] font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
