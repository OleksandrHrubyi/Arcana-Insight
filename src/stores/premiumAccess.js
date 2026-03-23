import { computed, ref } from 'vue'

const STORAGE_KEY = 'arcana_premium_access_v1'
const PREMIUM_CHANGED_EVENT = 'arcana-premium-access-changed'

const normalizePlan = (value) => (value === 'yearly' ? 'yearly' : 'monthly')

const readFromStorage = () => {
  if (typeof window === 'undefined') {
    return { active: false, plan: 'monthly', updatedAt: '', source: 'local' }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return { active: false, plan: 'monthly', updatedAt: '', source: 'local' }
    }
    const parsed = JSON.parse(raw)
    return {
      active: Boolean(parsed?.active),
      plan: normalizePlan(parsed?.plan),
      updatedAt: String(parsed?.updatedAt || ''),
      source: String(parsed?.source || 'local'),
    }
  } catch {
    return { active: false, plan: 'monthly', updatedAt: '', source: 'local' }
  }
}

const state = ref(readFromStorage())
let listenersAttached = false

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

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    state.value = readFromStorage()
  })

  window.addEventListener(PREMIUM_CHANGED_EVENT, () => {
    state.value = readFromStorage()
  })
}

const grantPremiumAccess = (plan = 'monthly') => {
  writeToStorage({
    active: true,
    plan: normalizePlan(plan),
    updatedAt: new Date().toISOString(),
    source: 'local',
  })
}

const restorePremiumAccess = () => {
  const current = readFromStorage()
  if (current.active) {
    writeToStorage({
      ...current,
      updatedAt: new Date().toISOString(),
      source: String(current.source || 'local'),
    })
  } else {
    state.value = current
  }
  return current.active
}

const revokePremiumAccess = () => {
  writeToStorage({
    active: false,
    plan: 'monthly',
    updatedAt: new Date().toISOString(),
    source: 'local',
  })
}

const syncPremiumAccess = () => {
  state.value = readFromStorage()
}

const applyPremiumAccessStatus = ({ active = false, plan = 'monthly', source = 'billing' } = {}) => {
  writeToStorage({
    active: Boolean(active),
    plan: normalizePlan(plan),
    updatedAt: new Date().toISOString(),
    source: String(source || 'billing'),
  })
}

const hasPremiumAccess = computed(() => Boolean(state.value?.active))
const premiumPlan = computed(() => normalizePlan(state.value?.plan))

export function usePremiumAccess() {
  ensureListeners()
  return {
    state,
    hasPremiumAccess,
    premiumPlan,
    grantPremiumAccess,
    restorePremiumAccess,
    revokePremiumAccess,
    syncPremiumAccess,
    applyPremiumAccessStatus,
  }
}
