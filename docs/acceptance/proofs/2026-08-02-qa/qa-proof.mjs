// QA independent proof run — observer-timezone B1/D4 + observer-calendar-day A1/D6.
// Self-evidencing: every frame carries a banner with the DEVICE timezone and the
// DEVICE local date, so the screenshot proves the device is in LA and on July 31,
// instead of relying on a README claim.
import { mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
const pw = await import(pathToFileURL(process.argv[3]).href)
const chromium = pw.chromium || pw.default?.chromium

const BASE = 'http://127.0.0.1:9010'
const OUT = process.argv[2]
const AT = '2026-08-01T06:30:00Z'
mkdirSync(OUT, { recursive: true })

const banner = `
;(function () {
  var b = document.createElement('div')
  b.id = 'qa-banner'
  b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;' +
    'background:#7a1020;color:#fff;font:600 11px/1.35 -apple-system,sans-serif;' +
    'padding:5px 8px;text-align:center;letter-spacing:.2px'
  var tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  var d = new Date()
  b.textContent = 'DEVICE TZ ' + tz + ' · DEVICE LOCAL ' + d.toString().slice(0, 24) +
    ' · UTC ' + d.toISOString().slice(0, 16) + 'Z'
  document.body.appendChild(b)
})()
`

const shot = async (page, name) => {
  await page.evaluate(banner)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  await page.evaluate(() => document.getElementById('qa-banner')?.remove())
}

const browser = await chromium.launch()
const ctx = await browser.newContext({
  baseURL: BASE,
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  colorScheme: 'dark',
  locale: 'en-US',
  timezoneId: 'America/Los_Angeles',
})
const page = await ctx.newPage()
await page.addInitScript(() => {
  localStorage.setItem('locale', 'en')
  localStorage.setItem('arcana-onboarding-complete', 'true')
  localStorage.setItem('arcana-onboarding-interests', JSON.stringify(['sky', 'reflection', 'readings']))
})
await page.clock.setFixedTime(new Date(AT))

const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

// ---------- B1 (observer-timezone): SkyHomePage sunset row + Sun sheet ----------
await page.goto('/#/', { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(4000)
console.log('device tz/date seen by page:', await page.evaluate(
  () => Intl.DateTimeFormat().resolvedOptions().timeZone + ' | ' + new Date().toString()))
console.log('header chip:', (await page.locator('.skh-head').innerText().catch(() => '(none)')).replace(/\n/g, ' / '))
console.log('essentials:', (await page.locator('.skh-essentials').innerText().catch(() => '(none)')).replace(/\n/g, ' / '))
await shot(page, 'B1-home-sunset-row')

await page.locator('.skh-fact').nth(1).click()
await page.waitForTimeout(900)
console.log('sun sheet:', (await page.locator('.skh-sheet').innerText().catch(() => '(none)')).replace(/\n/g, ' / '))
await shot(page, 'B1-home-sun-sheet')
await page.keyboard.press('Escape')
await page.waitForTimeout(600)

// ---------- A1 (observer-calendar-day): SkyPage header + calendar ----------
await page.goto('/#/sky', { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(4200)
console.log('sky header:', (await page.locator('.sky-head, .sky-top').first().innerText().catch(() => '(none)')).replace(/\n/g, ' / '))
await shot(page, 'A1-sky-header-calendar')

// SkyPage Sun block (zone note lives here)
const sunBlock = await page.evaluate(() => {
  const notes = [...document.querySelectorAll('.sky-note')].map((n) => n.textContent.trim())
  return notes.join(' || ')
})
console.log('sky-note(s):', sunBlock || '(none)')

// ---------- D4 / D6: offline ----------
const requests = []
await ctx.setOffline(true)
page.on('request', (r) => requests.push(r.method() + ' ' + r.url()))
const errBefore = errors.length

for (const [route, name] of [['/#/', 'D-offline-home'], ['/#/sky', 'D-offline-sky'], ['/#/journal', 'D-offline-journal']]) {
  await page.evaluate((r) => { window.location.hash = r.slice(1) }, route)
  await page.waitForTimeout(3500)
  await shot(page, name)
  console.log(`offline ${name}: body chars =`, (await page.locator('body').innerText()).length)
}

console.log('--- OFFLINE NETWORK REQUESTS (after setOffline) ---')
const app = requests.filter((u) => !/__vite|__hmr|sockjs|\.vite\/|\?t=\d|ws:/.test(u))
console.log('total intercepted:', requests.length, '| non-HMR:', app.length)
app.slice(0, 40).forEach((u) => console.log('  ', u))
console.log('pageerrors during offline walk:', errors.length - errBefore, errors.slice(errBefore))
console.log('pageerrors total:', errors.length)

await browser.close()
