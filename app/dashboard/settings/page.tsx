'use client'

/**
 * Settings page — stub (account settings coming soon)
 */
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="min-h-screen pt-20 px-6 pb-12" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="hover:opacity-70" style={{ color: '#888' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>Settings</h1>
        </div>

        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Settings className="w-12 h-12 mx-auto mb-4" style={{ color: '#e0e0d8' }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#2b2b2b' }}>Account Settings</h2>
          <p className="text-sm mb-6" style={{ color: '#888' }}>
            Notification preferences, password changes, and account management coming soon.
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-block px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
          >
            Edit Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
