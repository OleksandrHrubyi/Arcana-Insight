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
          :disabled="isNavigating || selectedCount === 0"
          @click="continueNext"
        >
          {{ tt('onboardingPage.continue') }}
        </button>
        <div class="onboarding-skip-wrap">
          <button type="button" class="arcana-btn arcana-btn--secondary" :disabled="isNavigating" @click="skip">
            {{ tt('onboardingPage.skip') }}
          </button>
        </div>

        <button type="button" class="arcana-btn arcana-btn--secondary onboarding-langrow" @click="onOpenLanguage">
          <q-icon name="language" size="18px" class="onboarding-langrow__icon" />
          <span class="onboarding-langrow__label">{{ tt('language') }}</span>
          <span class="onboarding-langrow__value">{{ languageLabel }}</span>
          <q-icon name="expand_more" size="18px" class="onboarding-langrow__chevron" />
        </button>
      </div>
    </div>

    <!-- Language bottom sheet (mirrors Settings) -->
    <q-dialog
      v-model="languageSheet"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="440"
      class="oracle-actions-dialog oracle-actions-dialog--opaque"
    >
      <section class="oracle-actions">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-title">{{ tt('language') }}</div>

        <div class="oracle-wheel">
          <div class="oracle-wheel__window" aria-hidden="true"></div>
          <div ref="languageWheelRef" class="oracle-wheel__scroll" @scroll.passive="onLanguageWheelScroll">
            <div class="oracle-wheel__spacer"></div>
            <button
              v-for="(opt, index) in languageOptions"
              :key="opt.value"
              type="button"
              class="oracle-wheel__item"
              :class="{ 'oracle-wheel__item--active': index === selectedLanguageIndex }"
              @click="onLanguageWheelItemTap(index)"
            >
              {{ opt.label }}
            </button>
            <div class="oracle-wheel__spacer"></div>
          </div>
        </div>

        <div class="oracle-actions__footer">
          <button type="button" class="arcana-btn arcana-btn--primary" @click="confirmLanguageWheel">
            {{ tt('common.apply') }}
          </button>
        </div>
      </section>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { t, currentLocale, setLocale } from 'src/i18n'
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

const MAX_INTERESTS = 3
const selectedInterests = ref([])
const isNavigating = ref(false)
const continueFeedback = ref(false)
const selectedCount = computed(() => selectedInterests.value.length)
const progressWidth = computed(() => (selectedCount.value / MAX_INTERESTS) * 100)
const displayInterestItems = computed(() => {
  const selectedSet = new Set(selectedInterests.value)
  return interestItems.map((item) => ({
    ...item,
    isSelected: selectedSet.has(item.key),
  }))
})

// Language picker — mirrors the Settings wheel sheet so first-launch users can
// switch language right on onboarding (the default is device-detected in i18n).
const WHEEL_ITEM_HEIGHT = 44
const languageSheet = ref(false)
const selectedLanguageIndex = ref(0)
const languageWheelRef = ref(null)
let lastLanguageHapticAt = 0

const languageOptions = computed(() => [
  { value: 'en', label: tt('languages.en') },
  { value: 'uk', label: tt('languages.uk') },
])
const languageLabel = computed(() => tt(`languages.${locale.value}`) || tt('languages.en'))

const scrollLanguageWheelTo = (index, smooth) => {
  const wheel = languageWheelRef.value
  if (!wheel) return
  wheel.scrollTo({ top: index * WHEEL_ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' })
}

const onOpenLanguage = () => {
  void haptic()
  selectedLanguageIndex.value = Math.max(
    0,
    languageOptions.value.findIndex((opt) => opt.value === locale.value),
  )
  languageSheet.value = true
  void nextTick(() => scrollLanguageWheelTo(selectedLanguageIndex.value, false))
}

const onLanguageWheelScroll = () => {
  const wheel = languageWheelRef.value
  if (!wheel) return
  const rawIndex = Math.round(wheel.scrollTop / WHEEL_ITEM_HEIGHT)
  const nextIndex = Math.min(languageOptions.value.length - 1, Math.max(0, rawIndex))
  if (nextIndex === selectedLanguageIndex.value) return
  selectedLanguageIndex.value = nextIndex
  const now = Date.now()
  if (now - lastLanguageHapticAt > 80) {
    void haptic()
    lastLanguageHapticAt = now
  }
}

const onLanguageWheelItemTap = (index) => {
  selectedLanguageIndex.value = index
  scrollLanguageWheelTo(index, true)
  void haptic()
}

const confirmLanguageWheel = () => {
  const opt = languageOptions.value[selectedLanguageIndex.value]
  if (!opt) return
  void haptic()
  setLocale(opt.value)
  languageSheet.value = false
}

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
    // Respect the "X/3" framing — block the 4th+ selection so the counter and the
    // progress bar can't overflow (was "6/3" at 200% fill). UX-8.
    if (selectedInterests.value.length >= MAX_INTERESTS) {
      void haptic()
      return
    }
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
  /* Extra bottom clearance so the last (language) button's bottom corners clear
     the iPhone's rounded screen corners instead of being clipped by them. */
  padding-bottom: calc(env(safe-area-inset-bottom) + 26px);
}

/* .arcana-btn has width:100% + padding but no box-sizing, and there is no global
   border-box reset — so on a container flush with the screen padding (here) the
   button overflowed and clipped left/right on device. Contain it. */
.onboarding-actions-shell .arcana-btn {
  box-sizing: border-box;
  max-width: 100%;
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

/* Language picker — same button shape as Continue/Skip; opens the wheel sheet. */
.onboarding-langrow__icon {
  color: rgba(180, 203, 229, 0.78);
}

.onboarding-langrow__label {
  color: rgba(199, 217, 237, 0.62);
  font-weight: 500;
}

.onboarding-langrow__value {
  font-weight: 600;
  color: #eef5ff;
}

.onboarding-langrow__chevron {
  margin-left: -2px;
  color: rgba(168, 191, 217, 0.6);
}

/* Bottom-sheet wheel — mirrored from SettingsComponent so the picker matches the app. */
/*noinspection CssUnusedSymbol*/
:deep(.oracle-actions-dialog .q-dialog__backdrop) {
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

/*noinspection CssUnusedSymbol*/
:deep(.oracle-actions-dialog .q-dialog__inner) {
  padding: 0;
  align-items: flex-end;
}

:global(.oracle-actions-dialog--opaque .oracle-actions) {
  background: #050d15;
}

.oracle-actions {
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  border-radius: 22px 22px 0 0;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 24px);
  box-shadow: 0 -16px 46px rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
  pointer-events: auto;
}

.sheet-handle {
  width: 36px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  margin: 0 auto 10px;
}

.sheet-title {
  text-align: center;
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.74);
  margin-bottom: 6px;
}

.oracle-wheel {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  touch-action: pan-y;
}

.oracle-wheel::before,
.oracle-wheel::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 40px;
  z-index: 2;
  pointer-events: none;
}

.oracle-wheel::before {
  top: 0;
}

.oracle-wheel::after {
  bottom: 0;
}

.oracle-wheel__window {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 50%;
  height: 44px;
  transform: translateY(-50%);
  border-radius: 9px;
  border: 1px solid rgba(138, 161, 204, 0.16);
  background: black;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.46),
    inset 0 1px 0 rgba(198, 218, 255, 0.13),
    inset 0 -1px 0 rgba(68, 96, 141, 0.13),
    inset 0 0 14px rgba(56, 82, 124, 0.1);
  backdrop-filter: blur(6px) saturate(118%);
  -webkit-backdrop-filter: blur(6px) saturate(118%);
  z-index: 1;
  pointer-events: none;
}

.oracle-wheel__scroll {
  position: relative;
  height: 152px;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y mandatory;
  z-index: 3;
  scrollbar-width: none;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
}

.oracle-wheel__spacer {
  height: 54px;
}

.oracle-wheel__item {
  display: block;
  width: 100%;
  min-height: 44px;
  height: 44px;
  padding: 0 10px;
  margin: 0;
  border: 0;
  background: transparent;
  color: rgba(231, 225, 211, 0.7);
  font-size: 15px;
  line-height: 1.2;
  scroll-snap-align: center;
  transition: color 140ms ease, transform 140ms ease;
}

.oracle-wheel__item--active {
  color: rgba(244, 238, 227, 0.97);
  transform: scale(1.01);
}

.oracle-wheel__scroll::-webkit-scrollbar {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .onboarding-progress__track span,
  .onboarding-interest,
  .onboarding-continue {
    transition: none;
  }
}
</style>
