import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const readSource = (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  return fs.readFileSync(absolutePath, 'utf8')
}

test('manual horoscope sign selection persists to local cache', () => {
  const source = readSource('src/components/main/HoroscopeComponent.vue')

  assert.match(source, /persistZodiacSelectionOnStop:\s*false/)
  assert.match(source, /if \(this\.persistZodiacSelectionOnStop && this\.activeZodiac\?\.key\) \{\s*this\.writeCachedZodiacKey\(this\.activeZodiac\.key\)/s)
  assert.match(source, /this\.persistZodiacSelectionOnStop = true/)
})
