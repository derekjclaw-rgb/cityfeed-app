/**
 * lib/auth-guard.ts — Shared server-side auth helpers for API routes.
 *
 * Two auth strategies:
 *   1. Supabase session (user-facing routes) — validates cookie-based session
 *   2. Internal API secret (server-to-server calls) — validates INTERNAL_API_SECRET header
 *
 * Usage:
 *   const session = await getSessionUser()        // returns user or null
 *   const isInternal = verifyInternalSecret(req)   // returns boolean
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export interface SessionUser {
  id: string
  email?: string
}

/**
 * Get the authenticated Supabase user from the request cookies.
 * Returns null if no valid session exists.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return { id: user.id, email: user.email }
  } catch {
    return null
  }
}

/**
 * Verify the x-internal-secret header matches INTERNAL_API_SECRET env var.
 * Returns false if the env var is not set (fail closed).
 */
export function verifyInternalSecret(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) {
    console.error('[AuthGuard] INTERNAL_API_SECRET is not configured — denying internal call')
    return false
  }
  const header = req.headers.get('x-internal-secret')
  return header === secret
}
