<template>
  <q-page class="onboarding-page">
    <div class="onboarding-bg" aria-hidden="true"></div>
    <div class="onboarding-aurora" aria-hidden="true">
      <span class="onboarding-aurora__mist"></span>
      <span class="onboarding-aurora__halo"></span>
      <span class="onboarding-aurora__pulse"></span>
      <span class="onboarding-aurora__ribbon onboarding-aurora__ribbon--one"></span>
      <span class="onboarding-aurora__ribbon onboarding-aurora__ribbon--two"></span>
      <span class="onboarding-aurora__star onboarding-aurora__star--one"></span>
      <span class="onboarding-aurora__star onboarding-aurora__star--two"></span>
      <span class="onboarding-aurora__star onboarding-aurora__star--three"></span>
      <span class="onboarding-aurora__star onboarding-aurora__star--four"></span>
      <span class="onboarding-aurora__star onboarding-aurora__star--five"></span>
    </div>

    <div class="onboarding-content">
      <header class="onboarding-hero">
        <div class="onboarding-title">{{ tt('onboardingPage.title') }}</div>
        <div class="onboarding-kicker">{{ tt('onboardingPage.subtitle') }}</div>
        <div class="onboarding-hero__line"></div>
      </header>

      <section class="onboarding-card onboarding-card--interests">
        <div class="onboarding-card__row">
          <div class="onboarding-card__title">{{ tt('onboardingPage.sectionInterests') }}</div>
          <div v-if="selectedCount > 0" class="onboarding-card__badge">{{ selectedCount }}/3</div>
        </div>
        <div class="onboarding-card__sub">{{ tt('onboardingPage.sectionInterestsHint') }}</div>
        <div class="onboarding-tags">
          <button
            v-for="item in displayInterestItems"
            :key="item.key"
            type="button"
            class="onboarding-tag"
            :class="{ 'onboarding-tag--active': item.isSelected }"
            :style="{ '--chip-delay': `${item.displayIndex * 48}ms` }"
            @click="toggleInterest(item.key)"
          >
            <q-icon :name="item.icon" size="14px" class="onboarding-tag__icon" />
            <span>{{ tt(item.labelKey) }}</span>
          </button>
        </div>
        <div v-if="selectedCount > 0" class="onboarding-card__micro">{{ tt('onboardingPage.selectionHintActive') }}</div>
      </section>

      <div class="onboarding-actions-shell">
        <div class="onboarding-actions">
          <button
            type="button"
            class="onboarding-continue"
            :class="{ 'onboarding-continue--feedback': continueFeedback }"
            :disabled="isNavigating"
            @click="continueNext"
          >
            {{ tt('onboardingPage.continue') }}
          </button>
          <button type="button" class="onboarding-skip" :disabled="isNavigating" @click="skip">
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
const displayInterestItems = computed(() => {
  const selectedSet = new Set(selectedInterests.value)
  const selected = []
  const unselected = []

  for (const item of interestItems) {
    const next = { ...item, isSelected: selectedSet.has(item.key) }
    if (next.isSelected) selected.push(next)
    else unselected.push(next)
  }

  return [...selected, ...unselected].map((item, index) => ({
    ...item,
    displayIndex: index,
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

.onboarding-aurora {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.onboarding-aurora__halo,
.onboarding-aurora__pulse,
.onboarding-aurora__ribbon {
  position: absolute;
  left: 50%;
  border-radius: 999px;
  transform: translateX(-50%);
}

.onboarding-aurora__mist {
  position: absolute;
  inset: -8% -14% auto;
  height: 280px;
  background:
    radial-gradient(60% 50% at 50% 0%, rgba(152, 217, 255, 0.2) 0%, rgba(17, 25, 42, 0) 72%),
    radial-gradient(45% 40% at 18% 30%, rgba(142, 104, 232, 0.16) 0%, rgba(18, 24, 42, 0) 76%),
    radial-gradient(40% 38% at 82% 28%, rgba(122, 175, 255, 0.14) 0%, rgba(18, 24, 42, 0) 74%);
  filter: blur(14px);
  opacity: 0.78;
  animation: onboardingMistFloat 8.4s ease-in-out infinite;
}

.onboarding-aurora__halo {
  top: calc(12px + env(safe-area-inset-top));
  width: min(90vw, 470px);
  height: 212px;
  background: radial-gradient(circle at 50% 0%, rgba(144, 213, 255, 0.26), rgba(12, 19, 34, 0));
  filter: blur(10px);
  animation: onboardingHaloShift 6.2s ease-in-out infinite;
}

.onboarding-aurora__pulse {
  top: calc(54px + env(safe-area-inset-top));
  width: min(68vw, 340px);
  height: 132px;
  background: radial-gradient(circle, rgba(151, 215, 255, 0.18), rgba(11, 16, 29, 0));
  animation: onboardingPulse 4.6s ease-in-out infinite;
}

.onboarding-aurora__ribbon {
  top: calc(78px + env(safe-area-inset-top));
  width: min(78vw, 420px);
  height: 92px;
  opacity: 0.56;
  mix-blend-mode: screen;
  filter: blur(7px);
}

.onboarding-aurora__ribbon--one {
  background: linear-gradient(90deg, rgba(86, 143, 235, 0), rgba(124, 190, 255, 0.46), rgba(86, 143, 235, 0));
  transform: translateX(-50%) rotate(-8deg);
  animation: onboardingRibbonOne 5.4s ease-in-out infinite;
}

.onboarding-aurora__ribbon--two {
  top: calc(92px + env(safe-area-inset-top));
  width: min(64vw, 330px);
  background: linear-gradient(90deg, rgba(120, 96, 235, 0), rgba(162, 173, 255, 0.36), rgba(120, 96, 235, 0));
  transform: translateX(-50%) rotate(10deg);
  animation: onboardingRibbonTwo 6.1s ease-in-out infinite;
}

.onboarding-aurora__star {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(201, 236, 255, 0.9);
  box-shadow: 0 0 10px rgba(193, 231, 255, 0.68);
  animation: onboardingTwinkle 3.2s ease-in-out infinite, onboardingStarDrift 8.6s ease-in-out infinite;
}

.onboarding-aurora__star--one {
  top: 114px;
  left: 18%;
  animation-duration: 2.9s, 8.2s;
}

.onboarding-aurora__star--two {
  top: 86px;
  right: 14%;
  animation-duration: 3.4s, 9.1s;
}

.onboarding-aurora__star--three {
  top: 160px;
  right: 28%;
  animation-duration: 3.1s, 8.8s;
}

.onboarding-aurora__star--four {
  top: 138px;
  left: 32%;
  width: 2px;
  height: 2px;
  opacity: 0.78;
  animation-duration: 2.6s, 7.4s;
}

.onboarding-aurora__star--five {
  top: 104px;
  right: 38%;
  width: 2px;
  height: 2px;
  opacity: 0.82;
  animation-duration: 3.8s, 10.2s;
}

.onboarding-content {
  position: relative;
  z-index: 1;
  padding: calc(96px + env(safe-area-inset-top)) 16px 0;
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 10px;
  min-height: calc(100vh - env(safe-area-inset-top));
  align-content: start;
}

.onboarding-hero {
  text-align: center;
  display: grid;
  gap: 8px;
  margin-bottom: 18px;
}

.onboarding-title {
  font-size: 21px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-shadow: 0 8px 24px rgba(134, 204, 255, 0.28);
}

.onboarding-kicker {
  font-size: 10px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.onboarding-hero__line {
  width: 88px;
  height: 2px;
  margin: 0 auto;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(131, 191, 255, 0), rgba(131, 191, 255, 0.9), rgba(131, 191, 255, 0));
}

.onboarding-card {
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(160deg, rgba(14, 20, 32, 0.92), rgba(6, 10, 18, 0.98)),
    rgba(11, 15, 24, 0.84);
  box-shadow:
    0 14px 34px rgba(2, 6, 12, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  display: grid;
  gap: 10px;
}

.onboarding-card--next {
  border-color: rgba(166, 217, 255, 0.28);
}

.onboarding-card--interests {
  position: relative;
  overflow: visible;
  border-color: rgba(176, 224, 255, 0.22);
}

.onboarding-card--interests::before {
  content: none;
}

.onboarding-card--interests::after {
  content: none;
}

.onboarding-card--note {
  border-color: rgba(161, 208, 246, 0.2);
}

.onboarding-card--note .onboarding-card__text {
  color: rgba(214, 225, 242, 0.76);
}

.onboarding-card__title {
  font-size: 10px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.onboarding-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.onboarding-card__meta {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.74);
}

.onboarding-card__progress {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
}

.onboarding-card__progress-track {
  height: 5px;
  border-radius: 999px;
  background: rgba(169, 210, 245, 0.22);
  overflow: hidden;
}

.onboarding-card__progress-track span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(132, 205, 255, 0.72), rgba(202, 236, 255, 0.96));
  box-shadow: 0 0 12px rgba(136, 209, 255, 0.38);
  transition: width 260ms ease;
}

.onboarding-card__progress-text {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(219, 235, 249, 0.78);
}

.onboarding-card__text {
  font-size: 13px;
  line-height: 1.45;
  color: rgba(214, 225, 242, 0.8);
}

.onboarding-card__sub {
  font-size: 12px;
  color: rgba(214, 225, 242, 0.48);
  letter-spacing: 0.02em;
  margin-top: -4px;
}

.onboarding-card__badge {
  font-size: 11px;
  letter-spacing: 0.08em;
  color: rgba(166, 218, 255, 0.9);
  background: rgba(100, 170, 255, 0.12);
  border: 1px solid rgba(166, 218, 255, 0.22);
  border-radius: 999px;
  padding: 2px 8px;
}

.onboarding-card__micro {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: rgba(214, 225, 242, 0.64);
}

.onboarding-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.onboarding-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(180deg, rgba(15, 22, 36, 0.84), rgba(8, 12, 21, 0.8));
  font-size: 12px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.7);
  transform: scale(1);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, color 180ms ease;
  opacity: 0;
  animation: onboardingChipFade 340ms ease forwards;
  animation-delay: var(--chip-delay, 0ms);
}

.onboarding-tag__icon {
  opacity: 0.82;
}

.onboarding-tag--active {
  border-color: rgba(166, 218, 255, 0.78);
  color: #f4f9ff;
  background: linear-gradient(180deg, rgba(43, 67, 109, 0.75), rgba(20, 29, 46, 0.8));
  box-shadow:
    0 0 0 1px rgba(198, 234, 255, 0.2) inset,
    0 10px 20px rgba(29, 62, 104, 0.38),
    0 0 14px rgba(166, 218, 255, 0.28);
  transform: scale(1.03);
}

.onboarding-tag--active .onboarding-tag__icon {
  opacity: 1;
}

.onboarding-actions-shell {
  margin-top: auto;
  position: sticky;
  bottom: 0;
  z-index: 3;
  padding: 10px 0 calc(10px + env(safe-area-inset-bottom));
  background:
    linear-gradient(180deg, rgba(3, 8, 15, 0), rgba(3, 8, 15, 0.92) 42%, rgba(3, 8, 15, 0.98) 100%);
  backdrop-filter: blur(8px);
}

.onboarding-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
}

.onboarding-skip {
  border: none;
  background: none;
  padding: 10px 14px;
  color: rgba(214, 225, 242, 0.42);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  text-align: center;
  transition: color 180ms ease;
}

.onboarding-skip:not(:disabled):active {
  color: rgba(214, 225, 242, 0.7);
}

.onboarding-continue {
  position: relative;
  overflow: visible;
  border-radius: 12px;
  border: 1px solid rgba(156, 206, 255, 0.56);
  padding: 12px 14px;
  background: linear-gradient(160deg, rgba(58, 90, 145, 0.98), rgba(25, 43, 74, 0.98) 56%, rgba(16, 29, 51, 0.98));
  color: #f2f8ff;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  box-shadow:
    0 14px 28px rgba(17, 38, 72, 0.58),
    0 0 0 1px rgba(173, 224, 255, 0.14) inset;
  transition: transform 170ms ease, box-shadow 220ms ease, filter 220ms ease;
  will-change: transform, box-shadow, filter;
  animation: onboardingCtaBreath 1.9s ease-in-out infinite;
}

.onboarding-continue::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(236, 247, 255, 0.26), rgba(236, 247, 255, 0) 58%);
  opacity: 0.54;
  pointer-events: none;
  animation: onboardingCtaInnerGlow 1.9s ease-in-out infinite;
}

.onboarding-continue::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 14px;
  border: 1px solid rgba(174, 221, 255, 0.5);
  opacity: 0;
  transform: scale(0.96);
  animation: onboardingCtaRing 1.9s ease-in-out infinite;
  pointer-events: none;
}

.onboarding-continue--feedback {
  transform: translateY(-2px) scale(1.018);
  filter: saturate(1.07);
  box-shadow:
    0 18px 36px rgba(22, 51, 95, 0.68),
    0 0 0 1px rgba(188, 230, 255, 0.2) inset,
    0 0 22px rgba(141, 203, 255, 0.34);
  animation: onboardingCtaPress 320ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.onboarding-continue--feedback::before {
  animation: onboardingCtaFlash 320ms ease-out;
}

.onboarding-continue--feedback::after {
  animation: onboardingCtaRingTap 320ms ease-out;
}

.onboarding-continue:active:not(:disabled) {
  transform: translateY(-1px) scale(1.01);
  filter: saturate(1.04);
}

.onboarding-skip:disabled,
.onboarding-continue:disabled,
.onboarding-tag:disabled {
  opacity: 0.7;
}

@media (max-height: 760px) {
  .onboarding-content {
    padding-top: calc(40px + env(safe-area-inset-top));
    gap: 8px;
  }

  .onboarding-title {
    font-size: 18px;
  }

  .onboarding-hero {
    margin-bottom: 12px;
  }

  .onboarding-card {
    padding: 11px;
    gap: 8px;
  }

  .onboarding-card--note {
    display: none;
  }

  .onboarding-tag {
    padding: 5px 9px;
    font-size: 12px;
  }

  .onboarding-actions-copy {
    margin-bottom: 6px;
  }

  .onboarding-actions-copy__text {
    font-size: 10px;
  }

  .onboarding-actions-shell {
    padding-top: 6px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
  }
}

/* Staggered entry: hero -> interests -> actions */
.onboarding-hero,
.onboarding-card--interests,
.onboarding-actions-shell {
  opacity: 0;
  transform: translateY(10px) scale(0.985);
  animation: onboardingEnter 360ms cubic-bezier(0.2, 0.7, 0.2, 1) forwards;
}

.onboarding-hero {
  animation-delay: 0ms;
}

.onboarding-card--interests {
  animation-delay: 120ms;
}

.onboarding-actions-shell {
  animation-delay: 240ms;
}

@media (prefers-reduced-motion: reduce) {
  .onboarding-hero,
  .onboarding-card--interests,
  .onboarding-actions-shell {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .onboarding-aurora__pulse,
  .onboarding-aurora__mist,
  .onboarding-aurora__halo,
  .onboarding-aurora__ribbon,
  .onboarding-aurora__star,
  .onboarding-continue,
  .onboarding-continue::before,
  .onboarding-continue::after,
  .onboarding-tag {
    animation: none;
  }

  .onboarding-tag {
    opacity: 1;
  }
}

@keyframes onboardingPulse {
  0%, 100% {
    opacity: 0.55;
    transform: translateX(-50%) scale(0.96);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.05);
  }
}

@keyframes onboardingHaloShift {
  0%, 100% {
    opacity: 0.82;
    transform: translateX(-50%) scale(0.98);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.04);
  }
}

@keyframes onboardingMistFloat {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.72;
  }
  50% {
    transform: translateY(-6px) scale(1.03);
    opacity: 0.9;
  }
}

@keyframes onboardingRibbonOne {
  0%, 100% {
    opacity: 0.5;
    transform: translateX(-50%) rotate(-8deg) scaleX(0.96);
  }
  50% {
    opacity: 0.78;
    transform: translateX(-50%) rotate(-5deg) scaleX(1.04);
  }
}

@keyframes onboardingRibbonTwo {
  0%, 100% {
    opacity: 0.44;
    transform: translateX(-50%) rotate(10deg) scaleX(0.94);
  }
  50% {
    opacity: 0.66;
    transform: translateX(-50%) rotate(13deg) scaleX(1.05);
  }
}

@keyframes onboardingTwinkle {
  0%, 100% {
    opacity: 0.3;
    transform: scale(0.9);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes onboardingStarDrift {
  0%, 100% {
    margin-top: 0;
  }
  50% {
    margin-top: -4px;
  }
}

@keyframes onboardingCtaBreath {
  0%,
  100% {
    filter: saturate(1) brightness(1);
    box-shadow:
      0 14px 28px rgba(17, 38, 72, 0.58),
      0 0 0 1px rgba(173, 224, 255, 0.14) inset;
  }
  50% {
    filter: saturate(1.06) brightness(1.08);
    box-shadow:
      0 18px 34px rgba(22, 47, 86, 0.72),
      0 0 0 1px rgba(188, 230, 255, 0.18) inset,
      0 0 18px rgba(145, 206, 255, 0.3);
  }
}

@keyframes onboardingCtaInnerGlow {
  0%,
  100% {
    opacity: 0.42;
  }
  50% {
    opacity: 0.72;
  }
}

@keyframes onboardingCtaRing {
  0% {
    opacity: 0;
    transform: scale(0.96);
  }
  38% {
    opacity: 0.52;
  }
  100% {
    opacity: 0;
    transform: scale(1.08);
  }
}

@keyframes onboardingCtaRingTap {
  0% {
    opacity: 0.28;
    transform: scale(0.94);
  }
  45% {
    opacity: 0.78;
    transform: scale(1.07);
  }
  100% {
    opacity: 0.15;
    transform: scale(1.12);
  }
}

@keyframes onboardingCtaPress {
  0% {
    transform: translateY(0) scale(1);
  }
  36% {
    transform: translateY(-2px) scale(1.026);
  }
  100% {
    transform: translateY(-1px) scale(1.01);
  }
}

@keyframes onboardingCtaFlash {
  0% {
    opacity: 0.2;
  }
  45% {
    opacity: 0.65;
  }
  100% {
    opacity: 0.28;
  }
}

@keyframes onboardingEnter {
  0% {
    opacity: 0;
    transform: translateY(10px) scale(0.985);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes onboardingChipFade {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
