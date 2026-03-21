import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { GlobalToastContainer } from '@/components/Toast'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cityfeed-app.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'City Feed — Real World Advertising Marketplace',
    template: '%s | City Feed',
  },
  description:
    'Book unique, real-world ad placements in minutes. Digital screens, billboards, storefronts, and more. No haggling, no contracts, no middlemen.',
  keywords: [
    'advertising marketplace', 'real world advertising', 'billboard booking',
    'digital screen rental', 'storefront advertising', 'local advertising',
    'out-of-home advertising', 'OOH advertising', 'ad placement booking',
  ],
  authors: [{ name: 'City Feed' }],
  creator: 'City Feed',
  publisher: 'City Feed',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: baseUrl,
    siteName: 'City Feed',
    title: 'City Feed — Real World Advertising Marketplace',
    description:
      'Book unique, real-world ad placements in minutes. Digital screens, billboards, storefronts, and more. No haggling, no contracts, no middlemen.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'City Feed — Real World Advertising Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'City Feed — Real World Advertising Marketplace',
    description:
      'Book unique, real-world ad placements in minutes. No haggling, no contracts, no middlemen.',
    images: ['/og-image.png'],
    creator: '@cityfeed',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon.ico',
  },
  alternates: {
    canonical: baseUrl,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} font-sans antialiased`}
        style={{ backgroundColor: '#e6e6dd', color: '#2b2b2b' }}
      >
        <Navbar />
        <GlobalToastContainer />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
