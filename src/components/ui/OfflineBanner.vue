<template>
  <transition name="offline-slide">
    <div v-if="isOffline" class="offline-banner" role="status" aria-live="polite">
      <q-icon name="wifi_off" size="15px" class="offline-banner__icon" />
      <span>{{ offlineLabel }}</span>
    </div>
  </transition>
</template>

<script setup>
// Global "you're offline" indicator. Uses navigator.onLine + the window online/
// offline events, which fire in the iOS WKWebView on airplane-mode toggles. No new
// dependency; if @capacitor/network is added later this can upgrade to native
// reachability. Mounted once in App.vue so it sits above every route.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { t, currentLocale } from 'src/i18n'

const isOffline = ref(false)
const offlineLabel = computed(() => t(currentLocale.value, 'common.offline'))

const update = () => {
  isOffline.value = typeof navigator !== 'undefined' && navigator.onLine === false
}

onMounted(() => {
  update()
  if (typeof window !== 'undefined') {
    window.addEventListener('online', update, { passive: true })
    window.addEventListener('offline', update, { passive: true })
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', update)
    window.removeEventListener('offline', update)
  }
})
</script>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: calc(env(safe-area-inset-top) + 8px) 16px 8px;
  background: linear-gradient(180deg, rgba(58, 44, 32, 0.97), rgba(44, 33, 24, 0.97));
  border-bottom: 1px solid rgba(214, 178, 120, 0.22);
  color: #f4e6cf;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.01em;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.34);
  /* Informational only — never intercept taps on the content below. */
  pointer-events: none;
}

.offline-banner__icon {
  opacity: 0.85;
}

.offline-slide-enter-active,
.offline-slide-leave-active {
  transition: transform 240ms ease, opacity 240ms ease;
}

.offline-slide-enter-from,
.offline-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .offline-slide-enter-active,
  .offline-slide-leave-active {
    transition: opacity 240ms ease;
  }

  .offline-slide-enter-from,
  .offline-slide-leave-to {
    transform: none;
  }
}
</style>
