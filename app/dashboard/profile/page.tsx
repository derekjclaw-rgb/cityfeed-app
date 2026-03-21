'use client'

/**
 * Private Dashboard Profile — view & edit your own profile
 */
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Camera, Loader2, CheckCircle, AlertCircle,
  User, Mail, FileText, Calendar
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  bio?: string
  avatar_url?: string
  created_at: string
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium"
      style={type === 'success'
        ? { backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d' }
        : { backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }
      }
    >
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {message}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Form state
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setBio(data.bio || '')
      }
      setLoading(false)
    })
  }, [router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, bio })
      .eq('id', profile!.id)

    if (error) {
      showToast('Failed to save changes.', 'error')
    } else {
      setProfile(prev => prev ? { ...prev, full_name: fullName, bio } : null)
      showToast('Profile updated!', 'success')
    }
    setSaving(false)
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploadingPhoto(true)

    const supabase = createClient()
    const path = `avatars/${profile.id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('listing-images')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      showToast('Photo upload failed.', 'error')
      setUploadingPhoto(false)
      return
    }

    const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
    const avatarUrl = data.publicUrl

    await supabase.from('profiles').update({ avatar_url: avatarUrl }).eq('id', profile.id)
    setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null)
    showToast('Photo updated!', 'success')
    setUploadingPhoto(false)
  }

  const inputStyle = {
    backgroundColor: '#f4f4f0',
    border: '1px solid #d4d4c9',
    color: '#2b2b2b',
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#e6e6dd' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#e6964d' }} />
      </div>
    )
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : 'Unknown'

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U'

  return (
    <div className="min-h-screen pt-20 px-6 pb-12" style={{ backgroundColor: '#e6e6dd' }}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="hover:opacity-70 transition-opacity" style={{ color: '#888' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>My Profile</h1>
            <p className="text-sm" style={{ color: '#888' }}>Manage your personal information</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="rounded-2xl p-8 mb-6" style={{ backgroundColor: '#fff', border: '1px solid #d4d4c9', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {/* Avatar */}
          <div className="flex items-center gap-6 mb-8">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-20 h-20 rounded-full object-cover"
                  style={{ border: '3px solid #e6964d' }}
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-bold"
                  style={{ backgroundColor: 'rgba(230,150,77,0.15)', color: '#e6964d', border: '3px solid #e6964d' }}
                >
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#e6964d', color: '#fff', border: '2px solid #fff' }}
              >
                {uploadingPhoto ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ color: '#2b2b2b' }}>{profile?.full_name}</h2>
              <p className="text-sm mb-1" style={{ color: '#888' }}>{profile?.email}</p>
              <span
                className="inline-block text-xs font-semibold px-3 py-1 rounded-full capitalize"
                style={{ backgroundColor: 'rgba(230,150,77,0.15)', color: '#e6964d' }}
              >
                {profile?.role}
              </span>
            </div>
          </div>

          {/* Info rows */}
          <div className="grid grid-cols-2 gap-4 mb-8 p-4 rounded-xl" style={{ backgroundColor: '#f8f8f5' }}>
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#e6964d' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#aaa' }}>Email</p>
                <p className="text-sm" style={{ color: '#2b2b2b' }}>{profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 flex-shrink-0" style={{ color: '#e6964d' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#aaa' }}>Role</p>
                <p className="text-sm capitalize" style={{ color: '#2b2b2b' }}>{profile?.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: '#e6964d' }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#aaa' }}>Member Since</p>
                <p className="text-sm" style={{ color: '#2b2b2b' }}>{memberSince}</p>
              </div>
            </div>

          </div>

          {/* Edit form */}
          <form onSubmit={handleSave} className="space-y-5">
            <h3 className="font-semibold" style={{ color: '#2b2b2b' }}>Edit Profile</h3>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#555' }}>
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#aaa' }} />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#555' }}>
                Bio <span style={{ color: '#aaa' }}>(optional)</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4" style={{ color: '#aaa' }} />
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell others about yourself..."
                  rows={3}
                  className="w-full rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none resize-none"
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 font-semibold py-3 rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: '#e6964d', color: '#fff' }}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Changes
              </button>
              <Link
                href={`/profile/${profile?.id}`}
                className="px-5 py-3 rounded-xl font-medium text-sm flex items-center hover:opacity-80 transition-opacity"
                style={{ border: '1px solid #d4d4c9', color: '#555', backgroundColor: '#fff' }}
              >
                View Public Profile
              </Link>
            </div>
          </form>
        </div>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
