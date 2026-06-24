import { test, expect } from '@playwright/test'

// Interaction flow tests that DRIVE the app (not just screenshots), guarding the
// class of bugs that escaped code review and only showed on device: dead-ends,
// stuck states, paid actions without auth, locked-tap doing nothing, auto-bounce
// to the paywall. Each test reproduces a real fix from the June 2026 hardening.
//
// State note: with no Supabase session the app is logged-out + free (premium is
// revoked on no-session sync), which is the exact state most of these bugs lived in.
// Run: `npx playwright test flows`.

const seedLoggedOut = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem('locale', 'uk')
    localStorage.setItem('arcana-onboarding-complete', 'true')
    localStorage.setItem('arcana-onboarding-interests', JSON.stringify(['career', 'self']))
    // Ensure no stale premium/auth state leaks into the "logged-out free" baseline.
    localStorage.removeItem('arcana_premium_access_v1')
  })
}

const go = async (page, hash) => {
  await page.goto(`/#/${hash}`, { waitUntil: 'networkidle' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.waitForTimeout(800)
}

test.describe('flows: auth × premium dead-end guards', () => {
  // Regression: buying while logged out charged an anonymous RevenueCat user and
  // then lost premium on sync. The fix gates purchase behind sign-in.
  test('paywall Buy while logged-out routes to login (not a silent purchase)', async ({ page }) => {
    await seedLoggedOut(page)
    await go(page, 'premium')
    const buy = page.locator('.sticky-purchase__ok')
    await expect(buy).toBeVisible()
    await buy.click()
    await page.waitForTimeout(600)
    // Must land on the login screen, carrying a redirect back to the paywall.
    await expect(page).toHaveURL(/#\/login/)
    await expect(page).toHaveURL(/redirect/)
  })

  // Regression: a locked horoscope theme used to auto-bounce to /premium (redirect
  // loop class). It must stay on the page and show the blurred lock + CTA instead.
  test('locked horoscope theme stays on page with a lock panel (no auto-bounce)', async ({ page }) => {
    await seedLoggedOut(page)
    await go(page, 'horoscope?theme=love')
    // Did NOT bounce to the paywall.
    await expect(page).toHaveURL(/#\/horoscope/)
    await expect(page).not.toHaveURL(/premium/)
    // The in-page lock panel is shown.
    await expect(page.locator('.horoscope-lock-overlay').first()).toBeVisible()
    // Premium content must NOT be rendered behind the blur (extractable via DOM).
    // The locked panel shows the placeholder skeleton instead of the real text.
    await expect(page.locator('.horoscope-text-skeleton').first()).toBeAttached()
  })

  // Regression: deep-linking to an auth-gated route while logged out must redirect
  // cleanly to login (no blank screen / dead-end), carrying the destination.
  test('deep link to /account while logged-out redirects to login', async ({ page }) => {
    await seedLoggedOut(page)
    await go(page, 'account')
    await expect(page).toHaveURL(/#\/login/)
    await expect(page).toHaveURL(/redirect/)
  })

  // The paywall must always be escapable — a focused page with no history must
  // still offer a way out (close button present and wired).
  test('paywall has a working close control (no dead-end)', async ({ page }) => {
    await seedLoggedOut(page)
    await go(page, 'premium')
    const close = page.locator('.sticky-purchase__close-wrap .arcana-btn--secondary')
    await expect(close).toBeVisible()
    await close.click()
    await page.waitForTimeout(600)
    // Left the paywall (anywhere but /premium is fine).
    await expect(page).not.toHaveURL(/#\/premium/)
  })
})
