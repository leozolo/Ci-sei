import type { Metadata, Viewport } from 'next'
import { Archivo, JetBrains_Mono, Roboto_Flex } from 'next/font/google'
import type { ReactNode } from 'react'
import { PwaRuntime } from '@/components/pwa'
import { MotionProvider } from '@/components/motion'
import { Feedback } from '@/components/ui/feedback'
import { APP_NAME, APP_SHORT_NAME } from '@/lib/config'
import { I18N_SCRIPT, I18nProvider } from '@/lib/i18n/react'
import { THEME_SCRIPT } from '@/lib/theme'
import './globals.css'

// Archivo (Omnibus-Type, licenza OFL) con l'asse di larghezza intero, da 62 (numeri e nomi) a 125
// (titoli degli eventi). Viene scaricato al momento della pubblicazione e servito dall'app.
const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-archivo',
  display: 'swap',
  // il carattere di riserva (solo lettere latine) è in globals.css: quello automatico, Arial,
  // avrebbe anche il cirillico e prenderebbe il posto di Roboto Flex nei testi in russo
  adjustFontFallback: false,
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

// JetBrains Mono (licenza OFL) per date, orari, luoghi e tasti di risposta. Ha anche il cirillico,
// che il browser scarica solo quando sulla pagina c'è testo in russo.
const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jbmono',
  display: 'swap',
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
  themeColor: '#05070f',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="it" data-theme="dark" className={`${archivo.variable} ${cyrillic.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: I18N_SCRIPT }} />
      </head>
      <body>
        <I18nProvider>
          <MotionProvider>{children}</MotionProvider>
          <Feedback />
          <PwaRuntime />
        </I18nProvider>
      </body>
    </html>
  )
}
