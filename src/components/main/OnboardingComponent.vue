<template>
  <q-page class="onboarding-page">
    <div class="onboarding-bg" aria-hidden="true"></div>
    <div class="onboarding-atmosphere" aria-hidden="true">
      <span class="onboarding-atmosphere__glow onboarding-atmosphere__glow--top"></span>
      <span class="onboarding-atmosphere__glow onboarding-atmosphere__glow--side"></span>
      <span class="onboarding-atmosphere__mesh"></span>
    </div>

    <div class="onboarding-content">
      <header class="onboarding-hero">
        <div class="onboarding-hero__eyebrow">{{ tt('onboardingPage.sectionInterests') }}</div>
        <h1 class="onboarding-title">{{ tt('onboardingPage.title') }}</h1>
        <p class="onboarding-kicker">{{ tt('onboardingPage.subtitle') }}</p>
      </header>

      <section class="onboarding-panel onboarding-panel--intro">
        <div class="onboarding-panel__row">
          <div>
            <div class="onboarding-panel__title">{{ tt('onboardingPage.sectionInterests') }}</div>
            <div class="onboarding-panel__subtitle">{{ tt('onboardingPage.sectionInterestsHint') }}</div>
          </div>
          <div class="onboarding-count">{{ selectedCount }}/3</div>
        </div>

        <div class="onboarding-progress" aria-hidden="true">
          <div class="onboarding-progress__track">
            <span :style="{ width: `${progressWidth}%` }"></span>
          </div>
          <div class="onboarding-progress__label">{{ selectedCount }}/3</div>
        </div>
      </section>

      <section class="onboarding-grid" :aria-label="tt('onboardingPage.sectionInterests')">
        <button
          v-for="item in displayInterestItems"
          :key="item.key"
          type="button"
          class="onboarding-interest"
          :class="{ 'onboarding-interest--active': item.isSelected }"
          :aria-pressed="String(item.isSelected)"
          @click="toggleInterest(item.key)"
        >
          <div class="onboarding-interest__top">
            <span class="onboarding-interest__icon-wrap">
              <q-icon :name="item.icon" size="18px" />
            </span>
            <span class="onboarding-interest__check">
              <q-icon name="check" size="12px" />
            </span>
          </div>
          <span class="onboarding-interest__label">{{ tt(item.labelKey) }}</span>
        </button>
      </section>

      <div class="onboarding-actions-shell">
        <button
          type="button"
          class="onboarding-continue"
          :class="{ 'onboarding-continue--feedback': continueFeedback }"
          :disabled="isNavigating"
          @click="continueNext"
        >
          {{ tt('onboardingPage.continue') }}
        </button>
        <div class="onboarding-skip-wrap">
          <button type="button" class="arcana-btn arcana-btn--secondary" :disabled="isNavigating" @click="skip">
            {{ tt('onboardingPage.skip') }}
          </button>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { analytics } from 'src/services/analytics'
import { ONBOARDING_EVENTS } from 'src/constants/analyticsEvents'
import {
  normalizeOnboardingInterests,
  persistOnboardingPreferences,
} from 'src/helpers/onboardingPrefs'
import {
  buildInterestSelectPayload,
  buildOnboardingExitContext,
} from 'src/helpers/onboardingFlow'

const router = useRouter()
const route = useRoute()
const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)

const interestItems = [
  { key: 'love', icon: 'favorite', labelKey: 'onboardingPage.interests.love' },
  { key: 'career', icon: 'work_outline', labelKey: 'onboardingPage.interests.career' },
  { key: 'money', icon: 'payments', labelKey: 'onboardingPage.interests.money' },
  { key: 'self', icon: 'self_improvement', labelKey: 'onboardingPage.interests.self' },
  { key: 'energy', icon: 'bolt', labelKey: 'onboardingPage.interests.energy' },
  { key: 'future', icon: 'travel_explore', labelKey: 'onboardingPage.interests.future' },
]

const selectedInterests = ref([])
const isNavigating = ref(false)
const continueFeedback = ref(false)
const selectedCount = computed(() => selectedInterests.value.length)
const progressWidth = computed(() => (selectedCount.value / 3) * 100)
const displayInterestItems = computed(() => {
  const selectedSet = new Set(selectedInterests.value)
  return interestItems.map((item) => ({
    ...item,
    isSelected: selectedSet.has(item.key),
  }))
})

const haptic = async (style = ImpactStyle.Light) => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style })
  } catch {
    // ignore haptics errors to keep UI responsive
  }
}

const toggleInterest = async (key) => {
  if (isNavigating.value) return
  const index = selectedInterests.value.indexOf(key)
  let action = 'select'
  if (index >= 0) {
    selectedInterests.value.splice(index, 1)
    action = 'deselect'
  } else {
    selectedInterests.value.push(key)
  }

  const payload = buildInterestSelectPayload({
    interestKey: key,
    action,
    selectedCount: selectedInterests.value.length,
  })
  void analytics.logEvent(ONBOARDING_EVENTS.interestSelect, payload)
  void haptic()
}

const persist = () => {
  const normalized = normalizeOnboardingInterests(selectedInterests.value)
  persistOnboardingPreferences(normalized)
}

const navigateFromOnboarding = async (resolvedRoute) => {
  if (resolvedRoute.navigationMode === 'replace') {
    await router.replace(resolvedRoute.target)
    return
  }
  await router.push(resolvedRoute.target)
}

const runExit = async (eventName) => {
  if (isNavigating.value) return
  isNavigating.value = true
  const exitContext = buildOnboardingExitContext({
    rawFrom: route.query?.from,
    selectedCount: selectedCount.value,
  })
  void analytics.logEvent(eventName, exitContext.payload)
  persist()
  try {
    await navigateFromOnboarding(exitContext)
  } finally {
    isNavigating.value = false
  }
}

const continueNext = async () => {
  if (isNavigating.value) return
  continueFeedback.value = true
  setTimeout(() => {
    continueFeedback.value = false
  }, 340)
  void haptic(ImpactStyle.Medium)
  await runExit(ONBOARDING_EVENTS.continueClick)
}

const skip = async () => {
  if (isNavigating.value) return
  void haptic()
  await runExit(ONBOARDING_EVENTS.skipClick)
}

onMounted(() => {
  const rawFrom = Array.isArray(route.query?.from) ? route.query?.from[0] : route.query?.from
  const hasFrom = String(rawFrom || '').trim().startsWith('/')
  void analytics.logEvent(ONBOARDING_EVENTS.onboardingView, {
    has_from: hasFrom,
    selected_count: selectedCount.value,
  })
})
</script>

<style scoped lang="scss">
.onboarding-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  color: #edf3ff;
  background: #06111a;
}

.onboarding-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(110% 62% at 50% 0%, rgba(28, 63, 96, 0.42) 0%, rgba(10, 19, 30, 0.16) 42%, rgba(4, 10, 16, 0) 70%),
    linear-gradient(180deg, #0a1824 0%, #07111a 42%, #040a10 100%);
  z-index: 0;
}

.onboarding-atmosphere {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.onboarding-atmosphere__glow,
.onboarding-atmosphere__mesh {
  position: absolute;
  border-radius: 999px;
}

.onboarding-atmosphere__glow--top {
  top: calc(-56px + env(safe-area-inset-top));
  left: 50%;
  width: min(86vw, 460px);
  height: 240px;
  background: radial-gradient(circle, rgba(93, 160, 224, 0.3) 0%, rgba(16, 29, 44, 0) 72%);
  transform: translateX(-50%);
  filter: blur(18px);
  opacity: 0.72;
}

.onboarding-atmosphere__glow--side {
  top: 28%;
  right: -120px;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(62, 115, 176, 0.18) 0%, rgba(7, 17, 26, 0) 74%);
  filter: blur(12px);
  opacity: 0.6;
}

.onboarding-atmosphere__mesh {
  inset: auto -24% 18% auto;
  width: 320px;
  height: 320px;
  background:
    linear-gradient(135deg, rgba(130, 184, 235, 0.08), rgba(130, 184, 235, 0)),
    radial-gradient(circle at 32% 32%, rgba(148, 210, 255, 0.16), rgba(148, 210, 255, 0) 54%);
  filter: blur(4px);
  opacity: 0.55;
}

.onboarding-content {
  position: relative;
  z-index: 1;
  width: min(100%, 520px);
  margin: 0 auto;
  padding: calc(90px + env(safe-area-inset-top)) 16px calc(env(safe-area-inset-bottom) + 2px);
  min-height: 100dvh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.onboarding-hero {
  display: grid;
  gap: 8px;
  padding: 4px 4px 2px;
}

.onboarding-hero__eyebrow {
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(191, 211, 236, 0.58);
}

.onboarding-title {
  margin: 0;
  font-size: 32px;
  line-height: 1.05;
  letter-spacing: -0.04em;
  font-weight: 600;
  color: #f5f9ff;
}

.onboarding-kicker {
  margin: 0;
  max-width: 320px;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(205, 219, 237, 0.68);
}

.onboarding-panel {
  position: relative;
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 22px;
  border: 1px solid rgba(167, 198, 227, 0.12);
  background:
    linear-gradient(180deg, rgba(17, 28, 41, 0.94), rgba(9, 16, 25, 0.96)),
    rgba(10, 16, 24, 0.92);
  box-shadow:
    0 18px 38px rgba(2, 8, 16, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  overflow: hidden;
}

.onboarding-panel::after {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(196, 221, 244, 0.15), rgba(255, 255, 255, 0));
  pointer-events: none;
}

.onboarding-panel__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.onboarding-panel__title {
  font-size: 15px;
  font-weight: 600;
  color: #f4f8ff;
}

.onboarding-panel__subtitle {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(200, 216, 235, 0.62);
}

.onboarding-count {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(162, 197, 227, 0.16);
  background: rgba(87, 125, 164, 0.12);
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(222, 235, 250, 0.78);
}

.onboarding-progress {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
}

.onboarding-progress__track {
  height: 6px;
  border-radius: 999px;
  background: rgba(139, 169, 199, 0.16);
  overflow: hidden;
}

.onboarding-progress__track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(110, 171, 229, 0.72), rgba(187, 220, 249, 0.94));
  box-shadow: 0 0 14px rgba(116, 178, 235, 0.24);
  transition: width 220ms ease;
}

.onboarding-progress__label {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(199, 217, 237, 0.58);
}

.onboarding-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.onboarding-interest {
  display: grid;
  gap: 18px;
  min-height: 112px;
  padding: 14px;
  border-radius: 20px;
  border: 1px solid rgba(164, 194, 221, 0.12);
  background:
    linear-gradient(180deg, rgba(13, 23, 34, 0.96), rgba(8, 14, 22, 0.98)),
    rgba(8, 14, 22, 0.96);
  box-shadow:
    0 14px 28px rgba(2, 7, 14, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
  text-align: left;
  color: rgba(223, 233, 246, 0.82);
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background 180ms ease,
    box-shadow 180ms ease,
    color 180ms ease;
}

.onboarding-interest:active {
  transform: translateY(1px) scale(0.995);
}

.onboarding-interest--active {
  border-color: rgba(128, 177, 221, 0.38);
  background:
    linear-gradient(180deg, rgba(20, 35, 50, 0.98), rgba(9, 17, 26, 0.98)),
    rgba(9, 17, 26, 0.98);
  box-shadow:
    0 16px 32px rgba(3, 10, 19, 0.42),
    0 0 0 1px rgba(137, 191, 239, 0.09) inset;
  color: #f5f9ff;
}

.onboarding-interest__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.onboarding-interest__icon-wrap,
.onboarding-interest__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
}

.onboarding-interest__icon-wrap {
  width: 38px;
  height: 38px;
  background: rgba(90, 126, 162, 0.12);
  color: rgba(224, 235, 247, 0.82);
}

.onboarding-interest__check {
  width: 22px;
  height: 22px;
  border: 1px solid rgba(167, 198, 227, 0.14);
  background: rgba(94, 129, 163, 0.08);
  color: transparent;
  transition: color 180ms ease, border-color 180ms ease, background 180ms ease;
}

.onboarding-interest--active .onboarding-interest__check {
  border-color: rgba(156, 206, 251, 0.34);
  background: rgba(84, 133, 181, 0.2);
  color: #eef7ff;
}

.onboarding-interest__label {
  font-size: 15px;
  line-height: 1.3;
  font-weight: 500;
}

.onboarding-actions-shell {
  margin-top: auto;
  display: grid;
  gap: 10px;
  padding-bottom: calc(env(safe-area-inset-bottom) + 8px);
}

.onboarding-continue {
  position: relative;
  overflow: hidden;
  min-height: 50px;
  border: 1px solid var(--btn-primary-border);
  border-radius: 18px;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-text);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  box-shadow:
    0 16px 30px rgba(19, 40, 61, 0.34),
    0 0 0 1px rgba(187, 225, 255, 0.08) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  transition: transform 180ms ease, filter 180ms ease, box-shadow 180ms ease;
}

.onboarding-continue::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0) 46%);
  pointer-events: none;
}

.onboarding-continue::after {
  content: '';
  position: absolute;
  inset: auto -12% -28% auto;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(180, 222, 255, 0.18) 0%, rgba(180, 222, 255, 0) 72%);
  pointer-events: none;
}

.onboarding-continue:active:not(:disabled),
.onboarding-continue--feedback {
  transform: translateY(1px);
  filter: saturate(1.04) brightness(1.02);
  box-shadow:
    0 12px 24px rgba(19, 40, 61, 0.28),
    0 0 0 1px rgba(187, 225, 255, 0.1) inset,
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.onboarding-skip-wrap {
  padding: 6px;
  border-radius: 16px;
  border: 1px solid rgba(106, 126, 164, 0.16);
  background:
    linear-gradient(180deg, rgba(10, 14, 22, 0.72), rgba(4, 7, 12, 0.82)),
    linear-gradient(90deg, rgba(83, 112, 170, 0.06), rgba(83, 112, 170, 0));
  box-shadow:
    inset 0 1px 0 rgba(186, 207, 247, 0.04),
    0 8px 20px rgba(0, 0, 0, 0.2);
}


.onboarding-interest:disabled,
.onboarding-continue:disabled {
  opacity: 0.72;
}

@media (max-width: 360px) {
  .onboarding-title {
    font-size: 28px;
  }

  .onboarding-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-height: 760px) {
  .onboarding-content {
    padding-top: calc(24px + env(safe-area-inset-top));
    gap: 12px;
  }

  .onboarding-title {
    font-size: 28px;
  }

  .onboarding-interest {
    min-height: 98px;
    gap: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .onboarding-progress__track span,
  .onboarding-interest,
  .onboarding-continue {
    transition: none;
  }
}
</style>
