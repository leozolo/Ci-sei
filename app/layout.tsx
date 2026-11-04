import type { Metadata, Viewport } from 'next'
import { Instrument_Sans, Unbounded } from 'next/font/google'
import type { ReactNode } from 'react'
import { PwaRuntime } from '@/components/pwa'
import { Feedback } from '@/components/ui/feedback'
import { APP_NAME } from '@/lib/config'
import { THEME_SCRIPT } from '@/lib/theme'
import './globals.css'

const body = Instrument_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' })
const heading = Unbounded({ subsets: ['latin'], variable: '--font-heading', display: 'swap' })

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: 'La bacheca privata degli eventi del gruppo: chi c’è, quando e dove.',
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false, email: false, address: false },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" data-theme="dark" className={`${body.variable} ${heading.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        {children}
        <Feedback />
        <PwaRuntime />
      </body>
    </html>
  )
}
