import { test } from '@playwright/test'

// App Store screenshot generator → app-store/screenshots/<size>/<screen>.png
// Output pixel size = viewport × deviceScaleFactor (Apple-required dimensions).
const SIZES = [
  { name: '6.9in_1320x2868', width: 440, height: 956, dsf: 3 }, // iPhone 16 Pro Max
  { name: '6.5in_1242x2688', width: 414, height: 896, dsf: 3 }, // iPhone 11 Pro Max
]

const SCREENS = [
  { name: '1-home', path: '/?qa=home&view=revealed&locale=en', wait: 2000 },
  { name: '2-tarot', path: '/#/tarot', wait: 9800 },
  { name: '3-horoscope', path: '/#/horoscope', wait: 3000 },
  { name: '4-compatibility', path: '/#/compatibility', wait: 1800 },
  { name: '5-premium', path: '/#/premium', wait: 1800 },
]

test('app store screenshots', async ({ browser }) => {
  test.setTimeout(180000)
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
      await page.screenshot({ path: `app-store/screenshots/${sz.name}/${s.name}.png` })
    }
    await ctx.close()
  }
})
