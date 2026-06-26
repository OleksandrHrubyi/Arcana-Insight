// src/i18n/index.js

import { ref } from 'vue'
// Statically bundled so every translation is present on the very first paint.
// Lazy-loading the bundle on idle flashed raw keys (nav.home, appName,
// dailyPage.title, the landing hero) above the fold on cold start until the chunk
// resolved (~260ms–1.2s); the copy is needed immediately, so there was nothing to
// defer (QA findings #20/#21).
import { messages as bundledMessages } from './messages.bundle.js'

const DEFAULT_LOCALE = 'en'
export const currentLocale = ref((typeof localStorage !== 'undefined' && localStorage.getItem('locale')) || DEFAULT_LOCALE)

export function setLocale(locale) {
  const next = locale || DEFAULT_LOCALE
  currentLocale.value = next
  localStorage.setItem('locale', next)
  window.dispatchEvent(new CustomEvent('locale-changed', { detail: next }))
}

export function getLocale() {
  return currentLocale.value || DEFAULT_LOCALE
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
