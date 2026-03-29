// src/i18n/index.js

import { ref } from 'vue'

const DEFAULT_LOCALE = 'en'
export const currentLocale = ref(localStorage.getItem('locale') || DEFAULT_LOCALE)

export function setLocale(locale) {
  const next = locale || DEFAULT_LOCALE
  currentLocale.value = next
  localStorage.setItem('locale', next)
  window.dispatchEvent(new CustomEvent('locale-changed', { detail: next }))
  void ensureMessagesLoaded()
}

export function getLocale() {
  return currentLocale.value || DEFAULT_LOCALE
}

export const messages = {}

const loaded = { value: false }
const messagesVersion = ref(0)

async function ensureMessagesLoaded() {
  if (loaded.value) return
  const mod = await import('./messages.bundle.js')
  Object.assign(messages, mod.messages || {})
  loaded.value = true
  messagesVersion.value += 1
}

function scheduleMessagesPreload() {
  if (typeof window === 'undefined') return

  const load = () => {
    void ensureMessagesLoaded()
  }

  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(load, { timeout: 2000 })
    return
  }

  setTimeout(load, 700)
}


export function t(locale, key) {
  // reactive dependency for re-render when messages load
  messagesVersion.value
  if (!loaded.value) {
    void ensureMessagesLoaded()
  }
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

// preload in background
scheduleMessagesPreload()
