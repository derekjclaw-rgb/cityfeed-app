'use client'

/**
 * Settings page — account settings with email notification preferences
 */
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle, Bell, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Profile {
  id: string
  full_name: string
  email: string
  email_notifications?: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [emailNotifs, setEmailNotifs] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }

      const { data: p } = await supabase
        .from('profiles')
        .select('id, full_name, email, email_notifications')
        .eq('id', data.user.id)
        .single()

      if (p) {
        setProfile(p)
        setEmailNotifs(p.email_notifications !== false) // default true
      }
      setLoading(false)
    })
  }, [router])

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    const supabase = createClient()
    await supabase
      .from('profiles')
      .update({ email_notifications: emailNotifs })
      .eq('id', profile.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 px-6 pb-12" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="hover:opacity-70" style={{ color: '#888' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>Settings</h1>
        </div>

        {/* Account info */}
        <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 className="font-semibold mb-4" style={{ color: '#2b2b2b' }}>Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span style={{ color: '#888' }}>Name</span>
              <span style={{ color: '#2b2b2b' }}>{profile?.full_name || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: '#888' }}>Email</span>
              <span style={{ color: '#2b2b2b' }}>{profile?.email || '—'}</span>
            </div>
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #f0f0ec' }}>
            <Link
              href="/dashboard/profile"
              className="text-sm font-medium hover:opacity-70"
              style={{ color: '#7ecfc0' }}
            >
              Edit Profile →
            </Link>
          </div>
        </div>

        {/* Password */}
        <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h2 className="font-semibold mb-2" style={{ color: '#2b2b2b' }}>Password</h2>
          <p className="text-sm mb-4" style={{ color: '#888' }}>Use the forgot password flow to reset your password via email.</p>
          <Link
            href="/forgot-password"
            className="text-sm font-medium hover:opacity-70"
            style={{ color: '#7ecfc0' }}
          >
            Reset Password →
          </Link>
        </div>

        {/* Notification preferences */}
        <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5" style={{ color: '#7ecfc0' }} />
            <h2 className="font-semibold" style={{ color: '#2b2b2b' }}>Notification Preferences</h2>
          </div>

          {/* Email notifications toggle */}
          <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid #f0f0ec' }}>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4" style={{ color: '#888' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#2b2b2b' }}>Email notifications</p>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                  Booking confirmations, approvals, and important updates
                </p>
              </div>
            </div>
            <button
              onClick={() => setEmailNotifs(!emailNotifs)}
              className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ backgroundColor: emailNotifs ? '#7ecfc0' : '#e0e0d8' }}
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ transform: emailNotifs ? 'translateX(20px)' : 'translateX(2px)' }}
              />
            </button>
          </div>

          <p className="text-xs mt-3" style={{ color: '#aaa' }}>
            In-app notifications are always enabled and cannot be disabled.
          </p>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saved ? (
              <><CheckCircle className="w-4 h-4" /> Saved!</>
            ) : (
              'Save preferences'
            )}
          </button>
        </div>

        {/* Notifications link */}
        <div className="rounded-2xl p-5" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Link href="/dashboard/notifications" className="flex items-center justify-between hover:opacity-70">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5" style={{ color: '#7ecfc0' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: '#2b2b2b' }}>View all notifications</p>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>See your full notification history</p>
              </div>
            </div>
            <span style={{ color: '#ccc' }}>→</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
