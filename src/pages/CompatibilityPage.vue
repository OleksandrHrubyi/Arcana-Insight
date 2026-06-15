<template>
  <q-page class="compat-page">
    <div class="compat-bg" aria-hidden="true"></div>

    <div class="compat-content">
      <header class="compat-topbar">
        <button type="button" class="compat-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="compat-topbar__text">
          <div class="compat-topbar__title">{{ tt('compatibilityPage.title') }}</div>
          <div class="compat-topbar__subtitle">{{ tt('compatibilityPage.subtitle') }}</div>
        </div>
        <div class="compat-topbar__ghost"></div>
      </header>

      <section class="compat-shell">
        <div class="compat-card compat-card--hero">
          <div class="compat-card__eyebrow">{{ tt('compatibilityPage.heroEyebrow') }}</div>

          <div class="compat-hero-copy">
            <div class="compat-hero-copy__title">{{ tt('compatibilityPage.heroTitle') }}</div>
            <div class="compat-hero-copy__text">{{ tt('compatibilityPage.heroText') }}</div>
          </div>

          <div class="compat-pair-stage">
            <button type="button" class="compat-sign-pill" @click="openPicker('a')">
              <span class="compat-sign-pill__label">{{ tt('compatibilityPage.you') }}</span>
              <span class="compat-sign-pill__value">{{ selectedLabelA }}</span>
            </button>

            <button
              type="button"
              class="compat-swap"
              :disabled="!hasPair"
              :aria-label="tt('compatibilityPage.swap')"
              @click="swapSigns"
            >
              <q-icon name="swap_horiz" size="18px" />
            </button>

            <button type="button" class="compat-sign-pill" @click="openPicker('b')">
              <span class="compat-sign-pill__label">{{ tt('compatibilityPage.partner') }}</span>
              <span class="compat-sign-pill__value">{{ selectedLabelB }}</span>
            </button>
          </div>

          <div v-if="recentPairsWithLabels.length" class="compat-recents">
            <div class="compat-recents__label">{{ tt('compatibilityPage.recentTitle') }}</div>
            <div class="compat-recents__row">
              <button
                v-for="pair in recentPairsWithLabels"
                :key="pair.key"
                type="button"
                class="compat-recent-chip"
                @click="applyRecentPair(pair)"
              >
                {{ pair.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="compat-card compat-card--preview">
          <template v-if="hasPair">
            <div class="compat-preview-top">
              <div class="compat-preview-top__copy">
                <div class="compat-card__eyebrow">{{ tt('compatibilityPage.previewEyebrow') }}</div>
                <div class="compat-preview-top__title">{{ pairTitle }}</div>
                <div class="compat-preview-top__line">{{ pairLine }}</div>
              </div>
              <div class="compat-preview-top__meta">{{ tt('compatibilityPage.scope.badge') }}</div>
            </div>

            <div class="compat-scope-note">
              <div class="compat-scope-note__title">{{ tt('compatibilityPage.scope.title') }}</div>
              <div class="compat-scope-note__text">{{ tt('compatibilityPage.scope.text') }}</div>
            </div>

            <div class="compat-score-shell" :style="resultStyle">
              <div class="compat-overview-badge">{{ elementPairLabel }}</div>

              <div class="compat-score-copy">
                <div class="compat-score-copy__headline">{{ overviewTitle }}</div>
                <div class="compat-score-copy__summary">{{ overviewSummary }}</div>
                <div class="compat-score-copy__hint">{{ resultText }}</div>
              </div>
            </div>

            <div class="compat-facts-grid">
              <div v-for="item in factItems" :key="item.key" class="compat-fact-card">
                <div class="compat-fact-card__label">{{ item.label }}</div>
                <div class="compat-fact-card__text">{{ item.text }}</div>
              </div>
            </div>

            <div class="compat-advice-grid">
              <div class="compat-advice-card">
                <div class="compat-advice-card__label">
                  {{ tt('compatibilityPage.advice.chemistry') }}
                </div>
                <div class="compat-advice-card__text">{{ strengthText }}</div>
              </div>

              <div class="compat-advice-card">
                <div class="compat-advice-card__label">
                  {{ tt('compatibilityPage.advice.tension') }}
                </div>
                <div class="compat-advice-card__text">{{ cautionText }}</div>
              </div>

              <div class="compat-advice-card">
                <div class="compat-advice-card__label">
                  {{ tt('compatibilityPage.advice.approach') }}
                </div>
                <div class="compat-advice-card__text">{{ approachText }}</div>
              </div>
            </div>

            <section v-if="hasPremiumAccess" class="compat-stack">
              <div class="compat-deep-card">
                <div class="compat-deep-card__title">
                  {{ tt('compatibilityPage.dynamicTitle') }}
                </div>
                <div class="compat-deep-card__row">
                  <div class="compat-deep-card__label">
                    {{ tt('compatibilityPage.dynamicLabels.element') }}
                  </div>
                  <div class="compat-deep-card__text">{{ resultText }}</div>
                </div>
                <div class="compat-deep-card__row">
                  <div class="compat-deep-card__label">
                    {{ tt('compatibilityPage.dynamicLabels.pace') }}
                  </div>
                  <div class="compat-deep-card__text">{{ paceText }}</div>
                </div>
                <div class="compat-deep-card__row">
                  <div class="compat-deep-card__label">
                    {{ tt('compatibilityPage.dynamicLabels.support') }}
                  </div>
                  <div class="compat-deep-card__text">{{ insightText }}</div>
                </div>
              </div>
            </section>

            <div v-else class="compat-premium-card">
              <div class="compat-premium-card__badge">{{ tt('premiumAccess.badge') }}</div>
              <div class="compat-premium-card__title">
                {{ tt('premiumAccess.compatibility.title') }}
              </div>
              <div class="compat-premium-card__text">{{ premiumLockText }}</div>
              <div class="compat-premium-card__model">
                <div
                  v-for="row in premiumAccessModelRows"
                  :key="row.key"
                  class="compat-premium-card__model-row"
                >
                  <div class="compat-premium-card__model-label">{{ row.label }}</div>
                  <div class="compat-premium-card__model-text">{{ row.text }}</div>
                </div>
              </div>
              <ul class="compat-premium-card__list">
                <li v-for="item in premiumBullets" :key="item">{{ item }}</li>
              </ul>
              <button type="button" class="compat-premium-card__cta" @click="goPremium">
                <q-icon name="workspace_premium" size="16px" />
                <span>{{ tt('premiumAccess.cta') }}</span>
              </button>
            </div>

            <button type="button" class="compat-details-link" @click="onDetailsOpen">
              <q-icon name="info" size="16px" />
              <span>{{ tt('compatibilityPage.detailsCta') }}</span>
            </button>
          </template>

          <div v-else class="compat-empty">
            <div class="compat-empty__title">{{ tt('compatibilityPage.emptyTitle') }}</div>
            <div class="compat-empty__text">{{ tt('compatibilityPage.emptyText') }}</div>
          </div>
        </div>
      </section>
    </div>

    <q-dialog
      v-model="sheetOpen"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="420"
      class="oracle-actions-dialog"
    >
      <section class="oracle-actions">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-title">
          {{
            activePicker === 'a'
              ? tt('compatibilityPage.pickYou')
              : tt('compatibilityPage.pickPartner')
          }}
        </div>

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
          <button type="button" class="oracle-actions__ok" @click="sheetOpen = false">
            {{ tt('common.close') }}
          </button>
        </div>
      </section>
    </q-dialog>

    <q-dialog
      v-model="detailsOpen"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="420"
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
            {{ tab.label }}
          </button>
        </div>

        <div class="details-body">
          <div v-if="detailsTab === 'model'" class="details-stack">
            <div class="details-card">
              <div class="details-card__label">
                {{ tt('compatibilityPage.details.sections.model') }}
              </div>
              <div class="details-card__title">
                {{ tt('compatibilityPage.details.modelTitle') }}
              </div>
              <div class="details-card__text">{{ tt('compatibilityPage.details.modelText') }}</div>
            </div>

            <div class="details-card">
              <div class="details-card__label">
                {{ tt('compatibilityPage.details.sections.whatUses') }}
              </div>
              <ul class="details-list">
                <li v-for="item in detailUses" :key="item">{{ item }}</li>
              </ul>
            </div>

            <div class="details-card">
              <div class="details-card__label">
                {{ tt('compatibilityPage.details.sections.whatMisses') }}
              </div>
              <ul class="details-list">
                <li v-for="item in detailMisses" :key="item">{{ item }}</li>
              </ul>
            </div>

            <div class="details-card">
              <div class="details-card__label">
                {{ tt('compatibilityPage.details.sections.transparency') }}
              </div>
              <div class="details-card__text">
                {{ tt('compatibilityPage.details.transparencyText') }}
              </div>
            </div>
          </div>

          <div v-else-if="detailsTab === 'chemistry'" class="details-stack">
            <div class="details-card">
              <div class="details-card__label">
                {{ tt('compatibilityPage.details.sections.selectedPair') }}
              </div>
              <div class="details-card__title">{{ pairTitle }}</div>
              <div class="details-card__text">{{ pairLine }}</div>
            </div>

            <div class="details-card">
              <div class="details-card__label">
                {{ tt('compatibilityPage.details.sections.elementDynamic') }}
              </div>
              <div class="details-card__title">{{ strengthText }}</div>
              <div class="details-card__text">{{ resultText }}</div>
            </div>

            <div class="details-card">
              <div class="details-card__label">
                {{ tt('compatibilityPage.details.sections.support') }}
              </div>
              <div class="details-card__text">{{ insightText }}</div>
            </div>
          </div>

          <div v-else class="details-stack">
            <div class="details-card">
              <div class="details-card__label">
                {{ tt('compatibilityPage.details.sections.rhythm') }}
              </div>
              <div class="details-card__title">{{ modalityPairLabel }}</div>
              <div class="details-card__text">{{ paceText }}</div>
            </div>

            <div class="details-card">
              <div class="details-card__label">
                {{ tt('compatibilityPage.details.sections.watch') }}
              </div>
              <div class="details-card__text">{{ cautionText }}</div>
            </div>

            <div class="details-card">
              <div class="details-card__label">
                {{ tt('compatibilityPage.details.sections.approach') }}
              </div>
              <div class="details-card__text">{{ approachText }}</div>
            </div>
          </div>
        </div>

        <div class="oracle-actions__footer">
          <button type="button" class="oracle-actions__ok" @click="onDetailsClose">
            {{ tt('compatibilityPage.confirm') }}
          </button>
        </div>
      </section>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { usePremiumAccess } from 'src/stores/premiumAccess'
import { analytics } from 'src/services/analytics'
import { PAYWALL_ENTRY_POINTS } from 'src/constants/analyticsEvents'

const router = useRouter()
const { hasPremiumAccess } = usePremiumAccess()

const locale = computed(() =>
  (currentLocale.value || 'en').toLowerCase().startsWith('uk') ? 'uk' : 'en',
)
const tt = (key) => t(locale.value, key)

const RECENT_PAIRS_KEY = 'arcana_compatibility_recent_pairs_v1'

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

const elementColorMap = {
  fire: '#F18E72',
  earth: '#99CF9D',
  air: '#8DBEF0',
  water: '#7A9FF1',
}

const signLabels = computed(() => signs.map((sign) => tt(`zodiac.${sign.key}`)))
const selectedIndexA = ref(null)
const selectedIndexB = ref(null)
const selectedWheelIndex = ref(0)
const activePicker = ref('a')
const sheetOpen = ref(false)
const detailsOpen = ref(false)
const detailsTab = ref('model')
const wheelRef = ref(null)
const lastHapticAt = ref(0)
const recentPairs = ref([])

const selectedSignA = computed(() =>
  selectedIndexA.value == null ? null : signs[selectedIndexA.value] || null,
)
const selectedSignB = computed(() =>
  selectedIndexB.value == null ? null : signs[selectedIndexB.value] || null,
)
const hasPair = computed(() => Boolean(selectedSignA.value && selectedSignB.value))

const selectedLabelAReal = computed(() =>
  selectedSignA.value ? tt(`zodiac.${selectedSignA.value.key}`) : '',
)
const selectedLabelBReal = computed(() =>
  selectedSignB.value ? tt(`zodiac.${selectedSignB.value.key}`) : '',
)
const selectedLabelA = computed(
  () => selectedLabelAReal.value || tt('compatibilityPage.pickPlaceholder'),
)
const selectedLabelB = computed(
  () => selectedLabelBReal.value || tt('compatibilityPage.pickPlaceholder'),
)

const elementAKey = computed(() => selectedSignA.value?.element || '')
const elementBKey = computed(() => selectedSignB.value?.element || '')
const modalityAKey = computed(() => selectedSignA.value?.modality || '')
const modalityBKey = computed(() => selectedSignB.value?.modality || '')

const elementPairKey = computed(() =>
  hasPair.value ? [elementAKey.value, elementBKey.value].sort().join('_') : '',
)
const modalityPairKey = computed(() =>
  hasPair.value ? [modalityAKey.value, modalityBKey.value].sort().join('_') : '',
)

const elementA = computed(() =>
  elementAKey.value ? tt(`compatibilityPage.elements.${elementAKey.value}`) : '',
)
const elementB = computed(() =>
  elementBKey.value ? tt(`compatibilityPage.elements.${elementBKey.value}`) : '',
)
const modalityLabelA = computed(() =>
  modalityAKey.value ? tt(`compatibilityPage.modalities.${modalityAKey.value}`) : '',
)
const modalityLabelB = computed(() =>
  modalityBKey.value ? tt(`compatibilityPage.modalities.${modalityBKey.value}`) : '',
)

const pairTitle = computed(() =>
  hasPair.value ? `${selectedLabelAReal.value} + ${selectedLabelBReal.value}` : '',
)
const pairLine = computed(() =>
  hasPair.value
    ? formatText(tt('compatibilityPage.elementLine'), { a: elementA.value, b: elementB.value })
    : '',
)
const elementPairLabel = computed(() =>
  hasPair.value ? `${elementA.value} + ${elementB.value}` : '',
)
const modalityPairLabel = computed(() =>
  hasPair.value ? `${modalityLabelA.value} + ${modalityLabelB.value}` : '',
)

const elementScore = computed(() => {
  if (!hasPair.value) return 0
  return elementScoreMap[elementPairKey.value] ?? 70
})

const modalityScore = computed(() => {
  if (!hasPair.value) return 0
  return modalityScoreMap[modalityPairKey.value] ?? 70
})

const compatibilitySignal = computed(() => {
  if (!hasPair.value) return 0
  return Math.round(elementScore.value * 0.65 + modalityScore.value * 0.35)
})

const overviewTier = computed(() => {
  if (compatibilitySignal.value >= 80) return 'easy'
  if (compatibilitySignal.value >= 68) return 'mixed'
  return 'intentional'
})

const overviewTitle = computed(() =>
  hasPair.value ? tt(`compatibilityPage.overview.${overviewTier.value}.title`) : '',
)
const overviewSummary = computed(() =>
  hasPair.value ? tt(`compatibilityPage.overview.${overviewTier.value}.summary`) : '',
)
const resultText = computed(() =>
  hasPair.value ? tt(`compatibilityPage.elementTexts.${elementPairKey.value}`) : '',
)
const insightText = computed(() =>
  hasPair.value ? tt(`compatibilityPage.insights.${elementPairKey.value}`) : '',
)
const paceText = computed(() =>
  hasPair.value ? tt(`compatibilityPage.modalityTexts.${modalityPairKey.value}`) : '',
)
const strengthText = computed(() =>
  hasPair.value ? tt(`compatibilityPage.strengths.${elementPairKey.value}`) : '',
)
const cautionText = computed(() =>
  hasPair.value ? tt(`compatibilityPage.warnings.${modalityPairKey.value}`) : '',
)
const approachText = computed(() =>
  hasPair.value ? tt(`compatibilityPage.approaches.${overviewTier.value}`) : '',
)

const resultStyle = computed(() => ({
  '--compat-accent-a': elementColorMap[elementAKey.value] || '#8DBEF0',
  '--compat-accent-b': elementColorMap[elementBKey.value] || '#7A9FF1',
}))

const factItems = computed(() => {
  if (!hasPair.value) return []
  return [
    {
      key: 'elements',
      label: tt('compatibilityPage.facts.elements'),
      text: elementPairLabel.value,
    },
    {
      key: 'pace',
      label: tt('compatibilityPage.facts.pace'),
      text: modalityPairLabel.value,
    },
    {
      key: 'reading',
      label: tt('compatibilityPage.facts.reading'),
      text: tt('compatibilityPage.facts.readingValue'),
    },
  ]
})

const detailUses = computed(() => [
  tt('compatibilityPage.details.useList.sun'),
  tt('compatibilityPage.details.useList.element'),
  tt('compatibilityPage.details.useList.modality'),
])

const detailMisses = computed(() => [
  tt('compatibilityPage.details.missList.moon'),
  tt('compatibilityPage.details.missList.rising'),
  tt('compatibilityPage.details.missList.venusMars'),
  tt('compatibilityPage.details.missList.birthTime'),
])

const recentPairsWithLabels = computed(() =>
  recentPairs.value
    .map((pair) => {
      const first = signs[pair.a]
      const second = signs[pair.b]
      if (!first || !second) return null
      return {
        ...pair,
        key: `${pair.a}-${pair.b}`,
        label: `${tt(`zodiac.${first.key}`)} + ${tt(`zodiac.${second.key}`)}`,
      }
    })
    .filter(Boolean),
)

const detailsTabs = computed(() => [
  { id: 'model', label: tt('compatibilityPage.details.tabs.model') },
  { id: 'chemistry', label: tt('compatibilityPage.details.tabs.chemistry') },
  { id: 'pace', label: tt('compatibilityPage.details.tabs.pace') },
])

const premiumLockText = computed(() =>
  locale.value === 'uk'
    ? 'Преміум відкриває повне читання сумісності з розкладом балів і чіткими підказками.'
    : 'Premium adds the full relationship reading with score breakdown and clear guidance.',
)

const premiumBullets = computed(() => [
  tt('premiumAccess.compatibility.bullets.report'),
  tt('premiumAccess.compatibility.bullets.scores'),
  tt('premiumAccess.compatibility.bullets.insight'),
])

const premiumAccessModelRows = computed(() => [
  {
    key: 'free',
    label: tt('premiumAccess.model.labels.free'),
    text: tt('premiumAccess.model.compatibility.free'),
  },
  {
    key: 'premium',
    label: tt('premiumAccess.model.labels.premium'),
    text: tt('premiumAccess.model.compatibility.premium'),
  },
  {
    key: 'purchase',
    label: tt('premiumAccess.model.labels.purchase'),
    text: tt('premiumAccess.model.compatibility.purchase'),
  },
])

function formatText(template, vars) {
  if (!template) return ''
  return Object.entries(vars || {}).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
    template,
  )
}

async function hapticSelect() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // ignore haptic failures
  }
}

function setHideBottomNav(enabled) {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('hide-bottom-nav', enabled)
}

function loadRecentPairs() {
  if (typeof window === 'undefined') return
  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_PAIRS_KEY) || '[]')
    if (!Array.isArray(parsed)) return
    recentPairs.value = parsed
      .filter((item) => Number.isInteger(item?.a) && Number.isInteger(item?.b))
      .filter(
        (item) => item.a >= 0 && item.a < signs.length && item.b >= 0 && item.b < signs.length,
      )
      .slice(0, 4)
  } catch {
    recentPairs.value = []
  }
}

function persistRecentPairs() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(RECENT_PAIRS_KEY, JSON.stringify(recentPairs.value))
}

function rememberPair(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b)) return
  recentPairs.value = [
    { a, b },
    ...recentPairs.value.filter((item) => item.a !== a || item.b !== b),
  ].slice(0, 4)
  persistRecentPairs()
}

async function onBack() {
  await hapticSelect()
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  await router.replace({ name: 'menu' })
}

async function goPremium() {
  await hapticSelect()
  const point = PAYWALL_ENTRY_POINTS.compatibilityLock
  void analytics.logEvent(point.event, {
    source: point.source,
    entry: point.entry,
  })
  await router.push({
    name: 'premium',
    query: { source: point.source, entry: point.entry },
  })
}

function openPicker(which) {
  activePicker.value = which
  selectedWheelIndex.value =
    which === 'a' ? (selectedIndexA.value ?? 0) : (selectedIndexB.value ?? 0)
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
  applyWheelSelection(index)
  sheetOpen.value = false
  void hapticSelect()
}

function scrollWheelTo(index, smooth) {
  const wheel = wheelRef.value
  if (!wheel) return
  const top = index * 44
  wheel.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
}

function applyWheelSelection(nextIndex) {
  if (activePicker.value === 'a') {
    selectedIndexA.value = nextIndex
  } else {
    selectedIndexB.value = nextIndex
  }
  if (
    (activePicker.value === 'a' ? nextIndex : selectedIndexA.value) != null &&
    (activePicker.value === 'b' ? nextIndex : selectedIndexB.value) != null
  ) {
    rememberPair(
      activePicker.value === 'a' ? nextIndex : selectedIndexA.value,
      activePicker.value === 'b' ? nextIndex : selectedIndexB.value,
    )
  }
  detailsOpen.value = false
  detailsTab.value = 'model'
}

async function swapSigns() {
  if (!hasPair.value) return
  const nextA = selectedIndexB.value
  const nextB = selectedIndexA.value
  selectedIndexA.value = nextA
  selectedIndexB.value = nextB
  rememberPair(nextA, nextB)
  await hapticSelect()
}

async function applyRecentPair(pair) {
  selectedIndexA.value = pair.a
  selectedIndexB.value = pair.b
  detailsOpen.value = false
  detailsTab.value = 'model'
  rememberPair(pair.a, pair.b)
  await hapticSelect()
}

async function onDetailsOpen() {
  if (!hasPair.value) return
  detailsOpen.value = true
  await hapticSelect()
}

async function onDetailsClose() {
  detailsOpen.value = false
  await hapticSelect()
}

async function onDetailsTabClick(tabId) {
  detailsTab.value = tabId
  await hapticSelect()
}

watch([selectedIndexA, selectedIndexB], () => {
  detailsOpen.value = false
  detailsTab.value = 'model'
})

watch(
  () => hasPremiumAccess.value,
  (next) => {
    if (!next) {
      detailsOpen.value = false
    }
  },
)

onMounted(() => {
  setHideBottomNav(true)
  loadRecentPairs()
})

onBeforeUnmount(() => {
  setHideBottomNav(false)
})
</script>

<style scoped lang="scss">
.compat-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  color: #edf2f8;
  background: #050d15;
}

.compat-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      110% 58% at 50% 0%,
      rgba(28, 70, 105, 0.32) 0%,
      rgba(11, 22, 33, 0.14) 42%,
      rgba(5, 13, 21, 0) 72%
    ),
    linear-gradient(180deg, #08131d 0%, #050d15 100%);
}

.compat-content {
  position: relative;
  z-index: 1;
  padding: calc(90px + env(safe-area-inset-top, 0px)) 16px
    calc(86px + env(safe-area-inset-bottom, 0px) + 10px);
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 14px;
}

.compat-topbar {
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  gap: 8px;
  align-items: center;
}

.compat-back {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 245, 252, 0.82);
  display: grid;
  place-items: center;
}

.compat-topbar__text {
  display: grid;
  gap: 3px;
  justify-items: center;
  text-align: center;
}

.compat-topbar__title {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.94);
}

.compat-topbar__subtitle {
  font-size: 11px;
  line-height: 1.35;
  color: rgba(219, 229, 242, 0.48);
  max-width: 280px;
}

.compat-topbar__ghost {
  width: 36px;
}

.compat-shell {
  display: grid;
  gap: 14px;
}

.compat-card {
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background:
    radial-gradient(120% 120% at 100% 0%, rgba(83, 123, 170, 0.16) 0%, rgba(83, 123, 170, 0) 55%),
    linear-gradient(160deg, rgba(12, 20, 31, 0.96), rgba(6, 11, 19, 0.98));
  box-shadow:
    0 18px 38px rgba(1, 6, 12, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
  padding: 16px;
}

.compat-card--hero,
.compat-card--preview {
  display: grid;
  gap: 14px;
}

.compat-card__eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(186, 207, 232, 0.56);
}

.compat-hero-copy {
  display: grid;
  gap: 5px;
}

.compat-hero-copy__title {
  font-size: 24px;
  line-height: 1.1;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.96);
}

.compat-hero-copy__text {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(230, 238, 248, 0.62);
}

.compat-pair-stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 8px;
  align-items: center;
}

.compat-sign-pill {
  min-height: 76px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  padding: 12px 14px;
  display: grid;
  gap: 6px;
  text-align: left;
}

.compat-sign-pill__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(186, 207, 232, 0.5);
}

.compat-sign-pill__value {
  font-size: 16px;
  line-height: 1.2;
  font-weight: 600;
  color: rgba(248, 250, 253, 0.94);
}

.compat-swap {
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(218, 230, 245, 0.86);
  display: grid;
  place-items: center;
}

.compat-swap:disabled {
  opacity: 0.4;
}

.compat-recents {
  display: grid;
  gap: 8px;
}

.compat-recents__label {
  font-size: 11px;
  color: rgba(214, 225, 242, 0.52);
}

.compat-recents__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.compat-recent-chip {
  padding: 8px 11px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(236, 242, 251, 0.8);
  font-size: 12px;
}

.compat-preview-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.compat-preview-top__copy {
  display: grid;
  gap: 4px;
}

.compat-preview-top__title {
  font-size: 22px;
  line-height: 1.1;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.96);
}

.compat-preview-top__line {
  font-size: 12px;
  color: rgba(214, 225, 242, 0.54);
}

.compat-preview-top__meta {
  flex-shrink: 0;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(230, 238, 248, 0.78);
  font-size: 11px;
  font-weight: 600;
}

.compat-scope-note {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  display: grid;
  gap: 6px;
}

.compat-scope-note__title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(245, 248, 252, 0.88);
}

.compat-scope-note__text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(215, 227, 242, 0.64);
}

.compat-score-shell {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 14px;
  align-items: center;
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background:
    radial-gradient(110% 160% at 0% 0%, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0) 54%),
    linear-gradient(135deg, rgba(7, 12, 20, 0.9), rgba(9, 14, 24, 0.98));
}

.compat-overview-badge {
  min-width: 96px;
  padding: 12px 10px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--compat-accent-a), var(--compat-accent-b));
  color: rgba(10, 15, 23, 0.92);
  font-size: 13px;
  line-height: 1.3;
  font-weight: 700;
  text-align: center;
}

.compat-score-copy {
  display: grid;
  gap: 6px;
}

.compat-score-copy__headline {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.94);
}

.compat-score-copy__summary {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(231, 238, 249, 0.8);
}

.compat-score-copy__hint {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(205, 218, 235, 0.56);
}

.compat-facts-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.compat-fact-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
  display: grid;
  gap: 6px;
}

.compat-fact-card__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(186, 207, 232, 0.54);
}

.compat-fact-card__text {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(236, 242, 251, 0.82);
}

.compat-advice-grid {
  display: grid;
  gap: 10px;
}

.compat-advice-card,
.compat-deep-card,
.details-card {
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(255, 255, 255, 0.03);
}

.compat-advice-card {
  padding: 14px;
  display: grid;
  gap: 6px;
}

.compat-advice-card__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(186, 207, 232, 0.54);
}

.compat-advice-card__text {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(236, 242, 251, 0.82);
}

.compat-deep-card {
  padding: 14px;
  display: grid;
  gap: 12px;
}

.compat-deep-card__title {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.94);
}

.compat-deep-card__row {
  display: grid;
  gap: 4px;
}

.compat-deep-card__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(186, 207, 232, 0.54);
}

.compat-deep-card__text {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(236, 242, 251, 0.76);
}

.compat-premium-card {
  border-radius: 16px;
  border: 1px solid rgba(141, 190, 240, 0.16);
  background: rgba(87, 123, 190, 0.1);
  padding: 16px;
  display: grid;
  gap: 12px;
}

.compat-premium-card__badge {
  justify-self: start;
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(186, 207, 247, 0.2);
  background: rgba(87, 123, 190, 0.18);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(238, 245, 255, 0.86);
}

.compat-premium-card__title {
  font-size: 16px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.94);
}

.compat-premium-card__text {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(236, 242, 251, 0.76);
}

.compat-premium-card__model {
  display: grid;
  gap: 8px;
}

.compat-premium-card__model-row {
  display: grid;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.compat-premium-card__model-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(186, 207, 232, 0.54);
}

.compat-premium-card__model-text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(236, 242, 251, 0.82);
}

.compat-premium-card__list {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
  color: rgba(236, 242, 251, 0.76);
  font-size: 12px;
  line-height: 1.5;
}

.compat-premium-card__cta {
  min-height: 46px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #6f9be0, #8d6fe0);
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.compat-details-link,
.oracle-actions__ok {
  min-height: 46px;
  border-radius: 14px;
  border: 1px solid rgba(156, 184, 235, 0.24);
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: #edf2f8;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.compat-details-link {
  width: 100%;
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.07);
}

.compat-empty {
  padding: 32px 14px;
  text-align: center;
  display: grid;
  gap: 10px;
}

.compat-empty__title {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.92);
}

.compat-empty__text {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(214, 225, 242, 0.6);
}

.oracle-actions {
  /* q-dialog__inner is pointer-events:none by default; custom sheet content
     must opt back in or taps fall through to the backdrop (see astro-sheet). */
  pointer-events: auto;
  width: 100vw;
  max-width: 100vw;
  border-radius: 22px 22px 0 0;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 20px);
  background: #050d15;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 -18px 40px rgba(0, 0, 0, 0.36);
  color: #fff;
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
  background: rgba(255, 255, 255, 0.2);
  margin: 0 auto 10px;
}

.sheet-title {
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.76);
  margin-bottom: 8px;
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
  background: linear-gradient(180deg, rgba(5, 13, 21, 0.96), rgba(5, 13, 21, 0));
}

.oracle-wheel::after {
  bottom: 0;
  background: linear-gradient(0deg, rgba(5, 13, 21, 0.96), rgba(5, 13, 21, 0));
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
  height: 220px;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y mandatory;
  z-index: 3;
  scrollbar-width: none;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
}

.oracle-wheel__scroll::-webkit-scrollbar {
  display: none;
}

.oracle-wheel__spacer {
  height: 88px;
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
  transition:
    color 140ms ease,
    transform 140ms ease;
}

.oracle-wheel__item--active {
  color: rgba(244, 238, 227, 0.97);
  transform: scale(1.01);
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

.details-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 8px;
}

.details-tab {
  min-height: 40px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(218, 228, 242, 0.6);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.details-tab--active {
  color: rgba(255, 255, 255, 0.95);
  border-color: rgba(159, 216, 246, 0.25);
  background: rgba(104, 142, 191, 0.16);
}

.details-body {
  min-height: 340px;
  padding-top: 10px;
}

.details-stack {
  display: grid;
  gap: 10px;
}

.details-card {
  padding: 14px;
  display: grid;
  gap: 6px;
}

.details-card__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(186, 207, 232, 0.54);
}

.details-card__title {
  font-size: 15px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.94);
}

.details-card__text,
.details-list {
  font-size: 13px;
  line-height: 1.55;
  color: rgba(236, 242, 251, 0.74);
}

.details-list {
  margin: 0;
  padding-left: 18px;
}

.details-list li + li {
  margin-top: 4px;
}

@media (max-width: 380px) {
  .compat-facts-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-height: 760px) {
  .compat-content {
    gap: 12px;
  }

  .compat-hero-copy__title,
  .compat-preview-top__title {
    font-size: 20px;
  }

  .compat-sign-pill {
    min-height: 68px;
  }
}

@media (hover: hover) {
  .compat-sign-pill:hover,
  .compat-recent-chip:hover,
  .compat-swap:hover,
  .compat-details-link:hover,
  .oracle-actions__ok:hover {
    border-color: rgba(255, 255, 255, 0.12);
  }
}
</style>
