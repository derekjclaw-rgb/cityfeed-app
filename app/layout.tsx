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
    'Real world marketplace for local advertising. Book real-world ad placements in minutes: digital screens, billboards, storefronts, and more.',
  openGraph: {
    title: 'City Feed',
    description:
      'Advertise on your terms. The real world marketplace for local advertising.',
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
        className={`${geist.variable} font-sans antialiased`}
        style={{ backgroundColor: '#e6e6dd', color: '#2b2b2b' }}
      >
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
