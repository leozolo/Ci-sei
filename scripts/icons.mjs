#!/usr/bin/env node
/**
 * Rigenera le icone dell'app (public/icons/*) dal simbolo public/brand/mark.svg.
 *
 *   npm run icons
 *
 * Per cambiare simbolo: sostituisci public/brand/mark.svg con il nuovo disegno
 * (un SVG quadrato con viewBox, su fondo trasparente) e rilancia il comando.
 * Il fondo delle icone è il blu notte dell'app. Ogni PNG porta scritta dentro
 * la propria origine (chunk tEXt "impeccable:prompt"), così si sa sempre da
 * dove viene.
 */
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = 'public/brand/mark.svg'
const NIGHT = '#0b1130' // il fondo dell'app (--c-bg in app/globals.css)

let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  console.error('Manca "sharp": esegui prima npm install.')
  process.exit(1)
}

const svg = await readFile(path.join(root, SOURCE), 'utf8')
const viewBoxWidth = (() => {
  const vb = svg.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)/i)
  if (vb) return Number(vb[1])
  const w = svg.match(/\swidth\s*=\s*["']([\d.]+)/i)
  return w ? Number(w[1]) : 24
})()
const transparent = { r: 0, g: 0, b: 0, alpha: 0 }

/** Il simbolo come PNG trasparente di lato `size`, disegnato nitido. */
async function mark(size) {
  const density = Math.min(2400, Math.max(72, (72 * size * 2) / viewBoxWidth))
  return sharp(Buffer.from(svg), { density }).resize(size, size, { fit: 'contain', background: transparent }).png().toBuffer()
}

/** Simbolo centrato sul blu notte; `scale` lascia il margine (zona sicura). */
async function onNight(size, scale) {
  const inner = await mark(Math.round(size * scale))
  return sharp({ create: { width: size, height: size, channels: 4, background: NIGHT } })
    .composite([{ input: inner, gravity: 'centre' }])
    .flatten({ background: NIGHT })
    .png()
    .toBuffer()
}

/** Badge delle notifiche Android: solo la sagoma, bianca su trasparente. */
async function silhouette(size, scale) {
  const { data, info } = await sharp(await mark(Math.round(size * scale)))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 255
  const inner = await sharp(data, { raw: info }).png().toBuffer()
  return sharp({ create: { width: size, height: size, channels: 4, background: transparent } })
    .composite([{ input: inner, gravity: 'centre' }])
    .png()
    .toBuffer()
}

// --- origine dentro il PNG (tEXt), lo stesso formato di `impeccable embed-prompt`
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function withOrigin(png, text) {
  const type = Buffer.from('tEXt', 'latin1')
  const body = Buffer.from(`impeccable:prompt\0${text}`, 'latin1')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(body.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([type, body])))
  const iend = png.length - 12 // l'ultimo chunk di un PNG è sempre IEND
  return Buffer.concat([png.subarray(0, iend), len, type, body, crc, png.subarray(iend)])
}
const origin = (file) =>
  `${file}: icona generata da scripts/icons.mjs a partire da ${SOURCE}, su fondo ${NIGHT}. Disegno vettoriale renderizzato con sharp, nessuna immagine generata da AI.`

const jobs = [
  ['icon-512.png', () => onNight(512, 0.86)],
  ['icon-192.png', () => onNight(192, 0.86)],
  ['maskable-512.png', () => onNight(512, 0.64)], // Android ritaglia: il simbolo resta nella zona sicura
  ['apple-touch-icon.png', () => onNight(180, 0.64)], // iOS arrotonda gli angoli
  ['badge-96.png', () => silhouette(96, 0.92)],
]
for (const [file, make] of jobs) {
  await writeFile(path.join(root, 'public/icons', file), withOrigin(await make(), origin(file)))
  console.log('ok', `public/icons/${file}`)
}
