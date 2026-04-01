'use client'

/**
 * Chat interface for a booking thread
 * Real-time via Supabase Realtime
 * v3: Progress bar, POP approval buttons, inline POP image display
 */
import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Loader2, ImageIcon, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

/** Format a full name as "First L." for privacy */
function formatName(fullName: string): string {
  if (!fullName) return 'Unknown'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`
}

// ─── Booking Progress Bar ─────────────────────────────────────────────────────

function BookingProgressBar({ status, endDate, buyNow, hasCreative }: { status: string; endDate?: string; buyNow?: boolean; hasCreative?: boolean }) {
  const now = new Date()
  const end = endDate ? new Date(endDate) : null
  const isLive = status === 'completed' && end && now < end
  const isFullyComplete = status === 'completed' && end != null && now >= end

  const approved = ['confirmed','active','pop_pending','pop_review','completed'].includes(status) || !!buyNow
  const creative = hasCreative || ['active','pop_pending','pop_review','completed'].includes(status)
  const proof = ['pop_pending','pop_review','completed'].includes(status)

  const dots = [
    { label: 'Booked', color: '#7ecfc0' },
    { label: 'Approved', color: approved ? '#7ecfc0' : '#ddd' },
    { label: 'Creative', color: creative ? '#7ecfc0' : '#ddd' },
    { label: isLive ? 'LIVE' : 'Proof', color: isLive ? '#16a34a' : proof ? '#7ecfc0' : '#ddd' },
    { label: 'Complete', color: isFullyComplete ? '#7ecfc0' : '#ddd' },
  ]

  const lines = [
    approved ? '#7ecfc0' : '#e0e0d8',
    creative ? '#7ecfc0' : '#e0e0d8',
    proof ? '#7ecfc0' : '#e0e0d8',
    isFullyComplete ? '#7ecfc0' : '#e0e0d8',
  ]

  /* Two-row approach: row 1 = dots + lines, row 2 = labels. No overlap possible. */
  return (
    <div style={{ borderBottom: '1px solid #e0e0d8', padding: '12px 12px 8px' }}>
      {/* Row 1: dots and lines */}
      <div style={{ display: 'grid', gridTemplateColumns: `20px 1fr 20px 1fr 20px 1fr 20px 1fr 20px`, alignItems: 'center', maxWidth: 360, margin: '0 auto' }}>
        {dots.map((d, i) => {
          const els = [<div key={`d${i}`} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: d.color, margin: '0 auto' }} />]
          if (i < lines.length) els.push(<div key={`l${i}`} style={{ height: 2, backgroundColor: lines[i] }} />)
          return els
        }).flat()}
      </div>
      {/* Row 2: labels */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', maxWidth: 360, margin: '4px auto 0', textAlign: 'center' }}>
        {dots.map((d, i) => (
          <div key={i} style={{ fontSize: 8, color: d.color !== '#ddd' ? '#555' : '#bbb', whiteSpace: 'nowrap' }}>{d.label}</div>
        ))}
      </div>
    </div>
  )
}

// ─── POP Approval Buttons ────────────────────────────────────────────────────

interface POPActionsProps {
  bookingId: string
  isAdvertiser: boolean
  bookingStatus: string
  hostId: string | null
  currentUserId: string | null
  listingTitle: string
  onStatusChange: (newStatus: string) => void
  onPrefillMessage?: (text: string) => void
}


function POPActions({ bookingId, isAdvertiser, bookingStatus }: POPActionsProps) {
  const showBanner = isAdvertiser && ['pop_pending', 'pop_review', 'completed'].includes(bookingStatus)
  if (!showBanner) return null

  return (
    <div className="px-6 py-3" style={{ backgroundColor: 'rgba(126,207,192,0.06)', borderBottom: '1px solid rgba(126,207,192,0.2)' }}>
      <p className="text-xs font-semibold" style={{ color: '#2b6b5e' }}>
        🟢 Your host has confirmed your ad placement is live! Check the proof photos above.
        {' '}<a
          href={`/dashboard/messages/${bookingId}`}
          className="underline underline-offset-2 hover:opacity-70 transition-opacity"
          style={{ color: '#7ecfc0' }}
        >
          Report an issue
        </a>
      </p>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Detect if a string contains a URL on its own line and return [text, imageUrl]
 * so we can render the image inline.
 */
function parseMessageContent(content: string): { text: string; extraImageUrls: string[] } {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const lines = content.split('\n')
  const extraImageUrls: string[] = []
  const textLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    const match = trimmed.match(/^(https?:\/\/\S+)$/)
    if (match) {
      const url = match[1]
      // Only treat as image if it looks like an image URL or is from supabase storage
      if (/\.(jpg|jpeg|png|webp|gif)/i.test(url) || url.includes('supabase') || url.includes('storage')) {
        extraImageUrls.push(url)
      } else {
        textLines.push(line)
      }
    } else {
      textLines.push(line)
    }
  }

  // Suppress lint warning for unused urlRegex
  void urlRegex

  return { text: textLines.join('\n').trim(), extraImageUrls }
}

// ─── Message types ─────────────────────────────────────────────────────────────

interface Message {
  id: string
  booking_id: string
  sender_id: string
  content: string
  image_url?: string
  created_at: string
  is_system?: boolean
}

const SYSTEM_PREFIXES = [
  '🎉 Your booking is confirmed',
  '📎 Creative files have been uploaded',
  '📸 Proof of posting submitted',
  'POP approved! Your ad is now LIVE',
  '🔄 The advertiser has requested changes',
  '🟢 Campaign is now LIVE',
  '🟢 Your ad is now live!',
  '🟢 Proof of posting approved!',
]

function isSystemMessage(msg: Message): boolean {
  if (msg.is_system) return true
  return SYSTEM_PREFIXES.some(prefix => msg.content.startsWith(prefix))
}

// ─── Main Chat Page ───────────────────────────────────────────────────────────

function ChatPageInner() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookingId = params.bookingId as string

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [recipientId, setRecipientId] = useState<string | null>(null)
  const [hostId, setHostId] = useState<string | null>(null)
  const [isAdvertiser, setIsAdvertiser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [bookingTitle, setBookingTitle] = useState('Conversation')
  const [bookingStatus, setBookingStatus] = useState('')
  const [bookingEndDate, setBookingEndDate] = useState<string | null>(null)
  const [buyNowEnabled, setBuyNowEnabled] = useState(false)
  const [listingTitle, setListingTitle] = useState('')
  const [otherPartyName, setOtherPartyName] = useState('Other party')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messageInputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Handle prefill from pop-review "request changes" redirect
  useEffect(() => {
    if (!loading && searchParams.get('prefill') === 'changes') {
      setNewMessage('Hey, could you update the proof of posting? I noticed ')
      setTimeout(() => messageInputRef.current?.focus(), 100)
      // Clear the param from URL without navigation
      const url = new URL(window.location.href)
      url.searchParams.delete('prefill')
      window.history.replaceState({}, '', url.toString())
    }
  }, [loading, searchParams])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      const uid = data.user.id
      setUserId(uid)

      // Fetch booking with host/advertiser info for names and recipient
      const { data: booking } = await supabase
        .from('bookings')
        .select(`
          host_id, advertiser_id, status, end_date,
          listings(title, buy_now_enabled),
          host:profiles!bookings_host_id_fkey(full_name),
          advertiser:profiles!bookings_advertiser_id_fkey(full_name)
        `)
        .eq('id', bookingId)
        .single()

      if (booking) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const b = booking as any
        const title = b.listings?.title ?? 'Conversation'
        setBookingTitle(title)
        setListingTitle(title)
        setBookingStatus(b.status ?? '')
        setBookingEndDate(b.end_date ?? null)
        setBuyNowEnabled(b.listings?.buy_now_enabled ?? false)
        setHostId(b.host_id)

        const isHost = uid === b.host_id
        setIsAdvertiser(uid === b.advertiser_id)
        const recipient = isHost ? b.advertiser_id : b.host_id
        setRecipientId(recipient)

        const otherName = isHost
          ? formatName(b.advertiser?.full_name ?? 'Advertiser')
          : formatName(b.host?.full_name ?? 'Host')
        setOtherPartyName(otherName)
      }

      // Fetch messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (msgs) setMessages(msgs)

      // Mark messages from other party as read
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('booking_id', bookingId)
        .neq('sender_id', uid)
        .eq('read', false)

      setLoading(false)

      // Subscribe to realtime
      const channel = supabase
        .channel(`messages:${bookingId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
          (payload) => {
            setMessages(prev => [...prev, payload.new as Message])
          }
        )
        .subscribe()

      channelRef.current = channel
    })

    return () => {
      if (channelRef.current) {
        const supabase = createClient()
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [bookingId, router])

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  function clearImage() {
    setImageFile(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if ((!newMessage.trim() && !imageFile) || !userId || !recipientId || sending) return
    setSending(true)

    const supabase = createClient()
    let imageUrl: string | undefined

    // Upload image if present
    if (imageFile) {
      const path = `messages/${bookingId}/${Date.now()}-${imageFile.name}`
      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(path, imageFile)
      if (!uploadError) {
        const { data } = supabase.storage.from('listing-images').getPublicUrl(path)
        imageUrl = data.publicUrl
      }
      clearImage()
    }

    const msgContent = newMessage.trim()
    setNewMessage('')

    const { data: inserted } = await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: userId,
      recipient_id: recipientId,
      content: msgContent,
      image_url: imageUrl,
    }).select().single()

    // Optimistically add to local state if realtime doesn't fire for the sender
    if (inserted) {
      setMessages(prev => {
        // Avoid duplicates in case realtime already added it
        if (prev.some(m => m.id === inserted.id)) return prev
        return [...prev, inserted as Message]
      })
    }

    setSending(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    )
  }

  return (
    <div className="flex flex-col pt-16" style={{ height: '100dvh', backgroundColor: '#f0f0ec' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4" style={{ backgroundColor: '#fff', borderBottom: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <Link href="/dashboard/messages" className="hover:opacity-70" style={{ color: '#888' }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm" style={{ color: '#2b2b2b' }}>{bookingTitle}</h1>
          <p className="text-xs" style={{ color: '#888' }}>with {otherPartyName}</p>
        </div>

      </div>

      {/* Progress bar — below header */}
      {bookingStatus && (
        <BookingProgressBar status={bookingStatus} endDate={bookingEndDate ?? undefined} buyNow={buyNowEnabled} />
      )}



      {/* POP Approval Buttons — for advertiser when POP pending */}
      <POPActions
        bookingId={bookingId}
        isAdvertiser={isAdvertiser}
        bookingStatus={bookingStatus}
        hostId={hostId}
        currentUserId={userId}
        listingTitle={listingTitle}
        onStatusChange={(newStatus) => setBookingStatus(newStatus)}
        onPrefillMessage={(text) => {
          setNewMessage(text)
          setTimeout(() => messageInputRef.current?.focus(), 50)
        }}
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: '#aaa' }}>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === userId
            const isSystem = isSystemMessage(msg)
            const { text, extraImageUrls } = parseMessageContent(msg.content)

            // System message — centered, minimal styling
            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div
                    className="max-w-sm rounded-2xl px-4 py-3 text-xs text-center"
                    style={{ backgroundColor: 'rgba(126,207,192,0.08)', border: '1px solid rgba(126,207,192,0.25)', color: '#555' }}
                  >
                    {msg.image_url && (
                      <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                        <img src={msg.image_url} alt="attachment" className="rounded-xl mb-2 max-w-full mx-auto" style={{ maxHeight: '160px', objectFit: 'cover' }} />
                      </a>
                    )}
                    {extraImageUrls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`proof ${i + 1}`} className="rounded-xl mb-2 max-w-full mx-auto" style={{ maxHeight: '160px', objectFit: 'cover' }} />
                      </a>
                    ))}
                    {text && <p className="leading-relaxed whitespace-pre-wrap">{text}</p>}
                    <p className="text-xs mt-1.5" style={{ color: '#aaa' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            }

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mr-2 mt-1" style={{ backgroundColor: 'rgba(126,207,192,0.15)', color: '#7ecfc0' }}>
                    {otherPartyName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  className="max-w-xs rounded-2xl px-4 py-3 text-sm"
                  style={isMe
                    ? { backgroundColor: '#debb73', color: '#2b2b2b', borderBottomRightRadius: '4px' }
                    : { backgroundColor: '#fff', color: '#2b2b2b', border: '1px solid #e0e0d8', borderBottomLeftRadius: '4px' }
                  }
                >
                  {/* Primary image_url attachment */}
                  {msg.image_url && (
                    <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                      <img src={msg.image_url} alt="attachment" className="rounded-xl mb-2 max-w-full" style={{ maxHeight: '200px', objectFit: 'cover' }} />
                    </a>
                  )}
                  {/* Extra image URLs parsed from content */}
                  {extraImageUrls.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <img src={url} alt={`proof ${i + 1}`} className="rounded-xl mb-2 max-w-full" style={{ maxHeight: '200px', objectFit: 'cover' }} />
                    </a>
                  ))}
                  {text && <p className="leading-relaxed whitespace-pre-wrap">{text}</p>}
                  <p className={`text-xs mt-1.5`} style={{ color: isMe ? 'rgba(43,43,43,0.55)' : '#aaa' }}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="px-6 pb-2">
          <div className="relative inline-block">
            <img src={imagePreview} alt="preview" className="h-16 rounded-xl" />
            <button onClick={clearImage} className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: '#2b2b2b' }}>
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-4" style={{ backgroundColor: '#fff', borderTop: '1px solid #e0e0d8' }}>
        <form onSubmit={sendMessage} className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors hover:opacity-70"
            style={{ backgroundColor: '#f8f8f5', color: '#888' }}
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          <input
            ref={messageInputRef}
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-2xl px-4 py-2.5 text-sm focus:outline-none"
            style={{ backgroundColor: '#f8f8f5', border: '1px solid #e0e0d8', color: '#2b2b2b' }}
          />
          <button
            type="submit"
            disabled={(!newMessage.trim() && !imageFile) || sending}
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#debb73', color: '#2b2b2b' }}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center pt-20" style={{ backgroundColor: '#f0f0ec' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#7ecfc0' }} />
      </div>
    }>
      <ChatPageInner />
    </Suspense>
  )
}
