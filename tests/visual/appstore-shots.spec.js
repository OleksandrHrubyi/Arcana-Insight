import { test } from '@playwright/test'

// App Store screenshot generator → app-store/screenshots/<size>/<screen>.png
// Output pixel size = viewport × deviceScaleFactor (Apple-required dimensions).
const SIZES = [
  { name: '6.9in_1320x2868', width: 440, height: 956, dsf: 3 }, // iPhone 16 Pro Max
  { name: '6.5in_1242x2688', width: 414, height: 896, dsf: 3 }, // iPhone 11 Pro Max
]

// Drives the oracle dialogue to a revealed 3-card spread: intro → theme →
// question → 3-card spread (premium injected at runtime — the web build has no
// RevenueCat) → deck tap → flip each card, closing its preview overlay.
async function runTarotFlow(page) {
  const injectPremium = () =>
    page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('arcana-premium-access-changed', {
          detail: { active: true, plan: 'yearly', updatedAt: new Date().toISOString(), source: 'billing' },
        }),
      )
    })
  const getChoices = () =>
    page
      .$$eval('.oracle-wheel__item', (els) => els.map((e) => ({ t: e.textContent.trim(), d: e.disabled })))
      .catch(() => [])

  for (let round = 1; round <= 10; round++) {
    await injectPremium()
    await page.waitForTimeout(300)
    let choices = await getChoices()
    if (!choices.length) {
      const vp = page.viewportSize()
      await page.mouse.click(vp.width / 2, vp.height * 0.56)
      await page.waitForTimeout(2600)
      choices = await getChoices()
    }
    const deckHit = await page.$('.oracle-deck-hit')
    if (deckHit) {
      await deckHit.click().catch(() => {})
      await page.waitForTimeout(4000)
    }
    const cards = await page.$$('.oracle-card')
    if (cards.length) {
      for (let c = 0; c < cards.length; c++) {
        await cards[c].click().catch(() => {})
        await page.waitForTimeout(2200)
        const closeBtn = await page.$('.oracle-card-preview-dialog .arcana-btn')
        if (closeBtn) {
          await closeBtn.click().catch(() => {})
          await page.waitForTimeout(1200)
        }
      }
      await page.waitForTimeout(1500)
      return
    }
    if (!choices.length) continue
    // prefer: 3-card spread > relationships theme > confirm > first plain choice
    const prefer = (l) =>
      /3|three/i.test(l.t) ? 0 : /relationship/i.test(l.t) ? 1 : /confirm/i.test(l.t) ? 2 : /back|leave|custom/i.test(l.t) ? 9 : 5
    const enabled = choices.map((l, i) => ({ ...l, i })).filter((l) => !l.d)
    enabled.sort((a, b) => prefer(a) - prefer(b))
    if (!enabled.length) return
    const items = await page.$$('.oracle-wheel__item')
    await items[enabled[0].i].click()
    await page.waitForTimeout(700)
    const ok = await page.$('.oracle-actions__footer .arcana-btn--primary')
    if (ok) await ok.click()
    await page.waitForTimeout(3200)
  }
}

// Journal shot 1: today's flow mid-ritual — mood picked, question visible,
// an honest line typed, Save enabled. This is the store's hero frame (RP-06).
async function runJournalToday(page) {
  await page.locator('.journal-mood').nth(1).click().catch(() => {}) // Bright
  await page
    .locator('.journal-input textarea')
    .fill('Kept my patience through the morning rush — it paid off. One honest conversation left; tomorrow.')
    .catch(() => {})
  await page.waitForTimeout(600)
}

// Breathing shot: open the 30-second stillness pause and capture the circle
// mid-inhale (a clean wellness frame for the store).
async function runJournalBreath(page) {
  await page.locator('.journal-breath-chip').click().catch(() => {})
  // ~2s in the circle is scaled up on the inhale phase.
  await page.waitForTimeout(2200)
}

// Journal shot: save today's entry so the page shows the done-card plus the
// seeded week of history below (varied moods) — "it builds into a journal".
async function runJournalHistory(page) {
  const form = await page.$('.journal-input textarea')
  if (form) {
    await page.locator('.journal-mood').nth(0).click().catch(() => {}) // Calm
    await form.fill('A slow evening. Wrote down what actually mattered this week instead of scrolling.')
    await page.locator('.journal-save').click().catch(() => {})
    // Let the "Entry saved" toast dismiss — a store shot shouldn't carry it.
    await page.waitForTimeout(6500)
  }
}

const SCREENS = [
  // RP-06: the reflection ritual leads; tarot moved to the tail of the set.
  { name: '1-journal-today', path: '/#/journal', wait: 2600, run: runJournalToday },
  { name: '2-journal-breath', path: '/#/journal', wait: 2600, run: runJournalBreath },
  { name: '3-journal-history', path: '/?shot=history#/journal', wait: 2600, run: runJournalHistory },
  { name: '4-home', path: '/?qa=home&view=revealed&locale=en', wait: 2000 },
  { name: '5-daily-card', path: '/#/daily', wait: 3500 },
  { name: '6-horoscope', path: '/#/horoscope', wait: 3000 },
  // ?qa=compat (before the hash) seeds two birth dates + reveals the local
  // result — the DOB wheel picker can't be clicked through deterministically.
  { name: '7-compatibility', path: '/?qa=compat#/compatibility', wait: 4500 },
  // Oracle scene driven to a revealed 3-card spread (see runTarotFlow).
  { name: '8-tarot', path: '/#/tarot', wait: 9800, run: runTarotFlow },
  { name: '9-card-library', path: '/#/cards', wait: 2500 },
  // ?qa=premium (before the hash) seeds real App Store prices — without it the
  // web build renders "Purchases are unavailable" + empty price tiles.
  { name: '10-premium', path: '/?qa=premium#/premium', wait: 1800 },
]

test('app store screenshots', async ({ browser }) => {
  test.setTimeout(600000)
  for (const sz of SIZES) {
    const ctx = await browser.newContext({
      baseURL: 'http://127.0.0.1:9010',
      viewport: { width: sz.width, height: sz.height },
      deviceScaleFactor: sz.dsf,
      isMobile: true,
      hasTouch: true,
      colorScheme: 'dark',
      locale: 'en-US',
    })
    const page = await ctx.newPage()
    await page.addInitScript(() => {
      localStorage.setItem('locale', 'en')
      localStorage.setItem('arcana-onboarding-complete', 'true')
      localStorage.setItem('arcana-onboarding-interests', JSON.stringify(['career', 'self']))
      // Seed a believable week of journal history (guest/local entries) so the
      // history shot shows the journal as an accumulating practice.
      const dayKey = (offset) => {
        const d = new Date(Date.now() - offset * 86400000)
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${d.getFullYear()}-${m}-${day}`
      }
      const seed = [
        [1, 'steady', 'general.3', 'Held the plan even when the day tried to bend it. Small win.'],
        [2, 'bright', 'moonPhase.waxingGibbous.1', 'Finished the thing I kept polishing. Done beats perfect.'],
        [3, 'tense', 'retrograde.0', 'Re-read the contract twice before replying. Glad I did.'],
        [4, 'calm', 'planetaryDay.moon.1', 'Quiet evening, tea, no screens after nine. Felt like rest.'],
        [5, 'low', 'numerology.7.0', 'The same question kept coming back. Wrote it down instead of avoiding it.'],
        [6, 'bright', 'general.1', 'The walk before work changed the whole morning.'],
      ]
      const entries = {}
      for (const [offset, mood, promptKey, body] of seed) {
        const key = dayKey(offset)
        entries[key] = {
          dateKey: key,
          mood,
          promptKey,
          body,
          sky: {},
          updatedAt: new Date(Date.now() - offset * 86400000).toISOString(),
        }
      }
      localStorage.setItem('arcana_journal_entries_v1', JSON.stringify(entries))
    })
    for (const s of SCREENS) {
      await page.goto(s.path, { waitUntil: 'networkidle' }).catch(() => {})
      await page.waitForTimeout(s.wait)
      if (s.run) await s.run(page)
      await page.screenshot({ path: `app-store/screenshots/${sz.name}/${s.name}.png` })
    }
    await ctx.close()
  }
})
