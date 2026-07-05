import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const readSource = (relativePath) => {
  const absolutePath = path.resolve(process.cwd(), relativePath)
  return fs.readFileSync(absolutePath, 'utf8')
}

// B3 (launch audit): the daily-push flag is read during boot and inside data() of
// the Settings sheet. JSON.parse there turns one corrupted localStorage value into
// a mount-aborting exception (white Settings tab). The flag must be read with a
// throw-proof strict compare; the writer stores the strings 'true'/'false'.

test('daily-push flag reads never go through JSON.parse', () => {
  for (const file of ['src/boot/push.js', 'src/components/main/SettingsComponent.vue']) {
    const source = readSource(file)
    assert.doesNotMatch(
      source,
      /JSON\.parse\([^)]*LS_DAILY_PUSH/,
      `${file}: reading the daily-push flag must not use JSON.parse`,
    )
    assert.match(
      source,
      /localStorage\.getItem\(LS_DAILY_PUSH\) === 'true'/,
      `${file}: the flag must be read with a strict 'true' compare`,
    )
  }
})

test('daily-push writer keeps storing the true/false strings the reader expects', () => {
  const source = readSource('src/components/main/SettingsComponent.vue')
  assert.match(source, /localStorage\.setItem\(LS_DAILY_PUSH, JSON\.stringify\(Boolean\(/)
})
