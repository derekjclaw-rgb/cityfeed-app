'use client'

/**
 * Settings page — stub (account settings coming soon)
 */
import Link from 'next/link'
import { ArrowLeft, Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="min-h-screen pt-20 px-6 pb-12" style={{ backgroundColor: '#e6e6dd' }}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="hover:opacity-70" style={{ color: '#888' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>Settings</h1>
        </div>

        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Settings className="w-12 h-12 mx-auto mb-4" style={{ color: '#d4d4c9' }} />
          <h2 className="text-lg font-semibold mb-2" style={{ color: '#2b2b2b' }}>Account Settings</h2>
          <p className="text-sm mb-6" style={{ color: '#888' }}>
            Notification preferences, password changes, and account management coming soon.
          </p>
          <Link
            href="/dashboard/profile"
            className="inline-block px-5 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#e6964d', color: '#fff' }}
          >
            Edit Profile
          </Link>
        </div>
      </div>
    </div>
  )
}
