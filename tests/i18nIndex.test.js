import test from 'node:test'
import assert from 'node:assert/strict'
import { importFresh, installBrowserEnv } from './utils/testEnv.js'

const waitFor = async (check, tries = 50) => {
  for (let i = 0; i < tries; i += 1) {
    if (check()) return true
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return false
}

test('i18n uses stored locale by default and setLocale persists + dispatches event', async () => {
  const env = installBrowserEnv({ locale: 'uk' })
  try {
    const mod = await importFresh('src/i18n/index.js')
    assert.equal(mod.getLocale(), 'uk')

    let emitted = null
    env.window.addEventListener('locale-changed', (event) => {
      emitted = event.detail
    })

    mod.setLocale('en')
    assert.equal(mod.getLocale(), 'en')
    assert.equal(env.localStorage.getItem('locale'), 'en')
    assert.equal(emitted, 'en')
  } finally {
    env.restore()
  }
})

test('i18n translation resolves value, supports fallback and returns key for unknown paths', async () => {
  const env = installBrowserEnv({ locale: 'uk' })
  try {
    const mod = await importFresh('src/i18n/index.js')
    const loaded = await waitFor(() => mod.t('en', 'appName') === 'Arcana Insight')
    assert.equal(loaded, true)

    assert.equal(mod.t('en', 'appName'), 'Arcana Insight')
    assert.equal(mod.t('zz', 'appName'), 'Arcana Insight')
    assert.equal(mod.t('zz', 'missing.key.path'), 'missing.key.path')
    assert.equal(mod.t('appName'), 'Arcana Insight')
  } finally {
    env.restore()
  }
})

test('pluralForm picks the correct Ukrainian (one/few/many) and English forms', async () => {
  const env = installBrowserEnv({ locale: 'uk' })
  try {
    const mod = await importFresh('src/i18n/index.js')
    const uk = { one: 'карта', few: 'карти', many: 'карт', other: 'карт' }

    // Ukrainian three-form rule.
    for (const n of [1, 21, 31, 101]) assert.equal(mod.pluralForm('uk', n, uk), 'карта')
    for (const n of [2, 3, 4, 22, 34]) assert.equal(mod.pluralForm('uk', n, uk), 'карти')
    for (const n of [0, 5, 11, 12, 13, 14, 15, 25, 100]) assert.equal(mod.pluralForm('uk', n, uk), 'карт')

    // English (and unknown locales) fall back to one/other.
    const en = { one: 'card', few: 'cards', many: 'cards', other: 'cards' }
    assert.equal(mod.pluralForm('en', 1, en), 'card')
    for (const n of [0, 2, 5, 21]) assert.equal(mod.pluralForm('en', n, en), 'cards')
    assert.equal(mod.pluralForm('zz', 1, en), 'card')

    // Real bundle key sets resolve to non-empty forms.
    assert.equal(mod.pluralForm('uk', 1, mod.t('uk', 'cardsPage.cardForms')), 'карта')
    assert.equal(mod.pluralForm('uk', 3, mod.t('uk', 'landing.dayForms')), 'дні')
  } finally {
    env.restore()
  }
})

// QA findings #20/#21: messages were lazy-loaded on idle, so t() returned raw keys
// (nav.home, appName, dailyPage.title, …) on first paint until the chunk resolved.
// They are now statically bundled — t() must resolve on the very FIRST call with no
// async wait. A regression to lazy-loading returns the raw key here.
test('messages resolve synchronously on import (no cold-start raw-key flash)', async () => {
  const env = installBrowserEnv({ locale: 'uk' })
  try {
    const mod = await importFresh('src/i18n/index.js')
    // No waitFor — these must already be real copy, not the literal key.
    assert.equal(mod.t('en', 'appName'), 'Arcana Insight')
    assert.notEqual(mod.t('uk', 'appName'), 'appName')
    assert.notEqual(mod.t('uk', 'nav.home'), 'nav.home')
    assert.notEqual(mod.t('en', 'nav.menu'), 'nav.menu')
    assert.notEqual(mod.t('uk', 'dailyPage.title'), 'dailyPage.title')
  } finally {
    env.restore()
  }
})
