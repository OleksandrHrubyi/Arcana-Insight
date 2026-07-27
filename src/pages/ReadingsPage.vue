<template>
  <q-page class="rdg">
    <div class="rdg-bg" aria-hidden="true"></div>
    <div class="rdg-content">
      <header class="rdg-head">
        <div class="rdg-title">{{ tt('readingsHubPage.title') }}</div>
        <div class="rdg-subtitle">{{ tt('readingsHubPage.subtitle') }}</div>
      </header>

      <div class="rdg-list">
        <button
          v-for="item in items"
          :key="item.route"
          type="button"
          class="rdg-item"
          @click="go(item.route)"
        >
          <span class="rdg-item__icon"><q-icon :name="item.icon" size="22px" /></span>
          <span class="rdg-item__text">
            <span class="rdg-item__title">{{ tt(item.titleKey) }}</span>
            <span class="rdg-item__desc">{{ tt(item.descKey) }}</span>
          </span>
          <q-icon name="chevron_right" size="18px" class="rdg-item__arrow" />
        </button>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const router = useRouter()

const items = [
  {
    route: 'daily',
    icon: 'style',
    titleKey: 'readingsHubPage.cardOfDay',
    descKey: 'readingsHubPage.cardOfDayDesc',
  },
  {
    route: 'tarot',
    icon: 'auto_stories',
    titleKey: 'readingsHubPage.tarot',
    descKey: 'readingsHubPage.tarotDesc',
  },
  {
    route: 'horoscope',
    icon: 'brightness_3',
    titleKey: 'readingsHubPage.horoscope',
    descKey: 'readingsHubPage.horoscopeDesc',
  },
  {
    route: 'compatibility',
    icon: 'favorite_border',
    titleKey: 'readingsHubPage.compatibility',
    descKey: 'readingsHubPage.compatibilityDesc',
  },
]

const go = (name) => router.push({ name, query: { source: 'readings' } })
</script>

<style scoped lang="scss">
.rdg {
  position: relative;
  min-height: 100vh;
  color: #e9edf4;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  overflow-x: hidden;
}
.rdg-content {
  position: relative;
  z-index: 1;
  max-width: 520px;
  margin: 0 auto;
  padding: calc(28px + env(safe-area-inset-top)) 16px calc(96px + env(safe-area-inset-bottom));
}
.rdg-head {
  margin-bottom: 22px;
}
.rdg-title {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.01em;
}
.rdg-subtitle {
  margin-top: 4px;
  font-size: 14px;
  color: rgba(184, 205, 236, 0.7);
}
.rdg-list {
  display: grid;
  gap: 10px;
}
.rdg-item {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(120% 90% at 18% 0%, rgba(112, 156, 255, 0.16) 0%, rgba(12, 18, 30, 0.1) 44%, transparent 100%),
    linear-gradient(160deg, rgba(14, 20, 32, 0.92), rgba(6, 10, 18, 0.98));
  box-shadow:
    0 14px 34px rgba(2, 6, 12, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  color: #e9edf4;
  font-family: inherit;
  text-align: left;
  transition: transform 0.12s ease;
}
.rdg-item:active {
  transform: scale(0.985);
}
.rdg-item__icon {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(150, 180, 220, 0.16);
  background: rgba(9, 14, 23, 0.6);
  color: rgba(180, 205, 255, 0.95);
}
.rdg-item__text {
  flex: 1 1 auto;
  min-width: 0;
  display: grid;
  gap: 2px;
}
.rdg-item__title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(233, 240, 250, 0.96);
}
.rdg-item__desc {
  font-size: 12.5px;
  color: rgba(184, 205, 236, 0.66);
}
.rdg-item__arrow {
  flex: 0 0 auto;
  color: rgba(214, 225, 242, 0.4);
}
</style>
