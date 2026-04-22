/**
 * Shared utility functions for City Feed
 */

/**
 * Format a full name as "First L." for privacy on public-facing pages.
 * "Stasha Picardo" → "Stasha P."
 * "John" → "John"
 */
export function formatNamePublic(fullName: string): string {
  if (!fullName) return 'User'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return parts[0] || fullName
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}
