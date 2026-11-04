import type { MetadataRoute } from 'next'
import { APP_NAME } from '@/lib/config'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: APP_NAME,
    short_name: APP_NAME,
    description: 'La bacheca privata degli eventi del gruppo: chi c’è, quando e dove.',
    lang: 'it',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#000000',
    theme_color: '#000000',
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
