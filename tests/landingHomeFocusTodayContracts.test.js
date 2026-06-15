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
  assert.match(source, /isFocusTodayCompact\(\)\s*\{/)
  assert.match(source, /focusTodayLine\(\)\s*\{/)
  assert.match(source, /if \(preview && this\.focusTodayResolvedSignKey\) \{\s*return this\.compactPreview\(this\.firstSentence\(preview\), 72\)/s)
  assert.match(source, /if \(!this\.focusTodayResolvedSignKey\) \{\s*return this\.tt\('landing\.focusToday\.fallbackMissingSign'\)/s)
  assert.match(source, /return this\.tt\('landing\.focusToday\.fallbackKnownSign'\)/)
})
