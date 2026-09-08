import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import LayoutShell from '@/components/LayoutShell'
import { GlobalToastContainer } from '@/components/Toast'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://cityfeed-app.vercel.app'

/* Input-focus auto-zoom is prevented by 16px font-size on mobile form fields
   (see globals.css). We deliberately do NOT set maximumScale: on devices that
   retained a zoomed viewport state from before that fix, maximumScale=1 TRAPPED
   users zoomed-in with no way to pinch back out (Aug 23 "can't even zoom out"
   report). Users must always be able to pinch to 1×. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        {/* Google Tag Manager */}
        <Script id="gtm-init" strategy="afterInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-PJHQG5C6');
          `}
        </Script>
        {/* GA4 (G-0TFMJKX9BK) is served via GTM — do NOT hardcode it here or
            pageviews double-count. See GTM container GTM-PJHQG5C6. */}
        {/* Microsoft Clarity */}
        <Script id="clarity-init" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "w33ozv4scw");
          `}
        </Script>
      </head>
      <body
        className={`${geist.variable} font-sans antialiased`}
        style={{ backgroundColor: 'var(--cream)', color: 'var(--charcoal)' }}
      >
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PJHQG5C6"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        <LayoutShell>
          <GlobalToastContainer />
          {children}
        </LayoutShell>
      </body>
    </html>
  )
}
