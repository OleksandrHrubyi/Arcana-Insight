import { test, expect } from '@playwright/test'

const HOME_STATES = [
  {
    name: 'fresh',
    query: '?qa=home&view=fresh&locale=en',
  },
  {
    name: 'revealed',
    query: '?qa=home&view=revealed&locale=en',
  },
  {
    name: 'generic',
    query: '?qa=home&view=generic&locale=en',
  },
]

test.describe('home visual qa', () => {
  for (const state of HOME_STATES) {
    test(`landing home ${state.name}`, async ({ page }) => {
      await page.addInitScript(() => {
        localStorage.setItem('locale', 'en')
        localStorage.setItem('arcana-onboarding-complete', 'true')
        localStorage.setItem('arcana-onboarding-interests', JSON.stringify(['career', 'self']))
      })

      await page.goto(`/${state.query}`, { waitUntil: 'networkidle' })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.addStyleTag({
        content: `
          *,
          *::before,
          *::after {
            animation: none !important;
            transition: none !important;
            scroll-behavior: auto !important;
          }
        `,
      })

      await expect(page.locator('.circle-card')).toBeVisible()
      await expect(page.locator('.focus-today')).toBeVisible()
      await expect(page.locator('.circle-card__eyebrow')).toHaveText('CARD OF THE DAY')

      await expect(page).toHaveScreenshot(`landing-home-${state.name}.png`, {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
      })
    })
  }
})
