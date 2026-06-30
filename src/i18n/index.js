// src/i18n/index.js

import { ref } from 'vue'
// Statically bundled so every translation is present on the very first paint.
// Lazy-loading the bundle on idle flashed raw keys (nav.home, appName,
// dailyPage.title, the landing hero) above the fold on cold start until the chunk
// resolved (~260ms–1.2s); the copy is needed immediately, so there was nothing to
// defer (QA findings #20/#21).
import { messages as bundledMessages } from './messages.bundle.js'

const DEFAULT_LOCALE = 'en'
const SUPPORTED_LOCALES = ['en', 'uk']

// First launch has no stored locale. Fall back to the device's preferred
// language so a Ukrainian-locale phone opens in Ukrainian instead of English
// (the user can still override it on onboarding or in Settings). navigator.languages
// is available synchronously in the WKWebView, so there is no en→uk flash on the
// first paint — unlike async @capacitor/device. The detected default is NOT
// persisted: only an explicit setLocale() writes localStorage, so the app keeps
// following the device until the user makes a real choice.
function detectDeviceLocale() {
  if (typeof navigator === 'undefined') return null
  const prefs = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language]
  for (const tag of prefs) {
    if (!tag) continue
    const base = String(tag).toLowerCase().split('-')[0]
    if (SUPPORTED_LOCALES.includes(base)) return base
  }
  return null
}

function resolveInitialLocale() {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('locale')
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored
  }
  return detectDeviceLocale() || DEFAULT_LOCALE
}

export const currentLocale = ref(resolveInitialLocale())

export function setLocale(locale) {
  const next = locale || DEFAULT_LOCALE
  currentLocale.value = next
  localStorage.setItem('locale', next)
  window.dispatchEvent(new CustomEvent('locale-changed', { detail: next }))
}

export function getLocale() {
  return currentLocale.value || DEFAULT_LOCALE
}

// Picks the correct plural form of a noun for a count. Ukrainian needs three
// forms — one / few / many — chosen by the Slavic CLDR rule (e.g. 1 карта,
// 2 карти, 5 карт); English and any other locale fall back to one/other.
// `forms` is a {one, few, many, other} object such as the dayForms/cardForms
// key sets in messages.bundle.js.
export function pluralForm(locale, n, forms) {
  forms = forms || {}
  const num = Math.abs(Number(n) || 0)
  if (locale === 'uk') {
    const mod10 = num % 10
    const mod100 = num % 100
    if (mod10 === 1 && mod100 !== 11) return forms.one || forms.many || ''
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few || forms.many || ''
    return forms.many || ''
  }
  return num === 1 ? forms.one || '' : forms.other || forms.many || ''
}

export const messages = bundledMessages

export function t(locale, key) {
  if (key == null && typeof locale === 'string') {
    key = locale
    locale = undefined
  }
  if (!key) return '';

  const activeLocale = locale || getLocale()

  const parts = key.split('.');
  let value = messages?.[activeLocale];

  for (const p of parts) {
    value = value?.[p];
    if (value == null) break;
  }

  if (value == null && activeLocale !== 'en') {
    let fallback = messages.en;
    for (const p of parts) {
      fallback = fallback?.[p];
      if (fallback == null) break;
    }
    return fallback ?? key;
  }

  return value ?? key;
}
