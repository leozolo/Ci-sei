import type { MetadataRoute } from 'next'
import { APP_NAME, APP_SHORT_NAME } from '@/lib/config'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: APP_NAME,
    short_name: APP_SHORT_NAME,
    description: 'La lista del gruppo: cosa c’è in città e chi ci va.',
    lang: 'it',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0b1130',
    theme_color: '#0b1130',
    categories: ['social', 'entertainment', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Proponi un evento', short_name: 'Proponi', url: '/eventi/nuovo' },
      { name: 'Calendario', short_name: 'Calendario', url: '/calendario' },
    ],
  }
}
