'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Mail, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#22c55e' }} />
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Check your email</h1>
              <p className="text-sm mb-6" style={{ color: '#888' }}>
                We sent a password reset link to <strong style={{ color: '#2b2b2b' }}>{email}</strong>. Click the link in the email to reset your password.
              </p>
              <p className="text-xs" style={{ color: '#888' }}>
                Didn&apos;t receive it? Check your spam folder or{' '}
                <button onClick={() => setSent(false)} className="font-medium" style={{ color: '#7ecfc0' }}>try again</button>.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Reset your password</h1>
              <p className="text-sm mb-8" style={{ color: '#888' }}>
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: '#555' }} htmlFor="email">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#888' }} />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
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
                  Send reset link
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm mt-6" style={{ color: '#888' }}>
          <Link href="/login" className="inline-flex items-center gap-1 font-medium transition-opacity hover:opacity-80" style={{ color: '#7ecfc0' }}>
            <ArrowLeft className="w-3 h-3" /> Back to login
          </Link>
        </p>
      </div>
    </div>
  )
}
