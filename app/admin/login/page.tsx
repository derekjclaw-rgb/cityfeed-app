'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        router.push('/admin')
      } else {
        setError('Invalid password')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#2b2b2b' }}>
      <div className="w-full max-w-sm p-8 rounded-xl" style={{ background: '#363636', border: '1px solid #4a4a4a' }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ background: '#debb73' }}>
            <Lock className="w-7 h-7" style={{ color: '#2b2b2b' }} />
          </div>
          <h1 className="text-xl font-semibold text-white">City Feed Admin</h1>
          <p className="text-sm mt-1" style={{ color: '#999' }}>God View — Founder Access</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg text-white placeholder-gray-500 outline-none focus:ring-2"
            style={{ background: '#2b2b2b', border: '1px solid #4a4a4a' }}
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 rounded-lg font-medium transition-opacity disabled:opacity-50"
            style={{ background: '#debb73', color: '#2b2b2b' }}
          >
            {loading ? 'Authenticating...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
