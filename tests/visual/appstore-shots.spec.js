import { test } from '@playwright/test'

// App Store screenshot generator → app-store/screenshots/<size>/<screen>.png
// Astronomy-first set (v1.0.1): the sky tool + Moon lead; the reflection journal
// follows; divination is only shown as breadth in the Menu. Output pixel size =
// viewport × deviceScaleFactor (Apple-required dimensions).
const BASE = process.env.SHOT_BASE || 'http://127.0.0.1:9010'
const SIZES = [
  { name: '6.9in_1320x2868', width: 440, height: 956, dsf: 3 }, // iPhone 16 Pro Max
  { name: '6.5in_1242x2688', width: 414, height: 896, dsf: 3 }, // iPhone 11 Pro Max
]

// Scroll a Sky card (the one containing `sel`) to the top of the viewport.
const scrollCard = (sel) => async (page) => {
  await page.evaluate((s) => {
    const el = document.querySelector(s)
    const card = el?.closest('.sky-card') || el
    card?.scrollIntoView({ block: 'start', behavior: 'instant' })
    window.scrollBy(0, -8)
  }, sel)
  await page.waitForTimeout(700)
}

// Journal hero: pick an upbeat mood so the check-in reads as "in use", not empty.
const runJournal = async (page) => {
  await page.locator('.journal-mood').nth(1).click().catch(() => {}) // Bright
  await page.waitForTimeout(500)
}

// Premium: ?qa=premium seeds prices. The page's own sticky "Continue"/Close bar is
// part of the layout (do NOT click Close — it exits the page). Just pin to the top
// so the hero + "What premium gives" grid (the 3 sky/journal perks lead) is framed.
const framePremiumTop = async (page) => {
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(300)
}

const SCREENS = [
  { name: '1-home', path: '/#/', wait: 3000 },
  { name: '2-sky-observe', path: '/#/sky', wait: 3400 }, // best time to observe (top)
  { name: '3-sky-moon', path: '/#/sky', wait: 3400, run: scrollCard('.sky-moon-grid') },
  { name: '4-sky-events', path: '/#/sky', wait: 3400, run: scrollCard('.sky-events') },
  { name: '5-sky-visible', path: '/#/sky', wait: 3400, run: scrollCard('.sky-vis') },
  { name: '6-journal', path: '/#/journal', wait: 2800, run: runJournal },
  { name: '7-menu', path: '/#/menu', wait: 2400 },
  { name: '8-premium', path: '/?qa=premium#/premium', wait: 2600, run: framePremiumTop },
]

test('app store screenshots (astronomy-first)', async ({ browser }) => {
  test.setTimeout(600000)
  for (const sz of SIZES) {
    const ctx = await browser.newContext({
      baseURL: BASE,
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
      localStorage.setItem('arcana-onboarding-interests', JSON.stringify(['sky', 'reflection', 'readings']))
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
