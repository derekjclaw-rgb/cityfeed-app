'use client'

/**
 * Review POP (Proof of Posting) — Advertiser view
 * Shows POP photos uploaded by host, with Approve/Request Changes actions
 */
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CheckCircle, RotateCcw, Camera, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface POPFile {
  name: string
  url: string
  type: string
}

export default function POPReviewPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<'approve' | 'changes' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [files, setFiles] = useState<POPFile[]>([])
  const [bookingStatus, setBookingStatus] = useState('')
  const [listingTitle, setListingTitle] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [advertiserIdFromBooking, setAdvertiserIdFromBooking] = useState<string | null>(null)
  const [hostId, setHostId] = useState<string | null>(null)
  const [changesNote, setChangesNote] = useState('')
  const [showChangesInput, setShowChangesInput] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setCurrentUserId(user.id)

      // Fetch booking
      const { data: booking, error: bkErr } = await supabase
        .from('bookings')
        .select('status, advertiser_id, host_id, listings(title)')
        .eq('id', bookingId)
        .single()

      if (bkErr || !booking) {
        setError('Booking not found')
        setLoading(false)
        return
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bk = booking as any
      setBookingStatus(bk.status)
      setListingTitle(bk.listings?.title ?? 'Booking')
      setAdvertiserIdFromBooking(bk.advertiser_id)
      setHostId(bk.host_id)

      // Must be the advertiser to review
      if (bk.advertiser_id !== user.id) {
        setError('Only the advertiser can review proof of posting.')
        setLoading(false)
        return
      }

      // Load POP files from storage
      const folderPath = `pop/${bookingId}`
      const { data: storageItems } = await supabase.storage
        .from('booking-collateral')
        .list(folderPath)

      if (storageItems && storageItems.length > 0) {
        const withUrls: POPFile[] = await Promise.all(
          storageItems.map(async (item) => {
            const { data: urlData } = await supabase.storage
              .from('booking-collateral')
              .createSignedUrl(`${folderPath}/${item.name}`, 3600)
            return {
              name: item.name,
              url: urlData?.signedUrl ?? '',
              type: item.metadata?.mimetype ?? '',
            }
          })
        )
        setFiles(withUrls.filter(f => f.url))
      }

      setLoading(false)
    }
    load()
  }, [bookingId, router])

  async function handleApprove() {
    if (!currentUserId || !hostId) return
    setActionLoading('approve')
    setError('')

    const supabase = createClient()

    // Update booking status
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId)

    if (updateErr) {
      setError(updateErr.message)
      setActionLoading(null)
      return
    }

    // Trigger payout to host
    try {
      const payoutRes = await fetch('/api/stripe/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })
      if (!payoutRes.ok) {
        const payoutData = await payoutRes.json()
        console.error('[POPReview] Payout failed:', payoutData.error)
      }
    } catch (payoutErr) {
      console.error('[POPReview] Payout request failed:', payoutErr)
    }

    // Auto-message: POP approved — campaign is LIVE (not "complete" yet)
    await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: currentUserId,
      recipient_id: hostId,
      content: 'POP approved! Your ad is now LIVE 🟢',
    })

    // Notification to host
    await supabase.from('notifications').insert({
      user_id: hostId,
      type: 'pop_approved',
      title: 'POP Approved!',
      body: `Your proof of posting for "${listingTitle}" was approved. Payout is being processed.`,
      href: `/dashboard/bookings/${bookingId}`,
    })

    // Email notification
    try {
      const { data: hostProfile } = await supabase
        .from('profiles').select('email, full_name').eq('id', hostId).single()
      if (hostProfile?.email) {
        await fetch('/api/email/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'pop_approved',
            hostEmail: hostProfile.email,
            hostName: hostProfile.full_name,
            listingTitle,
            bookingId,
          }),
        })
      }
    } catch { /* non-fatal */ }

    setActionLoading(null)
    setSuccess('POP approved! Campaign is now complete.')
    setTimeout(() => router.push(`/dashboard/bookings/${bookingId}`), 2000)
  }

  async function handleRequestChanges() {
    if (!currentUserId || !hostId) return
    if (!changesNote.trim()) {
      setError('Please describe what changes you need.')
      return
    }
    setActionLoading('changes')
    setError('')

    const supabase = createClient()

    // Send message to host
    await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: currentUserId,
      recipient_id: hostId,
      content: `🔄 The advertiser has requested changes to the proof of posting. Please review and resubmit.\n\nNote: ${changesNote.trim()}`,
    })

    // Notification
    await supabase.from('notifications').insert({
      user_id: hostId,
      type: 'pop_changes_requested',
      title: 'POP Changes Requested',
      body: `Changes requested for "${listingTitle}": ${changesNote.trim()}`,
      href: `/dashboard/bookings/${bookingId}`,
    })

    setActionLoading(null)
    setShowChangesInput(false)
    setChangesNote('')
    setSuccess('Change request sent to host.')
    setTimeout(() => router.push(`/dashboard/bookings/${bookingId}`), 2000)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  const alreadyActed = bookingStatus === 'completed' || (success !== '')
  const canReview = ['pop_pending', 'pop_review'].includes(bookingStatus) && currentUserId === advertiserIdFromBooking

  return (
    <div className="min-h-screen pt-16 pb-20" style={{ backgroundColor: '#f0f0ec' }}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Link href={`/dashboard/bookings/${bookingId}`} className="flex items-center gap-2 text-sm mb-8 hover:opacity-70" style={{ color: '#888' }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Booking
        </Link>

        <div className="flex items-start gap-3 mb-6">
          <div className="p-3 rounded-xl flex-shrink-0" style={{ backgroundColor: 'rgba(126,207,192,0.1)' }}>
            <Camera className="w-6 h-6" style={{ color: '#7ecfc0' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2b2b2b' }}>Review Proof of Posting</h1>
            <p className="text-sm mt-0.5" style={{ color: '#888' }}>{listingTitle}</p>
          </div>
        </div>

        {/* Error */}
        {error && !canReview && !alreadyActed && (
          <div className="rounded-xl px-5 py-4 mb-6 flex items-center gap-3" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#dc2626' }} />
            <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {/* Success state */}
        {success && (
          <div className="rounded-xl px-5 py-4 mb-6 flex items-center gap-3" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: '#16a34a' }} />
            <p className="text-sm font-semibold" style={{ color: '#16a34a' }}>{success}</p>
          </div>
        )}

        {/* Already completed */}
        {bookingStatus === 'completed' && !success && (
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <CheckCircle className="w-12 h-12 mx-auto mb-4" style={{ color: '#16a34a' }} />
            <h2 className="text-lg font-bold mb-2" style={{ color: '#2b2b2b' }}>Campaign Complete</h2>
            <p className="text-sm mb-6" style={{ color: '#888' }}>This booking has already been completed.</p>
            <Link href={`/dashboard/bookings/${bookingId}`} className="text-sm font-medium" style={{ color: '#7ecfc0' }}>← Back to Booking</Link>
          </div>
        )}

        {/* POP photos */}
        {canReview && (
          <div className="space-y-6">
            <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <h2 className="text-sm font-semibold mb-4 uppercase tracking-wide" style={{ color: '#888' }}>Proof Photos</h2>

              {files.length === 0 ? (
                <div className="text-center py-8">
                  <Camera className="w-10 h-10 mx-auto mb-3" style={{ color: '#ccc' }} />
                  <p className="text-sm" style={{ color: '#888' }}>No proof photos uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {files.map(f => (
                    <div key={f.name} className="rounded-xl overflow-hidden" style={{ border: '1px solid #e0e0d8' }}>
                      {f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(f.name) ? (
                        <a href={f.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={f.url}
                            alt={f.name}
                            className="w-full object-cover"
                            style={{ maxHeight: '300px' }}
                          />
                        </a>
                      ) : (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 hover:opacity-80 transition-opacity"
                          style={{ color: '#7ecfc0' }}
                        >
                          <Camera className="w-5 h-5" />
                          <span className="text-sm truncate">{f.name}</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {!alreadyActed && (
              <div className="rounded-2xl p-6" style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <h2 className="text-sm font-semibold mb-4" style={{ color: '#2b2b2b' }}>Your Decision</h2>
                <p className="text-sm mb-5" style={{ color: '#555' }}>
                  Review the proof above. If the ad looks correct and your campaign ran as expected, approve it to release the payout to the host.
                </p>

                {error && (
                  <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2 mb-4" style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {!showChangesInput ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading !== null}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: '#debb73', color: '#2b2b2b', boxShadow: '0 4px 16px rgba(222,187,115,0.35)' }}
                    >
                      {actionLoading === 'approve'
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <CheckCircle className="w-4 h-4" />
                      }
                      Approve POP ✅
                    </button>
                    <button
                      onClick={() => setShowChangesInput(true)}
                      disabled={actionLoading !== null}
                      className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#555' }}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Request Changes 🔄
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={changesNote}
                      onChange={e => setChangesNote(e.target.value)}
                      rows={3}
                      placeholder="Describe what changes you need the host to make..."
                      className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                      style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8', color: '#2b2b2b' }}
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={handleRequestChanges}
                        disabled={actionLoading !== null}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: '#fff', border: '1px solid #e0e0d8', color: '#555' }}
                      >
                        {actionLoading === 'changes'
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <RotateCcw className="w-4 h-4" />
                        }
                        Send Request 🔄
                      </button>
                      <button
                        onClick={() => { setShowChangesInput(false); setChangesNote(''); setError('') }}
                        className="px-4 py-3 rounded-xl text-sm hover:opacity-70"
                        style={{ color: '#888' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
