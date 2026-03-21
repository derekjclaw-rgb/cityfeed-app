'use client'

/**
 * Signup page — email/password with role selection, new color palette
 */
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, Megaphone, Building2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Check if email confirmation is needed
      const supabase2 = createClient()
      const { data: { session } } = await supabase2.auth.getSession()
      if (session) {
        // Auto-confirmed, redirect to dashboard
        router.push('/dashboard')
        router.refresh()
      } else {
        // Email confirmation needed
        setSuccess(true)
      }
    }
  }

  const inputStyle = {
    backgroundColor: '#f4f4f0',
    border: '1px solid #d4d4c9',
    color: '#2b2b2b',
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(230,150,77,0.12)', border: '1px solid rgba(230,150,77,0.3)' }}>
          <Check className="w-8 h-8" style={{ color: '#e6964d' }} />
        </div>
        <h2 className="text-2xl font-bold mb-3" style={{ color: '#2b2b2b' }}>Check your email</h2>
        <p className="text-sm mb-6" style={{ color: '#888' }}>
          We sent a confirmation link to <strong style={{ color: '#555' }}>{email}</strong>.
          Click it to activate your account.
        </p>
        <Link
          href="/login"
          className="font-medium text-sm transition-opacity hover:opacity-80"
          style={{ color: '#e6964d' }}
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Create your account</h1>
      <p className="text-sm mb-8" style={{ color: '#888' }}>Free forever. No credit card required.</p>

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
            className="flex flex-col items-center gap-2 p-4 rounded-xl transition-all"
            style={
              role === option.value
                ? { border: '1px solid #e6964d', backgroundColor: 'rgba(230,150,77,0.08)', color: '#2b2b2b' }
                : { border: '1px solid #d4d4c9', backgroundColor: '#fff', color: '#888' }
            }
          >
            <option.icon className="w-5 h-5" style={{ color: role === option.value ? '#e6964d' : '#aaa' }} />
            <div>
              <div className="font-semibold text-sm">{option.label}</div>
              <div className="text-xs opacity-70">{option.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <form onSubmit={handleSignup} className="space-y-5">
        {/* Full name */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#555' }} htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#555' }} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
            style={inputStyle}
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: '#555' }} htmlFor="password">
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
              className="w-full rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none transition-colors"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-70"
              style={{ color: '#888' }}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full font-semibold py-3 rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ backgroundColor: '#e6964d', color: '#fff', boxShadow: '0 4px 16px rgba(230,150,77,0.35)' }}
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Create account
        </button>

        <p className="text-center text-xs" style={{ color: '#aaa' }}>
          By signing up, you agree to our{' '}
          <Link href="#" className="underline hover:opacity-70">Terms</Link>{' '}
          and{' '}
          <Link href="#" className="underline hover:opacity-70">Privacy Policy</Link>
        </p>
      </form>
    </>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20" style={{ backgroundColor: '#e6e6dd' }}>
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <Suspense fallback={<div className="text-sm" style={{ color: '#888' }}>Loading...</div>}>
            <SignupForm />
          </Suspense>
        </div>

        {/* Sign in link */}
        <p className="text-center text-sm mt-6" style={{ color: '#888' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-medium transition-opacity hover:opacity-80" style={{ color: '#e6964d' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
