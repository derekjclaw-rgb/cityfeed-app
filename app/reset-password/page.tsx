'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

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
      <div className="min-h-screen flex items-center justify-center px-6 pt-20" style={{ backgroundColor: '#e6e6dd' }}>
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl p-8" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
            <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#22c55e' }} />
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#2b2b2b' }}>Password updated</h1>
            <p className="text-sm" style={{ color: '#888' }}>Redirecting you to login...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 pt-20" style={{ backgroundColor: '#e6e6dd' }}>
      <div className="w-full max-w-md">
        <div className="rounded-2xl p-8" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
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
                  style={{ backgroundColor: '#f4f4f0', border: '1px solid #d4d4c9', color: '#2b2b2b' }}
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
                  style={{ backgroundColor: '#f4f4f0', border: '1px solid #d4d4c9', color: '#2b2b2b' }}
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
              style={{ backgroundColor: '#e6964d', color: '#fff' }}
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
