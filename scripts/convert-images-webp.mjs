#!/usr/bin/env node
/*
 * Convert project raster assets (hero background + tarot card art) from PNG to
 * WebP to cut app binary size. WebP is supported on iOS 14+ (our deployment
 * target) and in the Capacitor WKWebView. Re-runnable: skips already-converted.
 *
 * Usage: node scripts/convert-images-webp.mjs [--delete-png]
 *   --delete-png  remove the source .png after a successful .webp is written
 *
 * After running, update references:
 *   - src/data/cardsV2/tarot_full.json  ("file" fields .png -> .webp)
 *   - src/components/main/LandingScene.vue  (hero CSS url + hardcoded card path)
 */
import sharp from 'sharp'
import { readdir, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const deletePng = process.argv.includes('--delete-png')

const HERO = { src: 'src/assets/images/landing-stars-bg.png', quality: 80 }
const CARDS_DIR = 'public/images/cards'
const CARD_QUALITY = 82

async function walkPng(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walkPng(full)))
    else if (entry.name.toLowerCase().endsWith('.png')) out.push(full)
  }
  return out
}

async function convert(absPng, quality) {
  const absWebp = absPng.replace(/\.png$/i, '.webp')
  const before = (await stat(absPng)).size
  const info = await sharp(absPng).webp({ quality }).toFile(absWebp)
  if (deletePng) await unlink(absPng)
  return { rel: path.relative(root, absPng), before, after: info.size }
}

const kb = (n) => Math.round(n / 1024)

async function main() {
  let totalBefore = 0
  let totalAfter = 0

  const r = await convert(path.join(root, HERO.src), HERO.quality)
  totalBefore += r.before
  totalAfter += r.after
  console.log(`hero  ${kb(r.before)}KB -> ${kb(r.after)}KB  ${r.rel}`)

  const pngs = await walkPng(path.join(root, CARDS_DIR))
  for (const p of pngs) {
    const c = await convert(p, CARD_QUALITY)
    totalBefore += c.before
    totalAfter += c.after
  }
  console.log(`cards ${pngs.length} files: ${kb(totalBefore)}KB -> ${kb(totalAfter)}KB total`)
  console.log(
    `saved ${kb(totalBefore - totalAfter)}KB (${Math.round((1 - totalAfter / totalBefore) * 100)}%)${deletePng ? ' [png removed]' : ''}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
