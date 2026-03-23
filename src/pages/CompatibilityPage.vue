<template>
  <q-page class="compat-page">
    <div class="compat-bg" aria-hidden="true"></div>

    <div class="compat-content">
      <header class="compat-hero compat-hero--with-back">
        <button type="button" class="compat-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="compat-hero__text">
          <div class="compat-title">{{ tt('compatibilityPage.title') }}</div>
          <div class="compat-kicker">{{ tt('compatibilityPage.subtitle') }}</div>
        </div>
      </header>

      <section v-if="hasPremiumAccess" class="compat-stack">
        <div class="compat-panel compat-panel--pair">
          <div class="compat-panel__title">
            {{ tt('compatibilityPage.sections.match') }}
          </div>

          <div class="compat-pick-group">
            <button type="button" class="compat-pick" @click="openPicker('a')">
              <div class="compat-pick__content">
                <span class="compat-pick__label">{{ tt('compatibilityPage.you') }}</span>
                <span class="compat-pick__value">{{ selectedLabelA }}</span>
              </div>
              <q-icon name="chevron_right" size="18px" class="compat-chevron" />
            </button>

            <button type="button" class="compat-pick" @click="openPicker('b')">
              <div class="compat-pick__content">
                <span class="compat-pick__label">{{ tt('compatibilityPage.partner') }}</span>
                <span class="compat-pick__value">{{ selectedLabelB }}</span>
              </div>
              <q-icon name="chevron_right" size="18px" class="compat-chevron" />
            </button>
          </div>

          <button type="button" class="compat-cta" :class="{ 'compat-cta--active': showResult }" @click="showCompatibility">
            <q-icon :name="showResult ? 'refresh' : 'auto_awesome'" size="18px" class="compat-cta__icon" />
            <span>{{ showResult ? tt('compatibilityPage.ctaUpdate') : tt('compatibilityPage.cta') }}</span>
          </button>
        </div>

        <div class="compat-panel compat-panel--result">
          <div class="compat-panel__title">
            {{ tt('compatibilityPage.sections.preview') }}
          </div>
          <div class="compat-preview" :class="{ 'compat-preview--active': showResult }">
            <div v-if="!showResult" class="compat-empty">
              <div class="compat-empty__icon">✦</div>
              <div class="compat-empty__title">{{ tt('compatibilityPage.previewTitle') }}</div>
              <div class="compat-empty__text">{{ tt('compatibilityPage.previewText') }}</div>
            </div>

            <div v-if="showResult" class="compat-report compat-report--animate" :style="resultStyle">
              <div class="compat-result-header">
                <div class="compat-result-header__title">
                  {{ formatText(tt('compatibilityPage.resultTitle'), { a: selectedLabelA, b: selectedLabelB }) }}
                </div>
                <div class="compat-result-header__subtitle">
                  {{ tt('compatibilityPage.resultSub') }}
                </div>
              </div>

              <div class="compat-report__header">
                <div class="compat-report__score">
                  <div class="compat-score">
                    <span class="compat-score__value">{{ displayScore }}</span>
                    <span class="compat-score__unit">%</span>
                  </div>
                  <div class="compat-score__meta">{{ confidenceLabel }}</div>
                </div>
                <div class="compat-report__meta">
                  <div class="compat-report__summary">{{ summaryText }}</div>
                  <div class="compat-report__line">{{ elementLine }}</div>
                </div>
              </div>

              <div class="compat-meter">
                <span class="compat-meter__fill" :style="{ width: `${displayScore}%` }"></span>
              </div>

              <div class="compat-description">
                <div class="compat-description__text">{{ resultText }}</div>
              </div>

              <div class="compat-tags">
                <span class="compat-tag compat-tag--element">{{ elementA }}</span>
                <span class="compat-tag compat-tag--element">{{ elementB }}</span>
                <span class="compat-tag compat-tag--modality">{{ modalityLine }}</span>
              </div>

              <div class="compat-insight">
                <div class="compat-insight__label">{{ tt('compatibilityPage.insightLabel') }}</div>
                <div class="compat-insight__text">{{ insightText }}</div>
              </div>

              <div class="compat-metrics-section">
                <div class="compat-metrics-section__title">{{ tt('compatibilityPage.spheres.title') }}</div>
                <div class="compat-metrics">
                  <div class="compat-metric" v-for="item in sphereItems" :key="item.key">
                    <div class="compat-metric__header">
                      <div class="compat-metric__label">
                        <q-icon :name="item.icon" size="14px" class="compat-metric__icon" />
                        <span>{{ tt(item.labelKey) }}</span>
                      </div>
                      <div class="compat-metric__value">{{ item.value }}%</div>
                    </div>
                    <div class="compat-metric__bar">
                      <span class="compat-metric__fill" :style="{ width: `${item.value}%` }"></span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="compat-balance">
                <div class="compat-balance__label">{{ tt('compatibilityPage.balanceLabel') }}</div>
                <div class="compat-balance__rows">
                  <div class="compat-balance__row">
                    <span class="compat-balance__name">{{ elementA }}</span>
                    <div class="compat-balance__bar">
                      <span class="compat-balance__fill" :style="{ width: `${balanceA}%` }"></span>
                    </div>
                    <span class="compat-balance__percent">{{ balanceA }}%</span>
                  </div>
                  <div class="compat-balance__row">
                    <span class="compat-balance__name">{{ elementB }}</span>
                    <div class="compat-balance__bar">
                      <span class="compat-balance__fill" :style="{ width: `${balanceB}%` }"></span>
                    </div>
                    <span class="compat-balance__percent">{{ balanceB }}%</span>
                  </div>
                </div>
              </div>

              <button type="button" class="compat-details-link" @click="onDetailsOpen">
                <q-icon name="info" size="16px" class="compat-details-link__icon" />
                <span>{{ tt('compatibilityPage.detailsCta') }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section v-else class="compat-lock">
        <div class="compat-lock__badge">{{ tt('premiumAccess.badge') }}</div>
        <div class="compat-lock__title">{{ tt('premiumAccess.compatibility.title') }}</div>
        <p class="compat-lock__text">{{ tt('premiumAccess.compatibility.text') }}</p>
        <div class="compat-lock__preview">
          <div class="compat-lock__preview-line">{{ tt('compatibilityPage.spheres.emotion') }} · 82%</div>
          <div class="compat-lock__preview-line">{{ tt('compatibilityPage.spheres.communication') }} · 76%</div>
          <div class="compat-lock__preview-line">{{ tt('compatibilityPage.spheres.stability') }} · 71%</div>
          <div class="compat-lock__meter" aria-hidden="true">
            <span class="compat-lock__meter-fill"></span>
          </div>
        </div>
        <button type="button" class="compat-lock__cta" @click="goPremium">
          <q-icon name="workspace_premium" size="16px" />
          <span>{{ tt('premiumAccess.cta') }}</span>
        </button>
      </section>
    </div>

    <q-dialog
      v-model="sheetOpen"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="440"
      class="oracle-actions-dialog"
    >
      <section class="oracle-actions">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-title">{{ tt('compatibilityPage.pickSign') }}</div>

        <div class="oracle-wheel">
          <div class="oracle-wheel__window" aria-hidden="true"></div>
          <div ref="wheelRef" class="oracle-wheel__scroll" @scroll.passive="onWheelScroll">
            <div class="oracle-wheel__spacer"></div>
            <button
              v-for="(label, index) in signLabels"
              :key="label"
              type="button"
              class="oracle-wheel__item"
              :class="{ 'oracle-wheel__item--active': index === selectedWheelIndex }"
              @click="onWheelItemTap(index)"
            >
              {{ label }}
            </button>
            <div class="oracle-wheel__spacer"></div>
          </div>
        </div>

        <div class="oracle-actions__footer">
          <button type="button" class="oracle-actions__ok" @click="confirmWheel">
            {{ tt('tarotOracle.choices.ok') }}
          </button>
        </div>
      </section>
    </q-dialog>

    <q-dialog
      v-model="detailsOpen"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="440"
      class="oracle-actions-dialog oracle-actions-dialog--details"
    >
      <section class="oracle-actions">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-title">{{ tt('compatibilityPage.detailsTitle') }}</div>

        <div class="details-tabs">
          <button
            v-for="tab in detailsTabs"
            :key="tab.id"
            type="button"
            class="details-tab"
            :class="{ 'details-tab--active': detailsTab === tab.id }"
            @click="onDetailsTabClick(tab.id)"
          >
            {{ tt(tab.labelKey) }}
          </button>
        </div>

        <div class="details-body">
          <div v-if="detailsTab === 'basic'">
            <div class="details-card">
              <div class="details-row">
                <span class="details-label">{{ tt('compatibilityPage.details.signs') }}</span>
                <span class="details-value">{{ selectedLabelA }} + {{ selectedLabelB }}</span>
              </div>
            <div class="details-row">
              <span class="details-label">{{ tt('compatibilityPage.details.elements') }}</span>
              <span class="details-value">{{ elementA }} + {{ elementB }}</span>
            </div>
            <div class="details-row">
              <span class="details-label">{{ tt('compatibilityPage.details.modalities') }}</span>
              <span class="details-value">{{ modalityLine }}</span>
            </div>
          </div>

          <div class="details-card">
            <div class="details-row">
              <span class="details-label">{{ tt('compatibilityPage.details.elementScore') }}</span>
              <span class="details-value">{{ elementScore }}%</span>
            </div>
            <div class="details-row">
              <span class="details-label">{{ tt('compatibilityPage.details.modalityScore') }}</span>
              <span class="details-value">{{ modalityScore }}%</span>
            </div>
            <div class="details-row details-row--final">
              <span class="details-label">{{ tt('compatibilityPage.details.final') }}</span>
              <span class="details-value">{{ compatibilityScore }}%</span>
            </div>
          </div>

          <div class="details-notes">
            <div class="details-notes__title">{{ tt('compatibilityPage.details.formula') }}</div>
            <ul class="details-notes__list">
              <li>{{ tt('compatibilityPage.details.formulaText') }}</li>
              <li>{{ tt('compatibilityPage.details.modalityNote') }}</li>
            </ul>
          </div>
          </div>

          <div v-else-if="detailsTab === 'extended'" class="details-extended">
            <div class="details-card">
              <div class="details-row details-row--stack">
                <span class="details-label">{{ tt('compatibilityPage.details.elementPair') }}</span>
                <span class="details-value">{{ elementA }} + {{ elementB }}</span>
              </div>
            <div class="details-explain">{{ resultText }}</div>
          </div>

          <div class="details-card">
            <div class="details-row details-row--stack">
              <span class="details-label">{{ tt('compatibilityPage.details.modalityPair') }}</span>
              <span class="details-value">{{ modalityLabelA }} + {{ modalityLabelB }}</span>
            </div>
            <div class="details-explain">{{ modalityExplain }}</div>
          </div>

            <div class="details-card">
              <div class="details-row details-row--stack">
                <span class="details-label">{{ tt('compatibilityPage.details.resultSummary') }}</span>
                <span class="details-value">{{ compatibilityScore }}%</span>
              </div>
              <div class="details-explain">
                {{ tt('compatibilityPage.details.resultExplain') }}
              </div>
            </div>
          </div>

        </div>

        <div class="oracle-actions__footer">
          <button type="button" class="oracle-actions__ok" @click="onDetailsClose">
            {{ tt('tarotOracle.choices.ok') }}
          </button>
        </div>
      </section>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, ref, nextTick, watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { usePremiumAccess } from 'src/stores/premiumAccess'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const router = useRouter()
const { hasPremiumAccess } = usePremiumAccess()

const signs = [
  { key: 'aries', element: 'fire', modality: 'cardinal' },
  { key: 'taurus', element: 'earth', modality: 'fixed' },
  { key: 'gemini', element: 'air', modality: 'mutable' },
  { key: 'cancer', element: 'water', modality: 'cardinal' },
  { key: 'leo', element: 'fire', modality: 'fixed' },
  { key: 'virgo', element: 'earth', modality: 'mutable' },
  { key: 'libra', element: 'air', modality: 'cardinal' },
  { key: 'scorpio', element: 'water', modality: 'fixed' },
  { key: 'sagittarius', element: 'fire', modality: 'mutable' },
  { key: 'capricorn', element: 'earth', modality: 'cardinal' },
  { key: 'aquarius', element: 'air', modality: 'fixed' },
  { key: 'pisces', element: 'water', modality: 'mutable' },
]

const signLabels = computed(() => signs.map((sign) => tt(`zodiac.${sign.key}`)))

const selectedIndexA = ref(0)
const selectedIndexB = ref(8)
const selectedWheelIndex = ref(0)
const activePicker = ref('a')
const lastHapticAt = ref(0)
const sheetOpen = ref(false)
const wheelRef = ref(null)
const showResult = ref(false)
const detailsOpen = ref(false)
const detailsTab = ref('basic')
const displayScore = ref(0)
let scoreAnimFrame = 0
const detailsTabs = [
  { id: 'basic', labelKey: 'compatibilityPage.details.tabs.basic' },
  { id: 'extended', labelKey: 'compatibilityPage.details.tabs.extended' },
]

const selectedLabelA = computed(() => signLabels.value[selectedIndexA.value] || '')
const selectedLabelB = computed(() => signLabels.value[selectedIndexB.value] || '')
const elementAKey = computed(() => signs[selectedIndexA.value]?.element || 'fire')
const elementBKey = computed(() => signs[selectedIndexB.value]?.element || 'air')
const modalityAKey = computed(() => signs[selectedIndexA.value]?.modality || 'cardinal')
const modalityBKey = computed(() => signs[selectedIndexB.value]?.modality || 'fixed')

const elementA = computed(() => tt(`compatibilityPage.elements.${elementAKey.value}`))
const elementB = computed(() => tt(`compatibilityPage.elements.${elementBKey.value}`))
const modalityLine = computed(() => tt(`compatibilityPage.modalities.${modalityAKey.value}`))
const modalityLabelA = computed(() => tt(`compatibilityPage.modalities.${modalityAKey.value}`))
const modalityLabelB = computed(() => tt(`compatibilityPage.modalities.${modalityBKey.value}`))

const elementLine = computed(() => formatText(tt('compatibilityPage.elementLine'), { a: elementA.value, b: elementB.value }))

const elementScoreMap = {
  air_air: 84,
  air_earth: 58,
  air_fire: 78,
  air_water: 64,
  earth_earth: 83,
  earth_fire: 64,
  earth_water: 78,
  fire_fire: 86,
  fire_water: 58,
  water_water: 82,
}

const modalityScoreMap = {
  cardinal_cardinal: 64,
  fixed_fixed: 66,
  mutable_mutable: 68,
  cardinal_fixed: 60,
  cardinal_mutable: 76,
  fixed_mutable: 62,
}

const elementScore = computed(() => {
  const elementPair = [elementAKey.value, elementBKey.value].sort().join('_')
  return elementScoreMap[elementPair] ?? 70
})

const modalityScore = computed(() => {
  const modalityPair = [modalityAKey.value, modalityBKey.value].sort().join('_')
  return modalityScoreMap[modalityPair] ?? 70
})

const compatibilityScore = computed(() => {
  return Math.round(elementScore.value * 0.65 + modalityScore.value * 0.35)
})

const resultText = computed(() => {
  const elementPair = [elementAKey.value, elementBKey.value].sort().join('_')
  return tt(`compatibilityPage.elementTexts.${elementPair}`)
})

const summaryText = computed(() => {
  const score = compatibilityScore.value
  if (score >= 82) return tt('compatibilityPage.summary.high')
  if (score >= 70) return tt('compatibilityPage.summary.mid')
  return tt('compatibilityPage.summary.low')
})

const confidenceLabel = computed(() => {
  const score = compatibilityScore.value
  if (score >= 82) return tt('compatibilityPage.confidence.high')
  if (score >= 70) return tt('compatibilityPage.confidence.mid')
  return tt('compatibilityPage.confidence.low')
})

const insightText = computed(() => {
  const elementPair = [elementAKey.value, elementBKey.value].sort().join('_')
  return tt(`compatibilityPage.insights.${elementPair}`)
})

const sphereItems = computed(() => {
  const scores = getSphereScores()
  return [
    { key: 'emotion', labelKey: 'compatibilityPage.spheres.emotion', value: scores.emotion, icon: 'favorite' },
    { key: 'communication', labelKey: 'compatibilityPage.spheres.communication', value: scores.communication, icon: 'forum' },
    { key: 'stability', labelKey: 'compatibilityPage.spheres.stability', value: scores.stability, icon: 'shield' },
  ]
})

const balanceA = computed(() => getElementBalance().a)
const balanceB = computed(() => getElementBalance().b)

const modalityExplain = computed(() => {
  const pair = [modalityAKey.value, modalityBKey.value].sort().join('_')
  return tt(`compatibilityPage.modalityTexts.${pair}`)
})

const elementColorMap = {
  fire: '#F28C6B',
  earth: '#9AD39F',
  air: '#9AC9F4',
  water: '#7FA2F2',
}

const resultStyle = computed(() => ({
  '--element-color-a': elementColorMap[elementAKey.value] || '#9AC9F4',
  '--element-color-b': elementColorMap[elementBKey.value] || '#7FA2F2',
}))

const formatText = (template, vars) => {
  if (!template) return ''
  return Object.entries(vars || {}).reduce((acc, [key, value]) => {
    return acc.replaceAll(`{${key}}`, value)
  }, template)
}

const clamp = (value) => Math.max(30, Math.min(90, Math.round(value)))

const getSphereScores = () => {
  const elements = [elementAKey.value, elementBKey.value]
  const emotion = clamp(50 + elements.filter((el) => el === 'water').length * 18 - elements.filter((el) => el === 'air').length * 6)
  const communication = clamp(50 + elements.filter((el) => el === 'air').length * 18 - elements.filter((el) => el === 'earth').length * 6)
  const stability = clamp(50 + elements.filter((el) => el === 'earth').length * 18 - elements.filter((el) => el === 'fire').length * 6)
  return { emotion, communication, stability }
}

const getElementBalance = () => {
  const pair = [elementAKey.value, elementBKey.value].sort().join('_')
  if (elementAKey.value === elementBKey.value) {
    return { a: 50, b: 50 }
  }
  if (pair === 'air_fire' || pair === 'earth_water') {
    return { a: 55, b: 45 }
  }
  if (pair === 'air_water' || pair === 'earth_fire') {
    return { a: 52, b: 48 }
  }
  if (pair === 'air_earth' || pair === 'fire_water') {
    return { a: 65, b: 35 }
  }
  return { a: 55, b: 45 }
}

async function hapticSelect() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    console.error(e)
  }
}

async function onBack() {
  await hapticSelect()
  router.back()
}

async function goPremium() {
  await hapticSelect()
  await router.push({ name: 'premium' })
}

function openPicker(which) {
  activePicker.value = which
  selectedWheelIndex.value = which === 'a' ? selectedIndexA.value : selectedIndexB.value
  sheetOpen.value = true
  void hapticSelect()
  nextTick(() => scrollWheelTo(selectedWheelIndex.value, false))
}

function onWheelScroll() {
  const wheel = wheelRef.value
  if (!wheel) return
  const rawIndex = Math.round(wheel.scrollTop / 44)
  const nextIndex = Math.min(signs.length - 1, Math.max(0, rawIndex))
  if (nextIndex === selectedWheelIndex.value) return
  selectedWheelIndex.value = nextIndex
  const now = Date.now()
  if (now - lastHapticAt.value > 80) {
    void hapticSelect()
    lastHapticAt.value = now
  }
}

function onWheelItemTap(index) {
  selectedWheelIndex.value = index
  scrollWheelTo(index, true)
  void hapticSelect()
}

function scrollWheelTo(index, smooth) {
  const wheel = wheelRef.value
  if (!wheel) return
  const top = index * 44
  wheel.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
}

function confirmWheel() {
  void hapticSelect()
  if (activePicker.value === 'a') {
    selectedIndexA.value = selectedWheelIndex.value
  } else {
    selectedIndexB.value = selectedWheelIndex.value
  }
  sheetOpen.value = false
}

function showCompatibility() {
  if (showResult.value) {
    showResult.value = false
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        showResult.value = true
      })
    } else {
      showResult.value = true
    }
  } else {
    showResult.value = true
  }
  void hapticSelect()
}

function onDetailsOpen() {
  detailsOpen.value = true
  void hapticSelect()
}

function onDetailsClose() {
  detailsOpen.value = false
  void hapticSelect()
}

function onDetailsTabClick(tabId) {
  detailsTab.value = tabId
  void hapticSelect()
}

watch(
  () => sheetOpen.value,
  (val) => {
    document.body.classList.toggle('hide-bottom-nav', val)
  }
)

watch(
  () => detailsOpen.value,
  (val) => {
    document.body.classList.toggle('hide-bottom-nav', val)
  }
)

watch([selectedIndexA, selectedIndexB], () => {
  showResult.value = false
  detailsOpen.value = false
  detailsTab.value = 'basic'
})

watch(
  () => showResult.value,
  (val) => {
    if (!val) {
      displayScore.value = 0
      return
    }
    const target = compatibilityScore.value
    const start = performance.now()
    const from = 0
    const duration = 720
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration)
      displayScore.value = Math.round(from + (target - from) * progress)
      if (progress < 1) {
        scoreAnimFrame = requestAnimationFrame(tick)
      }
    }
    cancelAnimationFrame(scoreAnimFrame)
    scoreAnimFrame = requestAnimationFrame(tick)
  }
)

onBeforeUnmount(() => {
  document.body.classList.remove('hide-bottom-nav')
})
</script>

<style scoped lang="scss">
.compat-page {
  min-height: 100vh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}

.compat-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.compat-content {
  position: relative;
  z-index: 1;
  padding: calc(90px + env(safe-area-inset-top)) 18px calc(32px + env(safe-area-inset-bottom, 0px) + 84px);
  max-width: 540px;
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.compat-hero {
  display: grid;
  gap: 3px;
}

.compat-hero--with-back {
  position: relative;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 12px;
}

.compat-hero__text {
  text-align: center;
  display: grid;
  gap: 3px;
  justify-items: center;
  padding: 0 44px;
}

.compat-title {
  font-size: 18px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.compat-kicker {
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.compat-back {
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

.compat-stack {
  display: grid;
  gap: 16px;
}

.compat-lock {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(120% 90% at 20% 0%, rgba(112, 156, 255, 0.18) 0%, rgba(12, 18, 30, 0.12) 42%, transparent 100%),
    linear-gradient(160deg, rgba(14, 20, 32, 0.92), rgba(6, 10, 18, 0.98));
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  padding: 22px 18px 20px;
  display: grid;
  gap: 12px;
}

.compat-lock::before {
  content: '';
  position: absolute;
  inset: -140% auto auto -50%;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(145, 188, 255, 0.28) 0%, rgba(145, 188, 255, 0) 70%);
  pointer-events: none;
}

.compat-lock__badge {
  justify-self: start;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(186, 207, 247, 0.34);
  background: rgba(87, 123, 190, 0.2);
  color: rgba(226, 236, 255, 0.95);
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 600;
}

.compat-lock__title {
  font-size: 18px;
  line-height: 1.25;
  letter-spacing: 0.03em;
  color: rgba(238, 244, 255, 0.96);
  font-weight: 600;
}

.compat-lock__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(216, 228, 247, 0.78);
}

.compat-lock__preview {
  border-radius: 14px;
  border: 1px solid rgba(165, 196, 245, 0.22);
  background: rgba(7, 12, 20, 0.62);
  padding: 12px;
  display: grid;
  gap: 8px;
}

.compat-lock__preview-line {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(221, 232, 250, 0.72);
}

.compat-lock__meter {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
  margin-top: 2px;
}

.compat-lock__meter-fill {
  display: block;
  height: 100%;
  width: 78%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(121, 181, 255, 0.95), rgba(255, 216, 152, 0.92));
  box-shadow: 0 0 12px rgba(134, 186, 255, 0.45);
}

.compat-lock__cta {
  width: 100%;
  margin-top: 6px;
  border-radius: 14px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 14px 16px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: #e9edf4;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 180ms ease;
}

.compat-lock__cta:active {
  transform: scale(0.98);
}

.compat-panel {
  padding: 20px 18px 18px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: linear-gradient(160deg, rgba(14, 20, 32, 0.92), rgba(6, 10, 18, 0.98));
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  display: grid;
  gap: 14px;
}

.compat-panel__title {
  font-size: 10px;
  letter-spacing: 0.26em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
  font-weight: 600;
}

.compat-pick-group {
  display: grid;
  gap: 10px;
}

.compat-pick {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 12, 20, 0.78);
  border-radius: 14px;
  padding: 14px 14px;
  display: grid;
  grid-template-columns: 1fr 24px;
  align-items: center;
  gap: 10px;
  color: rgba(235, 242, 255, 0.92);
  text-align: left;
  transition: all 180ms ease;
}

.compat-pick:active {
  transform: scale(0.98);
  background: rgba(12, 16, 26, 0.85);
}

.compat-pick__content {
  display: grid;
  gap: 4px;
}

.compat-pick__label {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.56);
  font-weight: 500;
}

.compat-pick__value {
  font-size: 15px;
  letter-spacing: 0.02em;
  color: rgba(235, 242, 255, 0.94);
  font-weight: 500;
}

.compat-chevron {
  color: rgba(214, 225, 242, 0.4);
}

.compat-cta {
  width: 100%;
  margin-top: 4px;
  border-radius: 14px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 14px 16px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: #e9edf4;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 180ms ease;
}

.compat-cta:active {
  transform: scale(0.98);
}

.compat-cta--active {
  border-color: rgba(156, 184, 235, 0.22);
  background: linear-gradient(180deg, rgba(16, 24, 38, 0.85), rgba(8, 12, 22, 0.92));
  color: rgba(214, 225, 242, 0.9);
}

.compat-cta__icon {
  color: rgba(173, 210, 255, 0.8);
}

.compat-empty {
  display: grid;
  gap: 10px;
  text-align: center;
  justify-items: center;
  padding: 32px 20px;
}

.compat-empty__icon {
  font-size: 32px;
  color: rgba(173, 210, 255, 0.3);
  margin-bottom: 4px;
}

.compat-empty__title {
  font-size: 14px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(235, 242, 255, 0.82);
  font-weight: 600;
}

.compat-empty__text {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(214, 225, 242, 0.65);
  max-width: 280px;
}

.compat-preview--active {
  padding: 0;
}

.compat-result-header {
  display: grid;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.compat-result-header__title {
  font-size: 14px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(235, 242, 255, 0.88);
  font-weight: 600;
}

.compat-result-header__subtitle {
  font-size: 13px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.compat-report {
  display: grid;
  gap: 16px;
  position: relative;
}

.compat-report__header {
  display: grid;
  gap: 14px;
  grid-template-columns: auto 1fr;
  align-items: start;
}

.compat-report__meta {
  display: grid;
  gap: 6px;
}

.compat-report__score {
  display: grid;
  gap: 4px;
  justify-items: start;
}

.compat-report--animate .compat-score {
  animation: scorePop 420ms ease-out;
}

.compat-report--animate .compat-meter__fill {
  animation: meterFill 520ms ease-out;
}

.compat-score {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 48px;
  letter-spacing: 0.02em;
  font-weight: 700;
  background: linear-gradient(135deg, rgba(173, 210, 255, 1), rgba(110, 166, 255, 0.9));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.compat-score__meta {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
  font-weight: 500;
}

.compat-score__unit {
  font-size: 20px;
  letter-spacing: 0.1em;
  opacity: 0.7;
}

.compat-meter {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.compat-meter__fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(110, 166, 255, 0.9), rgba(173, 210, 255, 0.9));
  box-shadow: 0 0 14px rgba(110, 166, 255, 0.45);
  transition: width 480ms ease;
  transform-origin: left center;
}

.compat-report__line {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.55);
}

.compat-report__summary {
  font-size: 15px;
  line-height: 1.5;
  color: rgba(235, 242, 255, 0.94);
  font-weight: 600;
}

.compat-description {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(8, 12, 20, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.compat-description__text {
  font-size: 13px;
  line-height: 1.65;
  color: rgba(224, 234, 251, 0.82);
}

.compat-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.compat-tag {
  padding: 6px 12px;
  border-radius: 999px;
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  font-weight: 500;
}

.compat-tag--element {
  border: 1px solid rgba(173, 210, 255, 0.24);
  background: rgba(110, 166, 255, 0.12);
  color: rgba(173, 210, 255, 0.9);
}

.compat-tag--modality {
  border: 1px solid rgba(156, 184, 235, 0.2);
  background: rgba(83, 112, 170, 0.12);
  color: rgba(186, 207, 247, 0.85);
}

.compat-insight {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 12, 20, 0.7);
}

.compat-insight__label {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
  font-weight: 600;
}

.compat-insight__text {
  font-size: 13px;
  line-height: 1.65;
  color: rgba(224, 234, 251, 0.84);
}

.compat-metrics-section {
  display: grid;
  gap: 10px;
}

.compat-metrics-section__title {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
  font-weight: 600;
}

.compat-metrics {
  display: grid;
  gap: 12px;
}

.compat-metric {
  display: grid;
  gap: 8px;
}

.compat-metric__header {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
}

.compat-metric__label {
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.7);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
}

.compat-metric__icon {
  color: rgba(173, 210, 255, 0.8);
}

.compat-metric__bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.compat-metric__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(110, 166, 255, 0.9), rgba(173, 210, 255, 0.9));
  box-shadow: 0 0 10px rgba(110, 166, 255, 0.28);
  transition: width 480ms ease;
}

.compat-metric__value {
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgba(235, 242, 255, 0.8);
  font-weight: 600;
}

.compat-balance {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(8, 12, 20, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.compat-balance__label {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
  font-weight: 600;
}

.compat-balance__rows {
  display: grid;
  gap: 10px;
}

.compat-balance__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
}

.compat-balance__name {
  font-size: 13px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(224, 234, 251, 0.8);
  font-weight: 500;
  min-width: 60px;
}

.compat-balance__bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.compat-balance__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--element-color-a), var(--element-color-b));
  transition: width 480ms ease;
}

.compat-balance__percent {
  font-size: 13px;
  letter-spacing: 0.08em;
  color: rgba(214, 225, 242, 0.7);
  font-weight: 600;
  min-width: 36px;
  text-align: right;
}

.compat-details-link {
  width: 100%;
  margin-top: 2px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 1px solid rgba(156, 184, 235, 0.24);
  background: rgba(28, 38, 58, 0.5);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(235, 242, 255, 0.88);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 180ms ease;
}

.compat-details-link:active {
  transform: scale(0.98);
  background: rgba(28, 38, 58, 0.7);
}

.compat-details-link__icon {
  color: rgba(173, 210, 255, 0.8);
}

.details-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(7, 11, 18, 0.98);
  padding: 12px 14px;
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.details-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.details-row--stack {
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.details-row--final .details-value {
  color: rgba(255, 255, 255, 0.95);
}

.details-label {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.details-value {
  font-size: 13px;
  letter-spacing: 0.04em;
  color: rgba(224, 236, 255, 0.9);
}

.details-explain {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.7);
}

.details-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.details-body {
  min-height: 360px;
  display: grid;
  align-content: start;
  gap: 10px;
}

.details-tab {
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(9, 13, 20, 0.7);
  padding: 8px 6px;
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.details-tab--active {
  color: #fff;
  border-color: rgba(159, 216, 246, 0.45);
  box-shadow: 0 0 12px rgba(159, 216, 246, 0.2);
}

.details-extended {
  display: grid;
  gap: 10px;
}

.details-notes {
  margin-top: 12px;
  padding: 12px 14px 10px;
  border-radius: 14px;
  border: 1px solid rgba(156, 184, 235, 0.2);
  background: rgba(5, 9, 15, 0.98);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.details-notes__title {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.details-notes__list {
  margin: 8px 0 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(224, 234, 251, 0.8);
}

@keyframes compatGlow {
  0%, 100% { transform: translateY(0); opacity: 0.45; }
  50% { transform: translateY(-8px); opacity: 0.75; }
}

@keyframes compatSweep {
  0% { transform: translateX(-120%); opacity: 0; }
  45% { opacity: 0.35; }
  100% { transform: translateX(120%); opacity: 0; }
}

@keyframes scorePop {
  0% { transform: translateY(6px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes meterFill {
  0% { transform: scaleX(0.2); opacity: 0.5; }
  100% { transform: scaleX(1); opacity: 1; }
}

.oracle-actions {
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  margin-bottom: 0;
  border-radius: 22px 22px 0 0;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 24px);
  box-shadow: 0 -16px 46px rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
  pointer-events: auto;
  background: #050d15;
}

.oracle-actions-dialog--details .oracle-actions {
  min-height: 72vh;
  display: flex;
  flex-direction: column;
}

.oracle-actions-dialog--details .oracle-actions__footer {
  margin-top: auto;
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
  overflow-x: hidden;
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

.oracle-actions__footer {
  margin-top: 12px;
  padding: 8px;
  border-radius: 16px;
  border: 1px solid rgba(106, 126, 164, 0.22);
  background:
    linear-gradient(180deg, rgba(9, 13, 21, 0.88), rgba(3, 6, 11, 0.95)),
    linear-gradient(90deg, rgba(83, 112, 170, 0.1), rgba(83, 112, 170, 0));
  box-shadow:
    inset 0 1px 0 rgba(186, 207, 247, 0.08),
    0 10px 24px rgba(0, 0, 0, 0.3);
}

.oracle-actions__ok {
  width: 100%;
  min-height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: #e9edf4;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
}
</style>
