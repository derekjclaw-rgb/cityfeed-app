/**
 * Admin authentication helpers — simple password-based auth with cookie session.
 */
import { cookies } from 'next/headers'

const COOKIE_NAME = 'admin_session'
const SESSION_VALUE = 'authenticated'

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(COOKIE_NAME)?.value === SESSION_VALUE
}

export async function setAdminSession() {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, SESSION_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export function validateAdminPassword(password: string): boolean {
  return password === (process.env.ADMIN_PASSWORD || '')
}
