import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const readSource = (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  return fs.readFileSync(absolutePath, 'utf8')
}

// C5 (launch audit): sub-44pt tap targets found by code inspection. Visual size
// stays as designed; the tap area is expanded via the shared hit-44 helper (or a
// vertical-only ::before where ::after is already used for the active underline).

test('small icon buttons carry the hit-44 tap-target helper', () => {
  const cards = readSource('src/pages/CardLibraryPage.vue')
  assert.match(cards, /class="cards-search__clear hit-44"/)
  assert.match(cards, /class="cards-back hit-44"/)

  const compat = readSource('src/pages/CompatibilityPage.vue')
  assert.match(compat, /class="compat-savedconn__del hit-44"/)
  assert.match(compat, /class="compat-back hit-44"/)
})

test('card-library filter chips keep the 44px vertical hit expansion', () => {
  const source = readSource('src/pages/CardLibraryPage.vue')
  const chip = source.match(/\.cards-filter \{[\s\S]*?\n\}/)?.[0] || ''
  assert.ok(chip, '.cards-filter block must exist')
  assert.match(chip, /&::before[\s\S]*?height: 44px/)
})
