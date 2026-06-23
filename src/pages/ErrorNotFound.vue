<template>
  <div class="notfound-page">
    <div class="notfound-bg" aria-hidden="true"></div>
    <div class="notfound-content">
      <div class="notfound-title">{{ tt('common.notFoundTitle') }}</div>
      <div class="notfound-text">{{ tt('common.notFoundBody') }}</div>
      <q-btn
        flat
        class="notfound-btn"
        :label="tt('backToHome')"
        no-caps
        @click="goHome"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'

const router = useRouter()
const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)

const goHome = () => {
  router.replace('/')
}
</script>

<style scoped>
.notfound-page {
  min-height: 100dvh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}

.notfound-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.notfound-content {
  position: relative;
  z-index: 1;
  min-height: 100dvh;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.notfound-title {
  font-size: 20px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.notfound-text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.78);
  max-width: 360px;
}

.notfound-btn {
  margin-top: 6px;
  border-radius: 12px;
  border: 1px solid var(--btn-secondary-border);
  color: var(--btn-secondary-text);
  background: var(--btn-secondary-bg);
  height: 44px;
  padding: 0 18px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
</style>
