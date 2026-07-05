import test from 'node:test'
import assert from 'node:assert/strict'
import { importModule } from './utils/testEnv.js'

test('messages bundle exposes core locales and required nested blocks', async () => {
  const { messages } = await importModule('src/i18n/messages.bundle.js')

  assert.ok(messages.en)
  assert.ok(messages.uk)
  assert.equal(typeof messages.en.appName, 'string')
  assert.equal(typeof messages.uk.appName, 'string')

  assert.ok(messages.en.tarotOracle)
  assert.ok(messages.uk.tarotOracle)
  assert.ok(Array.isArray(messages.en.tarotOracle.introSets))
  assert.ok(messages.en.tarotOracle.introSets.length > 10)
  assert.ok(Array.isArray(messages.uk.tarotOracle.introSets))
  assert.ok(messages.uk.tarotOracle.introSets.length > 10)

  assert.ok(messages.en.tarotOracle.prompts.theme.length > 0)
  assert.ok(messages.uk.tarotOracle.prompts.theme.length > 0)

  assert.equal(typeof messages.en.tarotOracle.actionsSheetTitle, 'string')
  assert.equal(typeof messages.uk.tarotOracle.actionsSheetTitle, 'string')
})

// C1 (launch audit): t() falls back to the literal dot-path when a key is missing,
// so a locale drifting from the other ships a raw "some.key.name" straight into
// the UI. This guard makes any en/uk key-set divergence a red test instead of a
// production surprise. Arrays are treated as leaves — their lengths may legally
// differ (e.g. intro phrase pools), only the key structure must match.
const flattenKeys = (node, prefix = '') => {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return [prefix]
  return Object.entries(node).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key),
  )
}

test('en and uk locales expose exactly the same key structure', async () => {
  const { messages } = await importModule('src/i18n/messages.bundle.js')

  const enKeys = new Set(flattenKeys(messages.en))
  const ukKeys = new Set(flattenKeys(messages.uk))

  const missingInUk = [...enKeys].filter((key) => !ukKeys.has(key))
  const missingInEn = [...ukKeys].filter((key) => !enKeys.has(key))

  assert.deepEqual(missingInUk, [], `keys present in en but missing in uk:\n${missingInUk.join('\n')}`)
  assert.deepEqual(missingInEn, [], `keys present in uk but missing in en:\n${missingInEn.join('\n')}`)
})

test('no locale value is an empty string (renders as blank UI text)', async () => {
  const { messages } = await importModule('src/i18n/messages.bundle.js')

  // Deliberately-empty values (an empty label IS the design, in both locales).
  // Add here consciously — every other empty string is treated as a copy bug.
  const INTENTIONALLY_EMPTY = new Set(['compatibilityPage.aspects.unknown'])

  const collectEmpty = (node, prefix = '') => {
    if (typeof node === 'string') {
      return node.trim() === '' && !INTENTIONALLY_EMPTY.has(prefix) ? [prefix] : []
    }
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return []
    return Object.entries(node).flatMap(([key, value]) =>
      collectEmpty(value, prefix ? `${prefix}.${key}` : key),
    )
  }

  for (const locale of ['en', 'uk']) {
    const empty = collectEmpty(messages[locale])
    assert.deepEqual(empty, [], `${locale} has empty-string values:\n${empty.join('\n')}`)
  }
})
