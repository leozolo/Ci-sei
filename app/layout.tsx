import type { Metadata, Viewport } from 'next'
import { Roboto_Flex } from 'next/font/google'
import localFont from 'next/font/local'
import type { ReactNode } from 'react'
import { PwaRuntime } from '@/components/pwa'
import { Feedback } from '@/components/ui/feedback'
import { APP_NAME, APP_SHORT_NAME } from '@/lib/config'
import { I18N_SCRIPT, I18nProvider } from '@/lib/i18n/react'
import { THEME_SCRIPT } from '@/lib/theme'
import './globals.css'

// Archivo (Omnibus-Type, licenza OFL), ridotto a larghezze 62–100 e pesi 500–900.
const archivo = localFont({
  src: [{ path: './fonts/archivo-condensed.woff', weight: '500 900', style: 'normal' }],
  variable: '--font-archivo',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '62% 100%' }],
})

// Archivo non ha lettere russe: per il cirillico c'è Roboto Flex (Google, licenza OFL), che ha lo
// stesso asse di larghezza, così titoli e liste restano stretti. Viene scaricato al momento della
// pubblicazione e servito dall'app; il browser lo carica solo quando sulla pagina c'è testo in russo.
const cyrillic = Roboto_Flex({
  subsets: ['cyrillic'],
  axes: ['wdth'],
  variable: '--font-cyrillic',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
})

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: 'La lista del gruppo: cosa c’è in città e chi ci va.',
  applicationName: APP_NAME,
  appleWebApp: { capable: true, title: APP_SHORT_NAME, statusBarStyle: 'black-translucent' },
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
  themeColor: '#0b1130',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" data-theme="dark" className={`${archivo.variable} ${cyrillic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: I18N_SCRIPT }} />
      </head>
      <body>
        <I18nProvider>
          {children}
          <Feedback />
          <PwaRuntime />
        </I18nProvider>
      </body>
    </html>
  )
}
