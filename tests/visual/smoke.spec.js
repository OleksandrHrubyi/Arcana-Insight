import { test, expect } from '@playwright/test'

// Smoke regression net for the navigation/render bugs that escaped to manual
// testing in June 2026 (bottom nav vanished on home; paywall nav overlap; routes
// not mounting). These are cheap assertions, not screenshot baselines, so they're
// robust across visual tweaks. Run: `npx playwright test smoke`.

const seed = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('locale', 'uk')
    localStorage.setItem('arcana-onboarding-complete', 'true')
    localStorage.setItem('arcana-onboarding-interests', JSON.stringify(['career', 'self']))
  })
}

const go = async (page, hash) => {
  await page.goto(`/#/${hash}`, { waitUntil: 'networkidle' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(700)
}

test.describe('smoke: key routes mount + bottom-nav contract', () => {
  // "Shows nav" = the wrapper is attached and NOT carrying the --hidden class
  // (that class — not raw visibility — was the actual home-screen regression;
  // checking it avoids flaking on the GSAP wheel/transition opacity).
  test('home mounts and SHOWS the bottom nav', async ({ page }) => {
    await seed(page)
    await go(page, '?qa=home')
    await expect(page.locator('.circle-card')).toBeVisible()
    const nav = page.locator('.bottom-nav-wrap')
    await expect(nav).toBeAttached()
    await expect(nav).not.toHaveClass(/bottom-nav-wrap--hidden/)
  })

  test('horoscope mounts and SHOWS the bottom nav', async ({ page }) => {
    await seed(page)
    await go(page, 'horoscope')
    await expect(page.locator('.horoscope-info-title').first()).toBeVisible()
    const nav = page.locator('.bottom-nav-wrap')
    await expect(nav).toBeAttached()
    await expect(nav).not.toHaveClass(/bottom-nav-wrap--hidden/)
  })

  test('premium mounts and HIDES the bottom nav (no overlap)', async ({ page }) => {
    await seed(page)
    await go(page, 'premium')
    await expect(page.locator('.sticky-purchase')).toBeVisible()
    await expect(page.locator('.bottom-nav-wrap')).toBeHidden()
  })

  test('tarot mounts and HIDES the bottom nav (immersive)', async ({ page }) => {
    await seed(page)
    await go(page, 'tarot')
    await expect(page.locator('.q-page')).toBeVisible()
    await expect(page.locator('.bottom-nav-wrap')).toBeHidden()
  })

  // The tarot background video must reveal itself (opacity gate). If isVideoPlaying
  // never flips on, the page shows a black background instead of the video.
  test('tarot background video becomes visible', async ({ page }) => {
    await seed(page)
    await go(page, 'tarot')
    await expect(page.locator('.oracle-video')).toHaveClass(/oracle-video--visible/, { timeout: 8000 })
  })

  // The intro narration must render real copy (it depends on i18n being ready at
  // mount). A blank/skipped bubble means the intro broke.
  test('tarot intro narration renders text', async ({ page }) => {
    await seed(page)
    await go(page, 'tarot')
    const bubble = page.locator('.oracle-bubble')
    await expect(bubble).toBeVisible({ timeout: 5000 })
    await expect(bubble).not.toHaveText('')
  })
})
