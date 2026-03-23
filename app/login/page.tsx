'use client'

/**
 * Login page — Supabase email/password auth
 * Handles ?confirmed=true message after email verification
 */
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') || '/dashboard'
  const confirmed = searchParams.get('confirmed') === 'true'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(redirectTo)
      router.refresh()
    }
  }

  const inputStyle = {
    backgroundColor: '#f4f4f0',
    border: '1px solid #d4d4c9',
    color: '#2b2b2b',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20" style={{ backgroundColor: '#e6e6dd' }}>
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Welcome back</h1>
          <p className="text-sm mb-6" style={{ color: '#888' }}>Sign in to your account</p>

          {/* Email confirmed success message */}
          {confirmed && (
            <div className="flex items-start gap-3 rounded-xl px-4 py-3 mb-6" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#16a34a' }} />
              <p className="text-sm" style={{ color: '#15803d' }}>
                Your email has been confirmed! Sign in below to get started.
              </p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              Sign in
            </button>
          </form>

          {/* Forgot password */}
          <div className="mt-5 text-center">
            <Link href="/forgot-password" className="text-xs transition-opacity hover:opacity-70" style={{ color: '#888' }}>
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm mt-6" style={{ color: '#888' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium transition-opacity hover:opacity-80" style={{ color: '#e6964d' }}>
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e6e6dd' }}><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#e6964d' }} /></div>}>
      <LoginForm />
    </Suspense>
  )
}
