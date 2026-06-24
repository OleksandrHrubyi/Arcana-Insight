<template>
  <router-view v-slot="{ Component, route }">
    <transition name="route-fade" mode="out-in">
      <component :is="Component" :key="route.matched[0]?.path || route.path" />
    </transition>
  </router-view>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { initPushListeners } from 'boot/push'
import { getBillingPremiumStatus } from 'src/services/premiumBilling'
import { usePremiumAccess } from 'src/stores/premiumAccess'
import { useAuthStore } from 'src/stores/authStore'
import { analytics } from 'src/services/analytics'
import { RETENTION_EVENTS } from 'src/constants/analyticsEvents'

const { applyPremiumAccessStatus, revokePremiumAccess } = usePremiumAccess()
const authStore = useAuthStore()
const router = useRouter()
let delayedInitTimer = null

const syncPremiumStatus = async () => {
  // Premium is gated on being logged in. If the session isn't ready yet, do nothing
  // (a later sync / onUserAuthenticated handles it). If we KNOW the user is logged
  // out, ensure premium is revoked — never let RevenueCat (which still sees the
  // device's subscription) grant premium to a logged-out session.
  if (!authStore.state.sessionLoaded) return
  if (!authStore.state.user?.id) {
    revokePremiumAccess()
    return
  }
  const status = await getBillingPremiumStatus()
  if (!status.ok || !status.available) return
  applyPremiumAccessStatus({
    active: status.hasPremium,
    plan: status.plan,
    source: 'billing',
  })
}

const syncPremiumStatusSafe = async () => {
  try {
    await syncPremiumStatus()
  } catch (error) {
    console.warn('[premium] sync status failed', error)
  }
}

const navigateFromPush = async (target) => {
  await router.push(target)
}

const initPushListenersSafe = async () => {
  try {
    await initPushListeners({ navigate: navigateFromPush })
  } catch (error) {
    console.warn('[push] init listeners failed', error)
  }
}

const logDailyActiveOnce = () => {
  try {
    const key = 'arcana_daily_active_v1'
    const today = new Date().toLocaleDateString('en-CA') // local YYYY-MM-DD
    if (localStorage.getItem(key) === today) return
    localStorage.setItem(key, today)
    void analytics.logEvent(RETENTION_EVENTS.dailyActive, {})
  } catch {
    // ignore storage/analytics errors
  }
}

onMounted(() => {
  // Keep first paint light: postpone non-critical startup tasks.
  delayedInitTimer = setTimeout(() => {
    void initPushListenersSafe()
    void syncPremiumStatusSafe()
    logDailyActiveOnce()
  }, 700)
})

onBeforeUnmount(() => {
  if (delayedInitTimer) {
    clearTimeout(delayedInitTimer)
  }
  delayedInitTimer = null
})
</script>

<style>
body {
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  min-height: 100vh;
}

/*noinspection CssUnusedSymbol*/
.route-fade-enter-active,
.route-fade-leave-active {
  transition: opacity 180ms cubic-bezier(0.4, 0, 0.2, 1);
}

/*noinspection CssUnusedSymbol*/
.route-fade-enter-from,
.route-fade-leave-to {
  opacity: 0;
}
</style>
