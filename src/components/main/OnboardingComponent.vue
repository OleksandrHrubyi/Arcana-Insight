<template>
  <q-page class="onboarding-page">
    <div class="onboarding-bg" aria-hidden="true"></div>

    <div class="onboarding-content">
      <header class="onboarding-hero">
        <div class="onboarding-title">{{ tt('onboardingPage.title') }}</div>
        <div class="onboarding-kicker">{{ tt('onboardingPage.subtitle') }}</div>
      </header>

      <section class="onboarding-card">
        <div class="onboarding-card__title">{{ tt('onboardingPage.sectionInterests') }}</div>
        <div class="onboarding-tags">
          <button
            v-for="item in interestItems"
            :key="item.key"
            type="button"
            class="onboarding-tag"
            :class="{ 'onboarding-tag--active': selectedInterests.includes(item.key) }"
            @click="toggleInterest(item.key)"
          >
            {{ tt(item.labelKey) }}
          </button>
        </div>
      </section>

      <section class="onboarding-card onboarding-card--note">
        <div class="onboarding-card__title">{{ tt('onboardingPage.sectionHint') }}</div>
        <div class="onboarding-card__text">{{ tt('onboardingPage.hintText') }}</div>
      </section>

      <div class="onboarding-actions">
        <button type="button" class="onboarding-skip" @click="skip">
          {{ tt('onboardingPage.skip') }}
        </button>
        <button type="button" class="onboarding-continue" @click="continueNext">
          {{ tt('onboardingPage.continue') }}
        </button>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const router = useRouter()
const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)

const interestItems = [
  { key: 'love', labelKey: 'onboardingPage.interests.love' },
  { key: 'career', labelKey: 'onboardingPage.interests.career' },
  { key: 'money', labelKey: 'onboardingPage.interests.money' },
  { key: 'self', labelKey: 'onboardingPage.interests.self' },
  { key: 'energy', labelKey: 'onboardingPage.interests.energy' },
  { key: 'future', labelKey: 'onboardingPage.interests.future' },
]

const selectedInterests = ref([])

const haptic = async () => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    console.error(e)
  }
}

const toggleInterest = async (key) => {
  const index = selectedInterests.value.indexOf(key)
  if (index >= 0) {
    selectedInterests.value.splice(index, 1)
  } else {
    selectedInterests.value.push(key)
  }
  await haptic()
}

const persist = () => {
  try {
    localStorage.setItem('arcana-onboarding-interests', JSON.stringify(selectedInterests.value))
    localStorage.setItem('arcana-onboarding-complete', 'true')
  } catch (e) {
    console.error(e)
  }
}

const continueNext = async () => {
  persist()
  await haptic()
  await router.push({ name: 'menu' })
}

const skip = async () => {
  persist()
  await haptic()
  await router.push({ name: 'menu' })
}
</script>

<style scoped lang="scss">
.onboarding-page {
  min-height: 100vh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}

.onboarding-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.onboarding-content {
  position: relative;
  z-index: 1;
  padding: calc(80px + env(safe-area-inset-top)) 18px 32px;
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.onboarding-hero {
  text-align: center;
  display: grid;
  gap: 6px;
}

.onboarding-title {
  font-size: 20px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.onboarding-kicker {
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.onboarding-card {
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

.onboarding-card--note {
  background: rgba(8, 12, 20, 0.75);
}

.onboarding-card__title {
  font-size: 10px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.onboarding-card__text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.8);
}

.onboarding-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.onboarding-tag {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(9, 13, 21, 0.7);
  font-size: 13px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.7);
}

.onboarding-tag--active {
  border-color: rgba(159, 216, 246, 0.5);
  color: #fff;
  box-shadow: 0 0 12px rgba(159, 216, 246, 0.2);
}

.onboarding-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.onboarding-skip {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 12px 14px;
  background: rgba(9, 13, 21, 0.7);
  color: rgba(214, 225, 242, 0.8);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.onboarding-continue {
  border-radius: 12px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: #e9edf4;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
</style>
