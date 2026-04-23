<template>
  <q-page class="faq-page">
    <div class="faq-bg" aria-hidden="true"></div>

    <div class="faq-content">
      <header class="faq-hero faq-hero--with-back">
        <button type="button" class="faq-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="faq-hero__text">
          <div class="faq-title">{{ tt('faqPage.title') }}</div>
          <div class="faq-kicker">{{ tt('faqPage.subtitle') }}</div>
        </div>
      </header>

      <section class="faq-card">
        <div class="faq-card__title">{{ tt('faqPage.sectionFaq') }}</div>
        <div v-for="item in faqItems" :key="item.q" class="faq-item">
          <button type="button" class="faq-item__q" @click="toggleItem(item.q)">
            <span>{{ tt(item.q) }}</span>
            <q-icon :name="openItems.has(item.q) ? 'expand_less' : 'expand_more'" size="18px" />
          </button>
          <transition name="faq-expand">
            <div v-if="openItems.has(item.q)" class="faq-item__a">{{ tt(item.a) }}</div>
          </transition>
        </div>
      </section>

      <section class="faq-card faq-card--support">
        <div class="faq-card__title">{{ tt('faqPage.sectionSupport') }}</div>
        <div class="faq-support">
          <p class="faq-support__text">{{ tt('faqPage.supportText') }}</p>
          <a class="faq-support__link" :href="mailtoLink">{{ supportEmail }}</a>
        </div>
      </section>
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const router = useRouter()

const supportEmail = 'ghrubyi@ukr.net'
const mailtoLink = `mailto:${supportEmail}`

const faqItems = [
  { q: 'faqPage.q1', a: 'faqPage.a1' },
  { q: 'faqPage.q7', a: 'faqPage.a7' },
  { q: 'faqPage.q8', a: 'faqPage.a8' },
  { q: 'faqPage.q2', a: 'faqPage.a2' },
  { q: 'faqPage.q5', a: 'faqPage.a5' },
  { q: 'faqPage.q4', a: 'faqPage.a4' },
  { q: 'faqPage.q3', a: 'faqPage.a3' },
  { q: 'faqPage.q6', a: 'faqPage.a6' },
]

const openItems = ref(new Set())

const hapticTap = async () => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    console.error(e)
  }
}

const toggleItem = async (key) => {
  const next = new Set(openItems.value)
  if (next.has(key)) {
    next.delete(key)
  } else {
    next.add(key)
  }
  openItems.value = next
  await hapticTap()
}

const onBack = async () => {
  await hapticTap()
  router.back()
}
</script>

<style scoped lang="scss">
.faq-page {
  min-height: 100vh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}

.faq-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.faq-content {
  position: relative;
  z-index: 1;
  padding: calc(70px + env(safe-area-inset-top)) 18px 32px;
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.faq-hero {
  display: grid;
  gap: 3px;
}

.faq-hero--with-back {
  position: relative;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 10px;
}

.faq-hero__text {
  text-align: center;
  display: grid;
  gap: 3px;
  justify-items: center;
  padding: 0 44px;
}

.faq-title {
  font-size: 18px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.faq-kicker {
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.faq-back {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 14, 22, 0.7);
  color: rgba(214, 225, 242, 0.8);
  display: grid;
  place-items: center;
}

.faq-card {
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(11, 15, 24, 0.8);
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  display: grid;
  gap: 12px;
}

.faq-card__title {
  font-size: 10px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.faq-item {
  display: grid;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.faq-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.faq-item__q {
  font-size: 14px;
  letter-spacing: 0.02em;
  text-transform: none;
  color: rgba(235, 242, 255, 0.95);
  background: transparent;
  border: none;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  text-align: left;
  width: 100%;
}

.faq-item__a {
  font-size: 14px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.7);
}

.faq-expand-enter-active,
.faq-expand-leave-active {
  transition: max-height 240ms ease, opacity 240ms ease;
  overflow: hidden;
}

.faq-expand-enter-from,
.faq-expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.faq-expand-enter-to,
.faq-expand-leave-from {
  max-height: 160px;
  opacity: 1;
}

.faq-card--support {
  gap: 10px;
}

.faq-support__text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.8);
  margin: 0 0 8px;
}

.faq-support__link {
  color: rgba(180, 230, 255, 0.95);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 12px;
}
</style>
