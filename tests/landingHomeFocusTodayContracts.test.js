import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const readSource = (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  return fs.readFileSync(absolutePath, 'utf8')
}

test('home focus today uses cached sign fallback and stable theme priority', () => {
  const source = readSource('src/components/main/LandingScene.vue')

  assert.match(source, /const HOROSCOPE_SIGN_CACHE_KEY = 'horoscope_sign_key_v1'/)
  assert.match(source, /const signKey = this\.normalizeZodiacKey\(snap\.signKey\) \|\| this\.readCachedHoroscopeSignKey\(\)/)
  assert.match(source, /\['energy', 'career', 'love'\]\.find\(/)
})

test('home focus today exposes source-backed and fallback states', () => {
  const source = readSource('src/components/main/LandingScene.vue')

  assert.match(source, /focusTodayResolvedSignKey\(\)\s*\{/)
  assert.match(source, /this\.normalizeZodiacKey\(this\.homeSignKey\) \|\|\s*this\.normalizeZodiacKey\(this\.horoscopeData\?\.signKey\)/s)
  assert.match(source, /focusTodayLine\(\)\s*\{/)
  // Teaser shows the full first sentence (no mid-word char cut); fallbacks show
  // the full instruction. The body is never clamped mid-word (see focus-today__body).
  assert.match(source, /if \(preview && this\.focusTodayResolvedSignKey\) \{[\s\S]*?return this\.firstSentence\(preview\)/)
  assert.match(source, /if \(!this\.focusTodayResolvedSignKey\) \{\s*return this\.tt\('landing\.focusToday\.fallbackMissingSign'\)/s)
  assert.match(source, /return this\.tt\('landing\.focusToday\.fallbackKnownSign'\)/)
})

test('home focus today DB fallback reads selectAppUser row as object, not array', () => {
  const source = readSource('src/components/main/LandingScene.vue')

  // selectAppUser unwraps the row (supabaseNativeCore returns data[0] already);
  // reading data?.[0] silently yields '' and kills DB-based sign resolution.
  assert.match(source, /selectAppUser\(userId, 6000, 'date_of_birth'\)\s*return data\?\.date_of_birth \|\| ''/s)
  assert.doesNotMatch(source, /selectAppUser[\s\S]{0,120}?data\?\.\[0\]/)
})

// B6 (launch audit): the home preview must load the horoscope registry with the
// same entitlement flag as the Horoscope screen. Omitting isEntitled writes the
// day-cache in the stripped shape, so a premium user's every Home↔Horoscope
// switch invalidates the cache and refetches over the network.
test('home horoscope preview passes the real entitlement into the registry load', () => {
  const source = readSource('src/components/main/LandingScene.vue')
  const preview = source.match(/async loadHomeHoroscopePreview\(\{[\s\S]*?\n    \},/)?.[0] || ''
  assert.ok(preview, 'loadHomeHoroscopePreview must exist')
  assert.match(preview, /isEntitled: premiumAccessStore\.hasPremiumAccess\.value/)
})
