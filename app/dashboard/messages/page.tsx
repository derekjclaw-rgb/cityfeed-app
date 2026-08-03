'use client'

import { MessageCircle } from 'lucide-react'

/**
 * Messages — empty state when no conversation is selected
 * The thread list is rendered by layout.tsx
 */
export default function MessagesPage() {
  return (
    <div className="flex-1 flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#e0e0d8' }}>
          <MessageCircle className="w-7 h-7" style={{ color: '#aaa' }} />
        </div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: '#555' }}>Select a conversation</h2>
        <p className="text-sm" style={{ color: '#aaa' }}>Choose from your conversations on the left</p>
      </div>
    </div>
  )
}
