import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'City Feed — The marketplace for local advertising',
  description:
    'Peer-to-peer marketplace for local and OOH advertising placements. Find or list billboards, storefronts, digital screens, vehicle wraps, and more.',
  openGraph: {
    title: 'City Feed',
    description:
      'Advertise on your terms. The peer-to-peer marketplace for local advertising.',
    type: 'website',
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
        className={`${geist.variable} font-sans antialiased bg-white text-gray-900`}
      >
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
