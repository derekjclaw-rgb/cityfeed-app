'use client'

/**
 * Signup page — email/password with role selection (light theme)
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
        <div className="w-16 h-16 rounded-full bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8 text-[#22c55e]" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h2>
        <p className="text-gray-500 text-sm mb-6">
          We sent a confirmation link to <strong className="text-gray-700">{email}</strong>.
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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h1>
      <p className="text-gray-500 text-sm mb-8">Free forever. No credit card required.</p>

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
                ? 'border-[#22c55e] bg-green-50 text-gray-900'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            <option.icon className={`w-5 h-5 ${role === option.value ? 'text-[#22c55e]' : 'text-gray-400'}`} />
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
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="fullName">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-green-100 transition-colors text-sm"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-green-100 transition-colors text-sm"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
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
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 pr-11 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#22c55e] focus:ring-2 focus:ring-green-100 transition-colors text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#22c55e] text-white font-semibold py-3 rounded-xl hover:bg-[#16a34a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-200"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Create account
        </button>

        <p className="text-center text-xs text-gray-400">
          By signing up, you agree to our{' '}
          <Link href="#" className="underline hover:text-gray-600">Terms</Link>{' '}
          and{' '}
          <Link href="#" className="underline hover:text-gray-600">Privacy Policy</Link>
        </p>
      </form>
    </>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 pt-20">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <Suspense fallback={<div className="text-gray-400 text-sm">Loading...</div>}>
            <SignupForm />
          </Suspense>
        </div>

        {/* Sign in link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#22c55e] hover:text-[#16a34a] font-medium transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
