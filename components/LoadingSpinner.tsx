/**
 * LoadingSpinner — reusable loading state component
 * Burnt orange spinner on cream background
 */

interface LoadingSpinnerProps {
  fullScreen?: boolean
  size?: 'sm' | 'md' | 'lg'
  message?: string
}

export default function LoadingSpinner({ fullScreen = true, size = 'md', message }: LoadingSpinnerProps) {
  const sizes = { sm: 20, md: 28, lg: 40 }
  const px = sizes[size]

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin"
        aria-label="Loading"
      >
        <circle cx="12" cy="12" r="10" stroke="#f0f0ec" strokeWidth="3" />
        <path
          d="M12 2 A10 10 0 0 1 22 12"
          stroke="#7ecfc0"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {message && (
        <p className="text-sm" style={{ color: '#888' }}>{message}</p>
      )}
    </div>
  )

  if (!fullScreen) return spinner

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#f0f0ec' }}
    >
      {spinner}
    </div>
  )
}
