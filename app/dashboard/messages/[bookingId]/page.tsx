'use client'

/**
 * Chat interface for a booking thread
 * Real-time via Supabase Realtime
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, Loader2, ImageIcon, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface Message {
  id: string
  booking_id: string
  sender_id: string
  content: string
  image_url?: string
  created_at: string
}

export default function ChatPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.bookingId as string

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [bookingTitle, setBookingTitle] = useState('Conversation')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/login'); return }
      setUserId(data.user.id)

      // Fetch booking title
      const { data: booking } = await supabase
        .from('bookings')
        .select('listings(title)')
        .eq('id', bookingId)
        .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (booking) setBookingTitle((booking as any).listings?.title ?? 'Conversation')

      // Fetch messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true })

      if (msgs) setMessages(msgs)
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
    if ((!newMessage.trim() && !imageFile) || !userId || sending) return
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

    await supabase.from('messages').insert({
      booking_id: bookingId,
      sender_id: userId,
      content: newMessage.trim(),
      image_url: imageUrl,
    })

    setNewMessage('')
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
    <div className="flex flex-col pt-16" style={{ height: '100vh', backgroundColor: '#f0f0ec' }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4" style={{ backgroundColor: '#fff', borderBottom: '1px solid #e0e0d8', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        <Link href="/dashboard/messages" className="hover:opacity-70" style={{ color: '#888' }}>
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-semibold text-sm" style={{ color: '#2b2b2b' }}>{bookingTitle}</h1>
          <p className="text-xs" style={{ color: '#888' }}>Booking #{bookingId.slice(0, 8)}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm" style={{ color: '#aaa' }}>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.sender_id === userId
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="max-w-xs rounded-2xl px-4 py-3 text-sm"
                  style={isMe
                    ? { backgroundColor: '#debb73', color: '#2b2b2b', borderBottomRightRadius: '4px' }
                    : { backgroundColor: '#fff', color: '#2b2b2b', border: '1px solid #e0e0d8', borderBottomLeftRadius: '4px' }
                  }
                >
                  {msg.image_url && (
                    <img src={msg.image_url} alt="attachment" className="rounded-xl mb-2 max-w-full" style={{ maxHeight: '200px', objectFit: 'cover' }} />
                  )}
                  {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                  <p className={`text-xs mt-1.5 ${isMe ? 'text-white/70' : ''}`} style={isMe ? {} : { color: '#aaa' }}>
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
