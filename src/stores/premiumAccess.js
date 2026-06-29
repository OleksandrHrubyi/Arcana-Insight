import { computed, ref } from 'vue'

const STORAGE_KEY = 'arcana_premium_access_v1'
const PREMIUM_CHANGED_EVENT = 'arcana-premium-access-changed'

const normalizePlan = (value) => (value === 'yearly' ? 'yearly' : 'monthly')
const normalizeSource = (value) => {
  const source = String(value || 'billing').toLowerCase()
  return source === 'local' ? 'local' : 'billing'
}

const readFromStorage = () => {
  if (typeof window === 'undefined') {
    return { active: false, plan: 'monthly', updatedAt: '', source: 'billing' }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { active: false, plan: 'monthly', updatedAt: '', source: 'billing' }
    }
    const parsed = JSON.parse(raw)
    const source = normalizeSource(parsed?.source)
    const active = source === 'local' ? false : Boolean(parsed?.active)
    return {
      active,
      plan: normalizePlan(parsed?.plan),
      updatedAt: String(parsed?.updatedAt || ''),
      source,
    }
  } catch {
    return { active: false, plan: 'monthly', updatedAt: '', source: 'billing' }
  }
}

const state = ref(readFromStorage())
let listenersAttached = false
// Keep handler refs so they can be removed (A-10) — otherwise the test reset
// flipped listenersAttached=false without removeEventListener, so each
// usePremiumAccess() in a suite stacked another pair of listeners.
let storageHandler = null
let premiumChangedHandler = null

const writeToStorage = (next) => {
  state.value = next
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore storage failures
  }
  window.dispatchEvent(new CustomEvent(PREMIUM_CHANGED_EVENT, { detail: next }))
}

const ensureListeners = () => {
  if (listenersAttached || typeof window === 'undefined') {
    return
  }
  listenersAttached = true

  storageHandler = (event) => {
    if (event.key !== STORAGE_KEY) return
    state.value = readFromStorage()
  }
  window.addEventListener('storage', storageHandler)

  premiumChangedHandler = (event) => {
    // Same-document writes already set `state` directly and pass the new value as
    // detail — trust it. Re-reading storage here would clobber the just-applied
    // in-memory value with a STALE read if the localStorage write had failed
    // (storage pressure / private mode), silently reverting a fresh purchase. A-5.
    if (event && event.detail) {
      state.value = event.detail
      return
    }
    state.value = readFromStorage()
  }
  window.addEventListener(PREMIUM_CHANGED_EVENT, premiumChangedHandler)
}

const revokePremiumAccess = () => {
  writeToStorage({
    active: false,
    plan: 'monthly',
    updatedAt: new Date().toISOString(),
    source: 'billing',
  })
}

const syncPremiumAccess = () => {
  state.value = readFromStorage()
}

const applyPremiumAccessStatus = ({ active = false, plan = 'monthly', source = 'billing' } = {}) => {
  const normalizedSource = normalizeSource(source)
  writeToStorage({
    active: normalizedSource === 'local' ? false : Boolean(active),
    plan: normalizePlan(plan),
    updatedAt: new Date().toISOString(),
    source: normalizedSource,
  })
}

// Decide how a RevenueCat billing status should be applied to local premium,
// given auth. Premium is gated on auth: RevenueCat still sees the device's
// subscription even when no user is signed in, so never grant to a logged-out
// session. 'defer' while the session is unresolved (a later sync handles it),
// 'revoke' once we know the user is signed out, 'apply' only while logged in.
// Shared by the paywall mount, app boot, and resume sync.
export const resolveBillingPremiumAction = ({ sessionLoaded = false, userId = '' } = {}) => {
  if (!sessionLoaded) return 'defer'
  if (!String(userId || '').trim()) return 'revoke'
  return 'apply'
}

const hasPremiumAccess = computed(() => Boolean(state.value?.active))
const premiumPlan = computed(() => normalizePlan(state.value?.plan))

export function usePremiumAccess() {
  ensureListeners()
  return {
    state,
    hasPremiumAccess,
    premiumPlan,
    revokePremiumAccess,
    syncPremiumAccess,
    applyPremiumAccessStatus,
  }
}

export const __resetPremiumAccessForTests = () => {
  if (typeof window !== 'undefined') {
    if (storageHandler) window.removeEventListener('storage', storageHandler)
    if (premiumChangedHandler) window.removeEventListener(PREMIUM_CHANGED_EVENT, premiumChangedHandler)
  }
  storageHandler = null
  premiumChangedHandler = null
  listenersAttached = false
  state.value = readFromStorage()
}
