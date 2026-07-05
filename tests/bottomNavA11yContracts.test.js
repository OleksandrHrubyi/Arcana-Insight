import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const readSource = (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  return fs.readFileSync(absolutePath, 'utf8')
}

// C3 (launch audit): the inactive tab color and the tiny labels were the two
// legibility failures on the always-visible surface of the app. Pin the floors:
// inactive alpha >= 0.6 (~5:1 over the #0b1220 glass; 0.42 measured ~3:1, under
// the AA 4.5:1 small-text minimum) and labels >= 11px (>= 10px on narrow screens).

test('bottom-nav inactive color stays at or above the AA-contrast alpha floor', () => {
  const source = readSource('src/components/ui/BottomNavigation.vue')
  const match = source.match(/color: rgba\(194, 206, 224, (0\.\d+)\);/)
  assert.ok(match, 'inactive .nav-tab color must keep the rgba(194,206,224,a) form')
  assert.ok(
    Number(match[1]) >= 0.6,
    `inactive alpha ${match[1]} is below the 0.6 floor (~4.5:1 contrast)`,
  )
})

test('bottom-nav labels never shrink back below the legibility floor', () => {
  const source = readSource('src/components/ui/BottomNavigation.vue')
  const labelSizes = [...source.matchAll(/\.nav-tab__label\s*\{[^}]*?font-size:\s*(\d+)px/gs)].map(
    (m) => Number(m[1]),
  )
  assert.ok(labelSizes.length >= 2, 'expected base + narrow-screen label sizes')
  assert.ok(Math.max(...labelSizes) >= 11, 'base label must be at least 11px')
  assert.ok(Math.min(...labelSizes) >= 10, 'narrow-screen label must be at least 10px')
})
