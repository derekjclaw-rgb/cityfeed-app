'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, Lock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    async function initialize() {
      // Check for PKCE code in URL params (Supabase SSR / PKCE flow)
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')

      if (code) {
        try {
          const { data, error: exchError } = await supabase.auth.exchangeCodeForSession(code)
          if (!exchError && data.session) {
            setSessionReady(true)
            // Clean up the URL so code isn't reused
            window.history.replaceState({}, '', '/reset-password')
          }
        } catch {
          // Exchange failed — fall through to show "invalid link"
        }
        setSessionChecked(true)
        return
      }

      // Hash / implicit flow — listen for PASSWORD_RECOVERY event
      // Supabase fires this when it detects #access_token=...&type=recovery in the URL
      let authEventFired = false

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
          authEventFired = true
          setSessionReady(true)
          setSessionChecked(true)
        }
      })

      // Give onAuthStateChange up to 1.5s to fire (hash processing is async)
      // then fall back to getSession() for the "already logged in" case
      const hasHashToken = window.location.hash.includes('access_token')

      if (hasHashToken) {
        // Wait for Supabase to process the hash and fire the auth event
        setTimeout(async () => {
          if (!authEventFired) {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) setSessionReady(true)
            setSessionChecked(true)
          }
        }, 1500)
      } else {
        // No hash, no code — check if there's already an active session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setSessionReady(true)
        }
        setSessionChecked(true)
      }

      return () => subscription.unsubscribe()
    }

    initialize()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl p-8" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#22c55e' }} />
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Password updated</h1>
            <p className="text-sm" style={{ color: '#888' }}>Redirecting you to login...</p>
          </div>
        </div>
      </div>
    )
  }

  // Waiting for session detection
  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  // No valid session found — invalid/expired link
  if (sessionChecked && !sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl p-8" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <AlertCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#E63946' }} />
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Invalid or expired link</h1>
            <p className="text-sm mb-6" style={{ color: '#888' }}>
              This password reset link has expired or is invalid. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block font-semibold px-6 py-3 rounded-xl text-sm hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
            >
              Request new link
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Set new password</h1>
          <p className="text-sm mb-8" style={{ color: '#888' }}>Enter your new password below.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#555' }}>New password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none"
                  style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8', color: '#2b2b2b' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#555' }}>Confirm password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  className="w-full rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none"
                  style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8', color: '#2b2b2b' }}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
