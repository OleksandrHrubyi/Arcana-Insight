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

  // Regression #5: the sign-up branch dropped the auth redirect, dumping a
  // paywall-cohort newcomer on Home after verifying. The login <-> sign-up links
  // must carry `redirect` so the destination survives choosing "Sign up".
  test('sign-up link preserves the auth redirect (no paid-conversion dead-end)', async ({ page }) => {
    await seedLoggedOut(page)
    await go(page, 'login?redirect=%2Fpremium')
    // Encoding-agnostic: hash-mode router renders the query value un-escaped.
    const toSignUp = page.locator('a[href*="/sign-up"]')
    await expect(toSignUp).toHaveAttribute('href', /sign-up\?redirect=.*premium/)
    await toSignUp.click()
    await page.waitForTimeout(400)
    await expect(page).toHaveURL(/sign-up\?redirect=.*premium/)
    // The reverse link back to login keeps it too (no loss on round-trip).
    await expect(page.locator('a[href*="/login"]')).toHaveAttribute('href', /login\?redirect=.*premium/)
  })

  // Regression #14: an invalid/expired recovery link left the user on a
  // permanently-disabled form with no way out (the route hides the bottom nav).
  // It must surface the error AND a working escape control.
  test('reset-password invalid/expired link is escapable (no dead-end)', async ({ page }) => {
    await seedLoggedOut(page)
    await go(page, 'reset-password')
    // No recovery tokens → invalid-link state; the only control must lead somewhere.
    const out = page.locator('.reset-submit-btn')
    await expect(out).toBeVisible()
    await out.click()
    await page.waitForTimeout(600)
    await expect(page).toHaveURL(/#\/login/)
  })

  // Regression #8: tapping a saved compatibility connection did nothing when the
  // user's own ("You") birth date wasn't set — a visible, tappable dead element.
  // It must instead prompt for the missing birth date.
  test('saved connection tap prompts for "You" birth date when missing (no inert tap)', async ({ page }) => {
    await seedLoggedOut(page)
    await page.addInitScript(() => {
      localStorage.setItem(
        'CapacitorStorage.arcana_compatibility_connections_v1',
        JSON.stringify([
          { id: 'c0_1990-05-15_romantic', name: 'Test', emoji: '❤️', dob: '1990-05-15', birth: null, relationshipType: 'romantic' },
        ]),
      )
    })
    await go(page, 'compatibility')
    const card = page.locator('.compat-savedconn__open').first()
    await expect(card).toBeVisible()
    // No "You" chart yet → the tap must open the birth-date sheet, not no-op.
    await card.click()
    await page.waitForTimeout(500)
    await expect(page.locator('.q-dialog').first()).toBeVisible()
  })

  // The ritual rewards store is parked pre-launch behind REWARDS_ENABLED=false.
  // A deep link to /rewards must not render the store — it redirects to menu so
  // there's no way to spend points or pick up a paywall-bypassing token.
  test('rewards store is gated: deep-link to /rewards redirects away (store unreachable)', async ({ page }) => {
    await seedLoggedOut(page)
    await go(page, 'rewards')
    // Did NOT land on (or stay on) the rewards store.
    await expect(page).not.toHaveURL(/#\/rewards/)
    await expect(page).toHaveURL(/#\/menu/)
    // None of the store UI rendered.
    await expect(page.locator('.rewards-filters')).toHaveCount(0)
  })

  // A free user who already drew today's card is told up front (oracle: "come back
  // tomorrow / Premium") instead of being walked through theme → question only to
  // hit the daily limit at the spread chooser.
  test('free daily-spent user is gated at the intro, not the spread chooser', async ({ page }) => {
    await seedLoggedOut(page)
    await page.addInitScript(() => {
      const d = new Date()
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      localStorage.setItem('arcana_free_tarot_daily_v1', JSON.stringify({ date: key }))
      // Skip the (long) intro so proceedAfterIntro runs immediately.
      sessionStorage.setItem('arcana_oracle_intro_seen_v1', '1')
    })
    await go(page, 'tarot')
    await page.waitForTimeout(600)
    // The oracle gates up front with the daily-spent prompt (uk copy mentions "завтра").
    await expect(page.locator('.oracle-bubble')).toContainText('завтра')
  })
})
