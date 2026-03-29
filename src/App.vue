<template>
  <router-view v-slot="{ Component, route }">
    <transition name="route-fade" mode="out-in">
      <component :is="Component" :key="route.fullPath" />
    </transition>
  </router-view>
</template>

<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { initPushListeners } from 'boot/push'
import { getBillingPremiumStatus } from 'src/services/premiumBilling'
import { usePremiumAccess } from 'src/stores/premiumAccess'

const { applyPremiumAccessStatus } = usePremiumAccess()
const router = useRouter()
let delayedInitTimer = null

const syncPremiumStatus = async () => {
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

onMounted(() => {
  // Keep first paint light: postpone non-critical startup tasks.
  delayedInitTimer = setTimeout(() => {
    void initPushListenersSafe()
    void syncPremiumStatusSafe()
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
