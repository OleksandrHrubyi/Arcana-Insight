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
