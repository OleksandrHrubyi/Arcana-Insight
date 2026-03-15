<template>
  <q-page class="compat-page">
    <div class="compat-bg" aria-hidden="true"></div>

    <div class="compat-content">
      <header class="compat-hero compat-hero--with-back">
        <button type="button" class="compat-back" @click="$router.back()">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="compat-hero__text">
          <div class="compat-title">{{ tt('compatibilityPage.title') }}</div>
          <div class="compat-kicker">{{ tt('compatibilityPage.subtitle') }}</div>
        </div>
      </header>

      <section class="compat-stack">
        <div class="compat-card">
          <div class="compat-card__title">
            {{ tt('compatibilityPage.sections.match') }}
          </div>

          <button type="button" class="compat-select" @click="openPicker('a')">
            <span class="compat-select__label">{{ tt('compatibilityPage.you') }}</span>
            <span class="compat-select__value">{{ selectedLabelA }}</span>
            <q-icon name="chevron_right" size="18px" class="compat-chevron" />
          </button>

          <button type="button" class="compat-select" @click="openPicker('b')">
            <span class="compat-select__label">{{ tt('compatibilityPage.partner') }}</span>
            <span class="compat-select__value">{{ selectedLabelB }}</span>
            <q-icon name="chevron_right" size="18px" class="compat-chevron" />
          </button>

          <button type="button" class="compat-cta" @click="showCompatibility">
            {{ tt('compatibilityPage.cta') }}
          </button>
        </div>

        <div class="compat-card compat-card--result">
          <div class="compat-card__title">
            {{ tt('compatibilityPage.sections.preview') }}
          </div>
          <div class="compat-preview" :class="{ 'compat-preview--active': showResult }">
            <div class="compat-preview__title">
              {{ showResult ? formatText(tt('compatibilityPage.resultTitle'), { a: selectedLabelA, b: selectedLabelB }) : tt('compatibilityPage.previewTitle') }}
            </div>
            <div class="compat-preview__text">
              <span v-if="showResult">
                {{ tt('compatibilityPage.resultSub') }}
              </span>
              <span v-else>
                {{ tt('compatibilityPage.previewText') }}
              </span>
            </div>

            <div v-if="showResult" class="compat-result compat-result--animate" :style="resultStyle">
              <div class="compat-score">
                <span class="compat-score__value">{{ compatibilityScore }}</span>
                <span class="compat-score__unit">%</span>
              </div>
              <div class="compat-meter">
                <span class="compat-meter__fill" :style="{ width: `${compatibilityScore}%` }"></span>
              </div>
              <div class="compat-result__line">{{ elementLine }}</div>
              <div class="compat-result__summary">{{ summaryText }}</div>
              <div class="compat-result__text">{{ resultText }}</div>
              <div class="compat-tags">
                <span class="compat-tag">{{ elementA }}</span>
                <span class="compat-tag">{{ elementB }}</span>
                <span class="compat-tag">{{ modalityLine }}</span>
              </div>
              <div class="compat-insight">
                <div class="compat-insight__label">{{ tt('compatibilityPage.insightLabel') }}</div>
                <div class="compat-insight__text">{{ insightText }}</div>
              </div>

              <div class="compat-spheres">
                <div class="compat-sphere" v-for="item in sphereItems" :key="item.key">
                  <div class="compat-sphere__label">
                    <q-icon :name="item.icon" size="14px" class="compat-sphere__icon" />
                    {{ tt(item.labelKey) }}
                  </div>
                  <div class="compat-sphere__bar">
                    <span class="compat-sphere__fill" :style="{ width: `${item.value}%` }"></span>
                  </div>
                  <div class="compat-sphere__value">{{ item.value }}%</div>
                </div>
              </div>

              <div class="compat-balance">
                <div class="compat-balance__label">{{ tt('compatibilityPage.balanceLabel') }}</div>
                <div class="compat-balance__row">
                  <span>{{ elementA }}</span>
                  <div class="compat-balance__bar">
                    <span class="compat-balance__fill" :style="{ width: `${balanceA}%` }"></span>
                  </div>
                  <span>{{ balanceA }}%</span>
                </div>
                <div class="compat-balance__row">
                  <span>{{ elementB }}</span>
                  <div class="compat-balance__bar">
                    <span class="compat-balance__fill" :style="{ width: `${balanceB}%` }"></span>
                  </div>
                  <span>{{ balanceB }}%</span>
                </div>
              </div>
              <button type="button" class="compat-details-btn" @click="onDetailsOpen">
                {{ tt('compatibilityPage.detailsCta') }}
              </button>
            </div>
          </div>
        </div>
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

          <div class="details-formula">
            <div class="details-formula__title">{{ tt('compatibilityPage.details.formula') }}</div>
            <div class="details-formula__text">
              {{ tt('compatibilityPage.details.formulaText') }}
            </div>
            <div class="details-formula__note">
              {{ tt('compatibilityPage.details.modalityNote') }}
            </div>
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

          <div v-else class="details-matrix">
            <div class="details-hint">{{ tt('compatibilityPage.details.matrixHint') }}</div>
            <div class="matrix-block">
              <div class="details-label">{{ tt('compatibilityPage.details.elementMatrix') }}</div>
              <div class="matrix-grid matrix-grid--elements">
                <div class="matrix-cell matrix-cell--head"></div>
              <div v-for="el in matrixElements" :key="`eh-${el}`" class="matrix-cell matrix-cell--head">
                {{ tt(`compatibilityPage.elements.${el}`) }}
              </div>
              <template v-for="row in matrixElements" :key="`row-${row}`">
                <div class="matrix-cell matrix-cell--head">{{ tt(`compatibilityPage.elements.${row}`) }}</div>
                <div
                  v-for="col in matrixElements"
                  :key="`cell-${row}-${col}`"
                  class="matrix-cell"
                  :class="{ 'matrix-cell--active': isElementCellActive(row, col) }"
                >
                  {{ getElementScore(row, col) }}
                </div>
              </template>
            </div>
            </div>

            <div class="matrix-block">
              <div class="details-label">{{ tt('compatibilityPage.details.modalityMatrix') }}</div>
              <div class="matrix-grid matrix-grid--modalities">
                <div class="matrix-cell matrix-cell--head"></div>
              <div v-for="mod in matrixModalities" :key="`mh-${mod}`" class="matrix-cell matrix-cell--head">
                {{ tt(`compatibilityPage.modalities.${mod}`) }}
              </div>
              <template v-for="row in matrixModalities" :key="`mrow-${row}`">
                <div class="matrix-cell matrix-cell--head">{{ tt(`compatibilityPage.modalities.${row}`) }}</div>
                <div
                  v-for="col in matrixModalities"
                  :key="`mcell-${row}-${col}`"
                  class="matrix-cell"
                  :class="{ 'matrix-cell--active': isModalityCellActive(row, col) }"
                >
                  {{ getModalityScore(row, col) }}
                </div>
              </template>
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
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)

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
const detailsTabs = [
  { id: 'basic', labelKey: 'compatibilityPage.details.tabs.basic' },
  { id: 'extended', labelKey: 'compatibilityPage.details.tabs.extended' },
  { id: 'matrix', labelKey: 'compatibilityPage.details.tabs.matrix' },
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
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    console.error(e)
  }
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
  showResult.value = true
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

const matrixElements = ['fire', 'earth', 'air', 'water']
const matrixModalities = ['cardinal', 'fixed', 'mutable']

const getElementScore = (a, b) => {
  const pair = [a, b].sort().join('_')
  return elementScoreMap[pair] ?? 70
}

const getModalityScore = (a, b) => {
  const pair = [a, b].sort().join('_')
  return modalityScoreMap[pair] ?? 70
}

const isElementCellActive = (a, b) => {
  return [a, b].sort().join('_') === [elementAKey.value, elementBKey.value].sort().join('_')
}

const isModalityCellActive = (a, b) => {
  return [a, b].sort().join('_') === [modalityAKey.value, modalityBKey.value].sort().join('_')
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
  padding: calc(60px + env(safe-area-inset-top)) 18px calc(32px + env(safe-area-inset-bottom, 0px) + 84px);
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
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

.compat-card {
  padding: 16px 16px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(11, 15, 24, 0.82);
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
  display: grid;
  gap: 8px;
}

.compat-card__title {
  font-size: 10px;
  letter-spacing: 0.28em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.compat-select {
  width: 100%;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 14, 22, 0.8);
  border-radius: 12px;
  padding: 12px 12px;
  display: grid;
  grid-template-columns: 1fr auto 24px;
  align-items: center;
  gap: 8px;
  color: rgba(235, 242, 255, 0.92);
  text-align: left;
}

.compat-cta {
  margin-top: 6px;
  border-radius: 12px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: #e9edf4;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.compat-select__label {
  font-size: 11px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.56);
}

.compat-select__value {
  font-size: 14px;
  letter-spacing: 0.04em;
}

.compat-chevron {
  color: rgba(214, 225, 242, 0.5);
}

.compat-card--result {
  gap: 10px;
}

.compat-preview__title {
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(235, 242, 255, 0.82);
}

.compat-preview__text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.7);
}

.compat-preview--active {
  padding: 2px 0 0;
}

.compat-result {
  margin-top: 12px;
  display: grid;
  gap: 10px;
  position: relative;
  padding: 14px 14px 16px;
  border-radius: 14px;
  background:
    radial-gradient(140% 120% at 50% 0%, rgba(76, 112, 176, 0.22), rgba(6, 10, 16, 0.98));
  border: 1px solid rgba(126, 162, 214, 0.2);
  overflow: hidden;
}

.compat-result::before {
  content: '';
  position: absolute;
  inset: -55% 0 auto;
  height: 140%;
  background:
    radial-gradient(60% 60% at 50% 0%, rgba(120, 170, 255, 0.35), rgba(120, 170, 255, 0));
  opacity: 0.5;
  animation: compatGlow 6s ease-in-out infinite;
  pointer-events: none;
}

.compat-result::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.08), transparent);
  animation: compatSweep 4.2s ease-in-out infinite;
  pointer-events: none;
}

.compat-result--animate .compat-score {
  animation: scorePop 420ms ease-out;
}

.compat-result--animate .compat-meter__fill {
  animation: meterFill 520ms ease-out;
}

.compat-score {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 32px;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: rgba(235, 242, 255, 0.92);
  position: relative;
  z-index: 1;
}

.compat-score__unit {
  font-size: 14px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.compat-meter {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
  z-index: 1;
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

.compat-result__line {
  font-size: 12px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.65);
  position: relative;
  z-index: 1;
}

.compat-result__summary {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(224, 234, 251, 0.85);
  position: relative;
  z-index: 1;
}

.compat-result__text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(224, 234, 251, 0.82);
  position: relative;
  z-index: 1;
}

.compat-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  position: relative;
  z-index: 1;
}

.compat-insight {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 12, 20, 0.75);
  position: relative;
  z-index: 1;
}

.compat-insight__label {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.compat-insight__text {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(224, 234, 251, 0.82);
}

.compat-spheres {
  display: grid;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.compat-sphere {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 10px;
  align-items: center;
}

.compat-sphere__label {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.compat-sphere__icon {
  color: rgba(173, 210, 255, 0.8);
}

.compat-sphere__bar {
  grid-column: 1 / -1;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.compat-sphere__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(110, 166, 255, 0.9), rgba(173, 210, 255, 0.9));
  box-shadow: 0 0 10px rgba(110, 166, 255, 0.35);
}

.compat-sphere__value {
  font-size: 11px;
  letter-spacing: 0.12em;
  color: rgba(214, 225, 242, 0.6);
}

.compat-balance {
  display: grid;
  gap: 8px;
  position: relative;
  z-index: 1;
}

.compat-balance__label {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.compat-balance__row {
  display: grid;
  grid-template-columns: 1fr 1.4fr auto;
  gap: 8px;
  align-items: center;
  font-size: 11px;
  color: rgba(224, 234, 251, 0.8);
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
}

.compat-tag {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(8, 12, 20, 0.7);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.7);
}

.compat-details-btn {
  margin-top: 8px;
  border-radius: 12px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: #e9edf4;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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

.details-matrix {
  display: grid;
  gap: 14px;
}

.details-hint {
  font-size: 11px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.6);
}

.matrix-block {
  display: grid;
  gap: 8px;
}

.matrix-grid {
  display: grid;
  gap: 6px;
}

.matrix-grid--elements {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.matrix-grid--modalities {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.matrix-cell {
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 12, 20, 0.85);
  color: rgba(214, 225, 242, 0.75);
  font-size: 10px;
  text-align: center;
  padding: 6px 2px;
}

.matrix-cell--head {
  font-size: 9px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.55);
}

.matrix-cell--active {
  border-color: rgba(159, 216, 246, 0.5);
  color: #fff;
  box-shadow: 0 0 10px rgba(159, 216, 246, 0.25);
}
.details-formula {
  margin-top: 12px;
  padding: 12px 14px 10px;
  border-radius: 14px;
  border: 1px dashed rgba(156, 184, 235, 0.32);
  background: rgba(5, 9, 15, 0.98);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.details-formula__title {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.details-formula__text {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(224, 234, 251, 0.8);
}

.details-formula__note {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.6);
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
  font-size: 11px;
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
