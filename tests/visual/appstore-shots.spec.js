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

const SCREENS = [
  { name: '1-home', path: '/?qa=home&view=revealed&locale=en', wait: 2000 },
  // Oracle scene driven to a revealed 3-card spread (see runTarotFlow).
  { name: '2-tarot', path: '/#/tarot', wait: 9800, run: runTarotFlow },
  { name: '3-horoscope', path: '/#/horoscope', wait: 3000 },
  // ?qa=compat (before the hash) seeds two birth dates + reveals the local
  // result — the DOB wheel picker can't be clicked through deterministically.
  { name: '4-compatibility', path: '/?qa=compat#/compatibility', wait: 4500 },
  { name: '5-daily-card', path: '/#/daily', wait: 3500 },
  { name: '6-card-library', path: '/#/cards', wait: 2500 },
  { name: '7-zodiac-guide', path: '/#/zodiac-guide', wait: 2500 },
  // ?qa=premium (before the hash) seeds real App Store prices — without it the
  // web build renders "Purchases are unavailable" + empty price tiles.
  { name: '8-premium', path: '/?qa=premium#/premium', wait: 1800 },
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
