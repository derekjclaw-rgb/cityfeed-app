import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Script from 'next/script'
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
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/C.png', sizes: '500x500', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    shortcut: '/favicon-32.png',
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
      <head>
        {/* Google Analytics (GA4) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-0TFMJKX9BK"
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-0TFMJKX9BK');
          `}
        </Script>
      </head>
      <body
        className={`${geist.variable} font-sans antialiased`}
        style={{ backgroundColor: '#f0f0ec', color: '#2b2b2b' }}
      >
        <Navbar />
        <GlobalToastContainer />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
