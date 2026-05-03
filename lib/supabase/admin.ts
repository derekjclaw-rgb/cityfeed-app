/**
 * Supabase admin client — uses service role key to bypass RLS.
 * For admin dashboard / God View only.
 */
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing SUPABASE env vars for admin client')
  return createClient(url, key)
}
