<template>
  <q-page class="compat-page">
    <div class="compat-bg" aria-hidden="true"></div>

    <section class="compat-content">
      <header class="compat-hero">
        <button type="button" class="compat-back" :aria-label="tt('common.close')" @click="onBack">
          <q-icon name="chevron_left" size="20px" />
        </button>
        <div class="compat-hero__text">
          <div class="compat-title">{{ tt('compatibilityPage.title') }}</div>
          <div class="compat-kicker">{{ tt('compatibilityPage.subtitle') }}</div>
        </div>
      </header>

      <!-- ───────────────── INPUT ───────────────── -->
      <div v-if="!result" class="compat-input">
        <div class="compat-people">
          <button
            type="button"
            class="compat-person"
            :class="{ 'compat-person--filled': chartA }"
            @click="openDob('a')"
          >
            <span class="compat-person__role">{{ tt('compatibilityPage.youLabel') }}</span>
            <span v-if="chartA" class="compat-person__glyph">{{ signGlyph(chartA.sun) }}</span>
            <span v-else class="compat-person__add" aria-hidden="true"><q-icon name="add" size="24px" /></span>
            <span class="compat-person__sign" :class="{ 'compat-person__sign--empty': !chartA }">
              {{ chartA ? tt(`zodiac.${chartA.sun}`) : tt('compatibilityPage.dobPlaceholder') }}
            </span>
            <span v-if="chartA" class="compat-person__planets">{{ planetsLine(chartA) }}</span>
            <span v-else class="compat-person__hint">{{ tt('compatibilityPage.tapToSet') }}</span>
          </button>

          <div class="compat-amp" aria-hidden="true"><span class="compat-amp__node"></span></div>

          <button
            type="button"
            class="compat-person"
            :class="{ 'compat-person--filled': chartB }"
            @click="openDob('b')"
          >
            <span class="compat-person__role">{{ tt('compatibilityPage.partnerLabel') }}</span>
            <span v-if="chartB" class="compat-person__glyph">{{ signGlyph(chartB.sun) }}</span>
            <span v-else class="compat-person__add" aria-hidden="true"><q-icon name="add" size="24px" /></span>
            <span class="compat-person__sign" :class="{ 'compat-person__sign--empty': !chartB }">
              {{ chartB ? tt(`zodiac.${chartB.sun}`) : tt('compatibilityPage.dobPlaceholder') }}
            </span>
            <span v-if="chartB" class="compat-person__planets">{{ planetsLine(chartB) }}</span>
            <span v-else class="compat-person__hint">{{ tt('compatibilityPage.tapToSet') }}</span>
          </button>
        </div>

        <div class="compat-reltypes" role="group" :aria-label="tt('compatibilityPage.relTypeLabel')">
          <button
            v-for="rt in relTypes"
            :key="rt.key"
            type="button"
            class="compat-reltype"
            :class="{ active: relationshipType === rt.key }"
            :aria-pressed="relationshipType === rt.key"
            @click="setRelType(rt.key)"
          >
            <q-icon :name="rt.icon" size="20px" class="compat-reltype__icon" />
            <span>{{ tt(`compatibilityPage.relTypes.${rt.key}`) }}</span>
          </button>
        </div>

        <button
          type="button"
          class="compat-reveal"
          :disabled="!canReveal"
          @click="reveal"
        >
          {{ tt('compatibilityPage.reveal') }}
        </button>
        <div class="compat-reveal__hint">{{ tt('compatibilityPage.revealHint') }}</div>

        <div v-if="recentPairs.length" class="compat-recent">
          <div class="compat-recent__title">{{ tt('compatibilityPage.recentTitle') }}</div>
          <div class="compat-recent__row">
            <button
              v-for="(pair, i) in recentPairs"
              :key="i"
              type="button"
              class="compat-recent__chip"
              @click="loadRecent(pair)"
            >
              {{ tt(`zodiac.${pair.a.sun}`) }} &amp; {{ tt(`zodiac.${pair.b.sun}`) }}
            </button>
          </div>
        </div>
      </div>

      <!-- ───────────────── RESULT ───────────────── -->
      <div v-else class="compat-result">
        <div class="compat-scorecard">
          <div class="compat-pair">
            <div class="compat-pair__person">
              <div class="compat-pair__glyph">{{ signGlyph(result.charts.a.sun) }}</div>
              <div class="compat-pair__name">{{ tt(`zodiac.${result.charts.a.sun}`) }}</div>
              <div class="compat-pair__planets">
                <span v-for="p in chartPlanets(result.charts.a)" :key="p.key" class="compat-pair__planet">
                  <span class="compat-pair__planet-body">{{ p.glyph }}</span>{{ signGlyph(p.sign) }}
                </span>
              </div>
            </div>
            <div class="compat-pair__link" :class="`compat-pair__link--${result.tier}`" aria-hidden="true"></div>
            <div class="compat-pair__person">
              <div class="compat-pair__glyph">{{ signGlyph(result.charts.b.sun) }}</div>
              <div class="compat-pair__name">{{ tt(`zodiac.${result.charts.b.sun}`) }}</div>
              <div class="compat-pair__planets">
                <span v-for="p in chartPlanets(result.charts.b)" :key="p.key" class="compat-pair__planet">
                  <span class="compat-pair__planet-body">{{ p.glyph }}</span>{{ signGlyph(p.sign) }}
                </span>
              </div>
            </div>
          </div>

          <div class="compat-ring">
            <svg viewBox="0 0 120 120" class="compat-ring__svg" aria-hidden="true">
              <circle class="compat-ring__track" cx="60" cy="60" r="52" />
              <circle
                class="compat-ring__fill"
                :class="`compat-ring__fill--${result.tier}`"
                cx="60" cy="60" r="52"
                :stroke-dasharray="ringCirc"
                :stroke-dashoffset="ringOffset"
              />
            </svg>
            <div class="compat-ring__center">
              <div class="compat-ring__score">{{ displayScore }}</div>
              <div class="compat-ring__pct">{{ tt('compatibilityPage.scoreLabel') }}</div>
            </div>
          </div>

          <div class="compat-tier" :class="`compat-tier--${result.tier}`">{{ tt(`compatibilityPage.tiers.${result.tier}.title`) }}</div>
          <div class="compat-tier__headline">{{ tt(`compatibilityPage.tiers.${result.tier}.headline`) }}</div>
        </div>

        <div v-if="hasPremiumAccess && (aiReading || aiLoading)" class="compat-overview">
          <p v-if="aiReading" class="compat-overview__text">{{ aiReading.overview }}</p>
          <div v-else class="compat-overview__loading">
            <q-spinner-dots size="22px" color="rgba(169,211,240,0.8)" />
            <span>{{ tt('compatibilityPage.aiLoading') }}</span>
          </div>
        </div>

        <div v-if="result.keyConnections && result.keyConnections.length" class="compat-connections">
          <div class="compat-section-title">{{ tt('compatibilityPage.connectionsTitle') }}</div>
          <div class="compat-section-hint">{{ tt('compatibilityPage.connectionsHint') }}</div>
          <div
            v-for="(conn, i) in result.keyConnections"
            :key="`conn-${i}`"
            class="compat-conn"
            :class="`compat-conn--${conn.harmony}`"
          >
            <div class="compat-conn__glyphs" aria-hidden="true">
              <span class="compat-conn__planet">{{ planetGlyph(conn.pa) }}</span>
              <span class="compat-conn__aspect">{{ aspectGlyph(conn.type) }}</span>
              <span class="compat-conn__planet">{{ planetGlyph(conn.pb) }}</span>
            </div>
            <div class="compat-conn__body">
              <div class="compat-conn__title">
                {{ connTitle(conn) }}
                <span class="compat-conn__orb">{{ conn.orb }}°</span>
              </div>
              <div class="compat-conn__meaning">{{ connMeaning(conn) }}</div>
            </div>
          </div>
        </div>

        <div class="compat-dims">
          <div
            v-for="dim in result.dimensions"
            :key="dim.key"
            class="compat-dim"
            :class="{ 'compat-dim--locked': isDimLocked(dim) }"
          >
            <div class="compat-dim__head">
              <q-icon :name="dimIcon(dim.key)" size="17px" class="compat-dim__icon" :class="`compat-dim__icon--${dim.level}`" />
              <span class="compat-dim__label">{{ tt(`compatibilityPage.dim.${dim.key}.label`) }}</span>
              <span class="compat-dim__aspect">{{ aspectLabel(dim.aspect) }}</span>
              <span class="compat-dim__score">{{ dim.score }}</span>
            </div>
            <div class="compat-dim__bar">
              <span class="compat-dim__bar-fill" :class="`compat-dim__bar-fill--${dim.level}`" :style="{ width: dim.score + '%' }"></span>
            </div>
            <p v-if="!isDimLocked(dim)" class="compat-dim__text">
              {{ dimText(dim) }}
            </p>
            <p v-else class="compat-dim__text compat-dim__text--locked">
              {{ tt('compatibilityPage.lockText') }}
            </p>
          </div>
        </div>

        <div v-if="aiReading" class="compat-ai-extra">
          <div class="compat-ai-block">
            <div class="compat-ai-block__label">{{ tt('compatibilityPage.dynamicLabel') }}</div>
            <p class="compat-ai-block__text">{{ aiReading.dynamic }}</p>
          </div>
          <div class="compat-ai-block compat-ai-block--advice">
            <div class="compat-ai-block__label">{{ tt('compatibilityPage.adviceLabel') }}</div>
            <p class="compat-ai-block__text">{{ aiReading.advice }}</p>
          </div>
        </div>

        <section v-if="!hasPremiumAccess" class="compat-unlock">
          <div class="compat-unlock__badge">{{ tt('premiumAccess.badge') }}</div>
          <div class="compat-unlock__title">{{ tt('premiumAccess.compatibility.title') }}</div>
          <p class="compat-unlock__text">{{ tt('premiumAccess.compatibility.text') }}</p>
          <div class="compat-unlock__model">
            <div v-for="row in compatAccessModelRows" :key="row.key" class="compat-unlock__row">
              <span class="compat-unlock__row-label">{{ row.label }}</span>
              <span class="compat-unlock__row-text">{{ row.text }}</span>
            </div>
          </div>
          <button type="button" class="compat-unlock__cta" @click="goPremium">
            {{ tt('premiumAccess.cta') }}
          </button>
        </section>

        <div class="compat-actions">
          <button type="button" class="compat-action compat-action--secondary" @click="shareResult">
            <q-icon name="share" size="16px" />
            <span>{{ tt('compatibilityPage.shareCta') }}</span>
          </button>
          <button type="button" class="compat-action compat-action--primary" @click="resetPairing">
            <q-icon name="refresh" size="16px" />
            <span>{{ tt('compatibilityPage.newPairing') }}</span>
          </button>
        </div>

        <div class="compat-disclaimer">{{ tt('compatibilityPage.disclaimer') }}</div>
      </div>
    </section>

    <!-- DOB wheel picker (day / month / year — one screen) -->
    <q-dialog v-model="dobSheet" position="bottom">
      <div class="compat-dobsheet">
        <div class="compat-dobsheet__handle" aria-hidden="true"></div>
        <div class="compat-dobsheet__title">
          {{ activeDob === 'a' ? tt('compatibilityPage.youLabel') : tt('compatibilityPage.partnerLabel') }}
        </div>

        <div class="compat-wheel-grid">
          <div class="compat-wheel">
            <div class="compat-wheel__window" aria-hidden="true"></div>
            <div ref="dayWheelRef" class="compat-wheel__scroll" @scroll.passive="onWheelScroll('day')">
              <div class="compat-wheel__spacer"></div>
              <button
                v-for="(day, index) in dayOptions"
                :key="`d-${day}`"
                type="button"
                class="compat-wheel__item"
                :class="{ 'compat-wheel__item--active': index === selDay }"
                @click="onWheelTap('day', index)"
              >{{ String(day).padStart(2, '0') }}</button>
              <div class="compat-wheel__spacer"></div>
            </div>
          </div>

          <div class="compat-wheel">
            <div class="compat-wheel__window" aria-hidden="true"></div>
            <div ref="monthWheelRef" class="compat-wheel__scroll" @scroll.passive="onWheelScroll('month')">
              <div class="compat-wheel__spacer"></div>
              <button
                v-for="(month, index) in monthOptions"
                :key="`m-${month.value}`"
                type="button"
                class="compat-wheel__item"
                :class="{ 'compat-wheel__item--active': index === selMonth }"
                @click="onWheelTap('month', index)"
              >{{ month.label }}</button>
              <div class="compat-wheel__spacer"></div>
            </div>
          </div>

          <div class="compat-wheel">
            <div class="compat-wheel__window" aria-hidden="true"></div>
            <div ref="yearWheelRef" class="compat-wheel__scroll" @scroll.passive="onWheelScroll('year')">
              <div class="compat-wheel__spacer"></div>
              <button
                v-for="(year, index) in yearOptions"
                :key="`y-${year}`"
                type="button"
                class="compat-wheel__item"
                :class="{ 'compat-wheel__item--active': index === selYear }"
                @click="onWheelTap('year', index)"
              >{{ year }}</button>
              <div class="compat-wheel__spacer"></div>
            </div>
          </div>
        </div>

        <button type="button" class="compat-dobsheet__confirm" @click="confirmDob">
          {{ tt('common.save') }}
        </button>
      </div>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Preferences } from '@capacitor/preferences'
import { usePremiumAccess } from 'src/stores/premiumAccess'
import { analytics } from 'src/services/analytics'
import { PAYWALL_ENTRY_POINTS, CONTENT_SHARE_EVENTS } from 'src/constants/analyticsEvents'
import { selectAppUser, invokeFunction } from 'src/services/supabaseNative'
import { useAuthStore } from 'stores/authStore.js'
import { computeChart, computeCompatibility } from 'src/helpers/compatibilityCore.js'

const router = useRouter()
const authStore = useAuthStore()
const { hasPremiumAccess } = usePremiumAccess()

const locale = computed(() =>
  (currentLocale.value || 'en').toLowerCase().startsWith('uk') ? 'uk' : 'en',
)
const tt = (key) => t(locale.value, key)

const RECENT_PAIRS_KEY = 'arcana_compatibility_recent_pairs_v1'
const PROFILE_CACHE_KEY = 'profile_cache_v1'

const relTypes = [
  { key: 'romantic', icon: 'favorite' },
  { key: 'friend', icon: 'group' },
  { key: 'family', icon: 'diversity_1' },
  { key: 'colleague', icon: 'work_outline' },
]

const dobA = ref('')
const dobB = ref('')
const relationshipType = ref('romantic')
const result = ref(null)
const recentPairs = ref([])
const displayScore = ref(0)

// AI narrative (premium): the deterministic synastry is the source of truth; the
// edge function turns those real facts into a warm, personal reading.
const aiReading = ref(null)
const aiLoading = ref(false)
const aiError = ref(false)
let aiRequestId = 0

let scoreRaf = 0
function animateScore(target) {
  if (typeof requestAnimationFrame !== 'function') {
    displayScore.value = target
    return
  }
  cancelAnimationFrame(scoreRaf)
  const from = displayScore.value
  const start = performance.now()
  const dur = 750
  const step = (now) => {
    const p = Math.min(1, (now - start) / dur)
    const eased = 1 - Math.pow(1 - p, 3) // ease-out cubic
    displayScore.value = Math.round(from + (target - from) * eased)
    if (p < 1) scoreRaf = requestAnimationFrame(step)
  }
  scoreRaf = requestAnimationFrame(step)
}

const dobSheet = ref(false)
const activeDob = ref('a')

// iOS-style day/month/year wheel picker (same pattern the app already uses for
// birth date in Account / Sign-up — one screen, scroll each column).
const ITEM_H = 44
const dayOptions = ref([])
const monthOptions = ref([])
const yearOptions = ref([])
const selDay = ref(0)
const selMonth = ref(0)
const selYear = ref(0)
const dayWheelRef = ref(null)
const monthWheelRef = ref(null)
const yearWheelRef = ref(null)
let lastWheelHaptic = 0

const chartA = computed(() => computeChart(dobA.value))
const chartB = computed(() => computeChart(dobB.value))
const canReveal = computed(() => Boolean(chartA.value && chartB.value))

const ringCirc = computed(() => 2 * Math.PI * 52)
const ringOffset = computed(() => ringCirc.value * (1 - displayScore.value / 100))

// Free vs Premium rows, using the SHARED premium copy model (kept consistent
// across SavedReadings / Horoscope / paywall — see premiumAccess.model.*).
const compatAccessModelRows = computed(() => [
  { key: 'free', label: tt('premiumAccess.model.labels.free'), text: tt('premiumAccess.model.compatibility.free') },
  { key: 'premium', label: tt('premiumAccess.model.labels.premium'), text: tt('premiumAccess.model.compatibility.premium') },
  { key: 'purchase', label: tt('premiumAccess.model.labels.purchase'), text: tt('premiumAccess.model.compatibility.purchase') },
])

// Traditional zodiac glyphs (astronomical symbols, not sparkle/AI iconography).
const SIGN_GLYPH = {
  aries: '♈', taurus: '♉', gemini: '♊', cancer: '♋',
  leo: '♌', virgo: '♍', libra: '♎', scorpio: '♏',
  sagittarius: '♐', capricorn: '♑', aquarius: '♒', pisces: '♓',
}

// Planet glyphs for the "big four" each chart contributes.
const PLANET_GLYPH = { sun: '☉', moon: '☾', mercury: '☿', venus: '♀', mars: '♂' }
const ASPECT_GLYPH = { conjunction: '☌', sextile: '⚹', square: '□', trine: '△', opposition: '☍' }

// Material icon per dimension (premium, not emoji/sparkle).
const DIM_ICON = {
  attraction: 'favorite',
  emotional: 'nightlight',
  communication: 'forum',
  values: 'explore',
  energy: 'bolt',
  warmth: 'volunteer_activism',
  drive: 'trending_up',
}

// Append U+FE0E (text variation selector) so the zodiac/planet symbols render as
// elegant monochrome glyphs, not colored emoji tiles, in the WebKit webview.
const TEXT_VS = '︎'
const signGlyph = (sign) => (SIGN_GLYPH[sign] || '·') + TEXT_VS
const planetGlyph = (p) => (PLANET_GLYPH[p] || '') + TEXT_VS
const aspectGlyph = (t) => (ASPECT_GLYPH[t] || '') + TEXT_VS
const dimIcon = (key) => DIM_ICON[key] || 'circle'
const aspectLabel = (aspect) => tt(`compatibilityPage.aspects.${aspect}`)

// Key-connection copy: "Venus Trine Mars" + a grounded, pair-specific meaning.
const connTitle = (c) =>
  `${tt(`compatibilityPage.planets.${c.pa}`)} ${aspectLabel(c.type)} ${tt(`compatibilityPage.planets.${c.pb}`)}`
const connMeaning = (c) =>
  `${tt(`compatibilityPage.pairThemes.${c.theme}`)} ${tt(`compatibilityPage.connFraming.${c.harmony}`)}`

// Premium shows the AI text for a dimension when available; otherwise the
// grounded deterministic line.
function dimText(dim) {
  const ai = aiReading.value?.dimensions?.find((d) => d.key === dim.key)?.text
  return ai || tt(`compatibilityPage.dim.${dim.key}.${dim.level}`)
}

function chartPlanets(chart) {
  if (!chart) return []
  return ['sun', 'moon', 'venus', 'mars'].map((key) => ({
    key,
    glyph: (PLANET_GLYPH[key] || '') + TEXT_VS,
    sign: chart[key],
    label: tt(`zodiac.${chart[key]}`),
  }))
}

function planetsLine(chart) {
  if (!chart) return ''
  return `${tt('compatibilityPage.sunShort')} ${tt(`zodiac.${chart.sun}`)} · ${tt('compatibilityPage.moonShort')} ${tt(`zodiac.${chart.moon}`)}`
}

async function hapticSelect() {
  if (!Capacitor.isNativePlatform?.()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // haptics unavailable — ignore
  }
}

function setRelType(key) {
  relationshipType.value = key
  void hapticSelect()
  if (result.value) {
    // Re-score live if a result is already shown.
    result.value = computeCompatibility(result.value.charts.a, result.value.charts.b, { relationshipType: key })
    animateScore(result.value.overallScore)
    void requestAiReading(result.value)
  }
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

function buildDateOptions() {
  const currentYear = new Date().getFullYear()
  const years = []
  for (let y = currentYear; y >= currentYear - 120; y -= 1) years.push(y)
  yearOptions.value = years
  monthOptions.value = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Intl.DateTimeFormat(locale.value === 'uk' ? 'uk-UA' : 'en-US', { month: 'short' }).format(new Date(2000, i, 1)),
  }))
  dayOptions.value = Array.from({ length: 31 }, (_, i) => i + 1)
}

function syncSelectionFromISO(iso) {
  // Default to a plausible adult birth year (~28y ago) when there is no value,
  // so the year doesn't sit on the current year.
  const currentYear = new Date().getFullYear()
  let year = currentYear - 28
  let month = 6
  let day = 15
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  if (m) { year = +m[1]; month = +m[2]; day = +m[3] }
  selYear.value = Math.max(0, yearOptions.value.findIndex((y) => y === year))
  selMonth.value = Math.max(0, monthOptions.value.findIndex((mm) => mm.value === month))
  day = Math.min(day, getDaysInMonth(year, month))
  selDay.value = Math.max(0, dayOptions.value.findIndex((d) => d === day))
}

function scrollWheel(el, index, smooth) {
  if (!el) return
  el.scrollTo({ top: index * ITEM_H, behavior: smooth ? 'smooth' : 'auto' })
}

function wheelHapticThrottled() {
  const now = Date.now()
  if (now - lastWheelHaptic < 80) return
  lastWheelHaptic = now
  void hapticSelect()
}

function syncDayForMonth() {
  const year = yearOptions.value[selYear.value] || new Date().getFullYear()
  const month = monthOptions.value[selMonth.value]?.value || 1
  const maxDay = getDaysInMonth(year, month)
  if (dayOptions.value[selDay.value] > maxDay) {
    selDay.value = maxDay - 1
    scrollWheel(dayWheelRef.value, selDay.value, true)
  }
}

function onWheelScroll(which) {
  const el = which === 'day' ? dayWheelRef.value : which === 'month' ? monthWheelRef.value : yearWheelRef.value
  if (!el) return
  const len = which === 'day' ? dayOptions.value.length : which === 'month' ? monthOptions.value.length : yearOptions.value.length
  const idx = Math.min(len - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)))
  const cur = which === 'day' ? selDay.value : which === 'month' ? selMonth.value : selYear.value
  if (idx === cur) return
  if (which === 'day') selDay.value = idx
  else if (which === 'month') { selMonth.value = idx; syncDayForMonth() }
  else { selYear.value = idx; syncDayForMonth() }
  wheelHapticThrottled()
}

function onWheelTap(which, index) {
  if (which === 'day') { selDay.value = index; scrollWheel(dayWheelRef.value, index, true) }
  else if (which === 'month') { selMonth.value = index; syncDayForMonth(); scrollWheel(monthWheelRef.value, index, true) }
  else { selYear.value = index; syncDayForMonth(); scrollWheel(yearWheelRef.value, index, true) }
  void hapticSelect()
}

function openDob(which) {
  activeDob.value = which
  buildDateOptions()
  syncSelectionFromISO(which === 'a' ? dobA.value : dobB.value)
  dobSheet.value = true
  void hapticSelect()
  nextTick(() => {
    scrollWheel(dayWheelRef.value, selDay.value, false)
    scrollWheel(monthWheelRef.value, selMonth.value, false)
    scrollWheel(yearWheelRef.value, selYear.value, false)
  })
}

function confirmDob() {
  const day = dayOptions.value[selDay.value] || 1
  const month = monthOptions.value[selMonth.value]?.value || 1
  const year = yearOptions.value[selYear.value] || (new Date().getFullYear() - 28)
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  if (activeDob.value === 'a') dobA.value = iso
  else dobB.value = iso
  dobSheet.value = false
  void hapticSelect()
}

const isDimLocked = (dim) => !hasPremiumAccess.value && dim.key !== result.value?.teaserKey

function pickSigns(c) {
  return { sun: c?.sun, moon: c?.moon, mercury: c?.mercury, venus: c?.venus, mars: c?.mars }
}

// Premium: send the real deterministic synastry facts to the edge function and
// render the warm, personal narrative it returns.
async function requestAiReading(res) {
  if (!hasPremiumAccess.value || !res) return
  const reqId = ++aiRequestId
  aiReading.value = null
  aiError.value = false
  aiLoading.value = true
  try {
    const payload = {
      relationshipType: res.relationshipType,
      locale: locale.value,
      overallScore: res.overallScore,
      tier: res.tier,
      a: pickSigns(res.charts.a),
      b: pickSigns(res.charts.b),
      dimensions: res.dimensions.map((d) => ({ key: d.key, score: d.score, aspect: d.aspect })),
      connections: (res.keyConnections || []).map((c) => ({ pa: c.pa, pb: c.pb, type: c.type, harmony: c.harmony, orb: c.orb })),
    }
    const { data, error } = await invokeFunction('compatibility', payload, 30000)
    if (reqId !== aiRequestId) return
    if (error || !data?.ok) throw new Error(data?.error || 'request_failed')
    aiReading.value = data.reading
  } catch (e) {
    if (reqId !== aiRequestId) return
    aiError.value = true
    console.warn('[compatibility] AI reading failed', e)
  } finally {
    if (reqId === aiRequestId) aiLoading.value = false
  }
}

function reveal() {
  if (!canReveal.value) return
  const res = computeCompatibility(chartA.value, chartB.value, { relationshipType: relationshipType.value })
  if (!res) return
  result.value = res
  displayScore.value = 0
  animateScore(res.overallScore)
  void hapticSelect()
  void analytics.logEvent('compatibility_reveal', {
    tier: res.tier,
    score: res.overallScore,
    relationshipType: res.relationshipType,
  })
  saveRecent(res)
  void requestAiReading(res)
}

function resetPairing() {
  result.value = null
  displayScore.value = 0
  aiReading.value = null
  aiError.value = false
  aiLoading.value = false
  aiRequestId += 1
  void hapticSelect()
}

function loadRecent(pair) {
  dobA.value = pair.dobA || ''
  dobB.value = pair.dobB || ''
  relationshipType.value = pair.relationshipType || 'romantic'
  if (canReveal.value) reveal()
}

async function goPremium() {
  await hapticSelect()
  const point = PAYWALL_ENTRY_POINTS.compatibilityLock
  void analytics.logEvent(point.event, { source: point.source, entry: point.entry })
  router.push({ name: 'premium', query: { source: point.source, entry: point.entry } }).catch(() => {})
}

async function shareResult() {
  if (!result.value) return
  await hapticSelect()
  const r = result.value
  void analytics.logEvent(CONTENT_SHARE_EVENTS.compatibilityShare, {
    tier: r.tier,
    score: r.overallScore,
    relationshipType: r.relationshipType,
  })
  const lines = [
    `${tt(`zodiac.${r.charts.a.sun}`)} & ${tt(`zodiac.${r.charts.b.sun}`)}`,
    `${tt('compatibilityPage.scoreLabel')}: ${r.overallScore}/100 — ${tt(`compatibilityPage.tiers.${r.tier}.title`)}`,
    tt(`compatibilityPage.tiers.${r.tier}.headline`),
    '',
    tt('shareSubInfo'),
  ]
  try {
    await Share.share({ title: tt('compatibilityPage.title'), text: lines.join('\n') })
  } catch {
    // share cancelled — ignore
  }
}

function onBack() {
  void hapticSelect()
  router.back()
}

/* recent pairs persistence */
async function loadRecentPairs() {
  try {
    const { value } = await Preferences.get({ key: RECENT_PAIRS_KEY })
    const parsed = value ? JSON.parse(value) : []
    if (Array.isArray(parsed)) recentPairs.value = parsed.slice(0, 4)
  } catch {
    recentPairs.value = []
  }
}

async function saveRecent(res) {
  const entry = {
    dobA: dobA.value,
    dobB: dobB.value,
    relationshipType: res.relationshipType,
    a: { sun: res.charts.a.sun },
    b: { sun: res.charts.b.sun },
  }
  const next = [entry, ...recentPairs.value.filter((p) => !(p.dobA === entry.dobA && p.dobB === entry.dobB))].slice(0, 4)
  recentPairs.value = next
  try {
    await Preferences.set({ key: RECENT_PAIRS_KEY, value: JSON.stringify(next) })
  } catch {
    // storage unavailable — ignore
  }
}

/* profile auto-fill for "You" */
async function loadProfileDob() {
  let dob = ''
  try {
    const { value } = await Preferences.get({ key: PROFILE_CACHE_KEY })
    if (value) dob = String(JSON.parse(value)?.date_of_birth || '').trim()
  } catch {
    // ignore cache miss
  }
  if (!dob) {
    try {
      let userId = authStore.state.user?.id || ''
      if (!userId) {
        await authStore.syncSession({ refresh: false })
        userId = authStore.state.user?.id || ''
      }
      if (userId) {
        const { data } = await selectAppUser(userId, 6000, 'date_of_birth,zodiac_sign')
        dob = String(data?.date_of_birth || '').trim()
      }
    } catch {
      // ignore profile load failure
    }
  }
  // Normalize DD.MM.YYYY → YYYY-MM-DD if needed.
  const dot = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(dob)
  if (dot) dob = `${dot[3]}-${dot[2]}-${dot[1]}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(dob) && !dobA.value) dobA.value = dob
}

function setHideBottomNav(enabled) {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('hide-bottom-nav', enabled)
}

onMounted(() => {
  setHideBottomNav(true)
  void loadRecentPairs()
  void loadProfileDob()
})

onBeforeUnmount(() => {
  setHideBottomNav(false)
})
</script>

<style scoped lang="scss">
.compat-page {
  min-height: 100vh;
  background: #060910;
  color: #fff;
}

.compat-bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(1px 1px at 18% 16%, rgba(255, 255, 255, 0.5), transparent 60%),
    radial-gradient(1px 1px at 67% 11%, rgba(255, 255, 255, 0.32), transparent 60%),
    radial-gradient(1.6px 1.6px at 83% 28%, rgba(180, 210, 245, 0.55), transparent 60%),
    radial-gradient(1px 1px at 37% 24%, rgba(255, 255, 255, 0.3), transparent 60%),
    radial-gradient(1px 1px at 11% 38%, rgba(255, 255, 255, 0.22), transparent 60%),
    radial-gradient(1.4px 1.4px at 90% 52%, rgba(200, 180, 245, 0.4), transparent 60%),
    radial-gradient(1px 1px at 52% 44%, rgba(255, 255, 255, 0.18), transparent 60%),
    radial-gradient(120% 65% at 50% -8%, rgba(120, 150, 230, 0.16) 0%, transparent 55%),
    radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 42%, #050d15 100%);
  z-index: 0;
}

.compat-content {
  position: relative;
  z-index: 1;
  max-width: 520px;
  margin: 0 auto;
  padding: calc(90px + env(safe-area-inset-top)) 18px calc(40px + env(safe-area-inset-bottom));
}

/* ── hero (centered, with an absolutely-placed back button — matches Daily) ── */
.compat-hero {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 4px;
  margin-bottom: 26px;
  padding: 0 44px;
}

.compat-back {
  position: absolute;
  left: 0;
  top: 2px;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 14, 22, 0.7);
  color: rgba(214, 225, 242, 0.8);
  display: grid;
  place-items: center;
}

.compat-hero__text {
  text-align: center;
  display: grid;
  gap: 5px;
  justify-items: center;
}

.compat-title {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(235, 242, 255, 0.96);
}

.compat-kicker {
  font-size: 12.5px;
  line-height: 1.45;
  color: rgba(190, 212, 235, 0.6);
  max-width: 300px;
}

/* ── input: people ── */
.compat-people {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 22px;
}

.compat-person {
  position: relative;
  flex: 1;
  min-height: 168px;
  border-radius: 22px;
  border: 1px solid rgba(159, 216, 246, 0.12);
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(141, 190, 240, 0.07), transparent 70%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.012));
  padding: 18px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  overflow: hidden;
  transition: border-color 160ms ease, transform 120ms ease, background 200ms ease;
}

.compat-person:active {
  transform: scale(0.985);
}

.compat-person--filled {
  border-color: rgba(141, 190, 240, 0.42);
  background:
    radial-gradient(120% 80% at 50% 0%, rgba(141, 190, 240, 0.18), transparent 72%),
    linear-gradient(180deg, rgba(141, 190, 240, 0.08), rgba(141, 190, 240, 0.02));
}

.compat-person__role {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.4px;
  color: rgba(190, 212, 235, 0.6);
}

.compat-person__glyph {
  font-size: 46px;
  line-height: 1;
  color: #d3e6f8;
  text-shadow: 0 0 22px rgba(141, 190, 240, 0.5);
  margin: 2px 0;
}

.compat-person__add {
  width: 48px;
  height: 48px;
  margin: 2px 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: rgba(190, 212, 235, 0.65);
  border: 1px dashed rgba(159, 216, 246, 0.3);
}

.compat-person__sign {
  font-size: 19px;
  font-weight: 600;
  /* Native <button> does not inherit page color, so set it explicitly. */
  color: rgba(235, 242, 255, 0.96);
}

.compat-person__sign--empty {
  color: rgba(214, 232, 246, 0.62);
  font-weight: 500;
  font-size: 15px;
}

.compat-person__planets {
  font-size: 11.5px;
  color: rgba(190, 212, 235, 0.66);
  letter-spacing: 0.2px;
}

.compat-person__hint {
  font-size: 11.5px;
  color: rgba(190, 212, 235, 0.45);
}

.compat-amp {
  align-self: center;
  display: grid;
  place-items: center;
  width: 22px;
}

.compat-amp__node {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #8dbef0;
  box-shadow: 0 0 14px rgba(141, 190, 240, 0.9);
}

.compat-amp__node::before,
.compat-amp__node::after {
  content: '';
  position: absolute;
  width: 7px;
  height: 1px;
  top: 50%;
  background: linear-gradient(90deg, rgba(141, 190, 240, 0.55), transparent);
}

.compat-amp__node::before { right: 100%; transform: scaleX(-1); }
.compat-amp__node::after { left: 100%; }

/* ── relationship types ── */
.compat-reltypes {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 24px;
}

.compat-reltype {
  border-radius: 15px;
  border: 1px solid rgba(159, 216, 246, 0.12);
  background: rgba(7, 14, 22, 0.4);
  color: rgba(214, 232, 246, 0.66);
  padding: 12px 4px;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  transition: border-color 160ms ease, background 160ms ease, color 160ms ease;
}

.compat-reltype__icon {
  color: rgba(190, 212, 235, 0.55);
  transition: color 160ms ease;
}

.compat-reltype.active {
  border-color: rgba(141, 190, 240, 0.5);
  background: rgba(141, 190, 240, 0.14);
  color: #fff;
}

.compat-reltype.active .compat-reltype__icon {
  color: #a9d3f0;
}

/* ── reveal ── */
.compat-reveal {
  width: 100%;
  height: 54px;
  border-radius: 16px;
  border: none;
  font-size: 16px;
  font-weight: 600;
  color: #06131f;
  background: linear-gradient(180deg, #a9d3f0, #7fb0e8);
  box-shadow: 0 10px 24px rgba(127, 176, 232, 0.28);
  transition: transform 120ms ease, opacity 160ms ease;
}

.compat-reveal:active {
  transform: translateY(1px);
}

.compat-reveal:disabled {
  opacity: 0.4;
  box-shadow: none;
}

.compat-reveal__hint {
  text-align: center;
  font-size: 12px;
  color: rgba(190, 212, 235, 0.5);
  margin-top: 10px;
}

/* ── recent ── */
.compat-recent {
  margin-top: 26px;
}

.compat-recent__title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(190, 212, 235, 0.5);
  margin-bottom: 10px;
}

.compat-recent__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.compat-recent__chip {
  border-radius: 999px;
  border: 1px solid rgba(159, 216, 246, 0.14);
  background: rgba(7, 14, 22, 0.42);
  color: rgba(214, 232, 246, 0.82);
  padding: 8px 14px;
  font-size: 13px;
}

/* ── result: scorecard ── */
.compat-scorecard {
  text-align: center;
  padding: 8px 0 4px;
}

.compat-pair {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 12px;
  margin-top: 4px;
}

.compat-pair__person {
  flex: 1;
  max-width: 132px;
  text-align: center;
}

.compat-pair__glyph {
  font-size: 36px;
  line-height: 1;
  color: #d3e6f8;
  text-shadow: 0 0 20px rgba(141, 190, 240, 0.45);
}

.compat-pair__name {
  font-size: 14px;
  font-weight: 600;
  margin-top: 7px;
}

.compat-pair__planets {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 9px;
}

.compat-pair__planet {
  font-size: 12px;
  color: rgba(190, 212, 235, 0.62);
  letter-spacing: 0.3px;
}

.compat-pair__planet-body {
  color: rgba(216, 233, 247, 0.92);
}

.compat-pair__link {
  align-self: center;
  margin-top: 22px;
  width: 30px;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(141, 190, 240, 0.55), transparent);
  position: relative;
}

.compat-pair__link::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: #8dbef0;
  box-shadow: 0 0 12px rgba(141, 190, 240, 0.85);
}

.compat-pair__link--magnetic::after { background: #f0a6c0; box-shadow: 0 0 12px rgba(240, 166, 192, 0.85); }
.compat-pair__link--harmonious::after { background: #8fd1a3; box-shadow: 0 0 12px rgba(143, 209, 163, 0.85); }
.compat-pair__link--complex::after { background: #e0c08a; box-shadow: 0 0 12px rgba(224, 192, 138, 0.85); }
.compat-pair__link--challenging::after { background: #e09a8a; box-shadow: 0 0 12px rgba(224, 154, 138, 0.85); }

.compat-ring {
  position: relative;
  width: 168px;
  height: 168px;
  margin: 16px auto 8px;
}

.compat-ring__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.compat-ring__track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 8;
}

.compat-ring__fill {
  fill: none;
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 700ms cubic-bezier(0.22, 1, 0.36, 1);
}

.compat-ring__fill--magnetic { stroke: #f0a6c0; filter: drop-shadow(0 0 7px rgba(240, 166, 192, 0.55)); }
.compat-ring__fill--harmonious { stroke: #8fd1a3; filter: drop-shadow(0 0 7px rgba(143, 209, 163, 0.55)); }
.compat-ring__fill--growing { stroke: #8dbef0; filter: drop-shadow(0 0 7px rgba(141, 190, 240, 0.55)); }
.compat-ring__fill--complex { stroke: #e0c08a; filter: drop-shadow(0 0 7px rgba(224, 192, 138, 0.5)); }
.compat-ring__fill--challenging { stroke: #e09a8a; filter: drop-shadow(0 0 7px rgba(224, 154, 138, 0.5)); }

.compat-ring__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.compat-ring__score {
  font-size: 44px;
  font-weight: 700;
  line-height: 1;
}

.compat-ring__pct {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  color: rgba(190, 212, 235, 0.55);
  margin-top: 4px;
}

.compat-tier {
  font-size: 21px;
  font-weight: 700;
  margin-top: 8px;
  letter-spacing: 0.2px;
}

.compat-tier--magnetic { color: #f3b9cd; }
.compat-tier--harmonious { color: #a6dcb6; }
.compat-tier--growing { color: #a9d0f3; }
.compat-tier--complex { color: #ecd2a0; }
.compat-tier--challenging { color: #ecb0a4; }

.compat-tier__headline {
  font-size: 14px;
  color: rgba(200, 220, 240, 0.72);
  margin: 6px auto 0;
  max-width: 320px;
  line-height: 1.45;
}

/* ── AI overview / dynamic / advice (premium) ── */
.compat-overview {
  margin-top: 18px;
  border-radius: 16px;
  border: 1px solid rgba(159, 216, 246, 0.12);
  background: linear-gradient(180deg, rgba(141, 190, 240, 0.07), rgba(141, 190, 240, 0.015));
  padding: 16px 18px;
}

.compat-overview__text {
  margin: 0;
  font-size: 14.5px;
  line-height: 1.55;
  color: rgba(224, 235, 248, 0.9);
}

.compat-overview__loading {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: rgba(190, 212, 235, 0.6);
}

.compat-ai-extra {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.compat-ai-block {
  border-radius: 16px;
  border: 1px solid rgba(159, 216, 246, 0.1);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01));
  padding: 14px 16px;
}

.compat-ai-block--advice {
  border-color: rgba(143, 209, 163, 0.28);
  background: linear-gradient(180deg, rgba(143, 209, 163, 0.1), rgba(143, 209, 163, 0.02));
}

.compat-ai-block__label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-weight: 600;
  color: rgba(190, 212, 235, 0.65);
  margin-bottom: 6px;
}

.compat-ai-block--advice .compat-ai-block__label {
  color: #9fd6ad;
}

.compat-ai-block__text {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: rgba(206, 224, 240, 0.85);
}

/* ── key connections ── */
.compat-connections {
  margin-top: 28px;
}

.compat-section-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  color: rgba(214, 232, 246, 0.82);
  font-weight: 600;
}

.compat-section-hint {
  font-size: 11.5px;
  color: rgba(190, 212, 235, 0.5);
  margin: 3px 0 12px;
}

.compat-conn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 9px;
  border-radius: 14px;
  border: 1px solid rgba(159, 216, 246, 0.1);
  border-left: 3px solid rgba(141, 190, 240, 0.5);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.008));
}

.compat-conn--flowing { border-left-color: #8fd1a3; }
.compat-conn--friction { border-left-color: #e0c08a; }
.compat-conn--intense { border-left-color: #f0a6c0; }

.compat-conn__glyphs {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  color: rgba(216, 233, 247, 0.92);
  font-size: 17px;
}

.compat-conn__aspect {
  font-size: 13px;
  color: rgba(190, 212, 235, 0.65);
}

.compat-conn--flowing .compat-conn__aspect { color: #8fd1a3; }
.compat-conn--friction .compat-conn__aspect { color: #e0c08a; }
.compat-conn--intense .compat-conn__aspect { color: #f0a6c0; }

.compat-conn__body {
  flex: 1;
  min-width: 0;
}

.compat-conn__title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(235, 242, 255, 0.94);
}

.compat-conn__orb {
  font-size: 11px;
  font-weight: 500;
  color: rgba(190, 212, 235, 0.45);
  margin-left: 4px;
}

.compat-conn__meaning {
  font-size: 12.5px;
  line-height: 1.45;
  color: rgba(206, 224, 240, 0.78);
  margin-top: 2px;
}

/* ── dimensions ── */
.compat-dims {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.compat-dim {
  border-radius: 16px;
  border: 1px solid rgba(159, 216, 246, 0.1);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.035), rgba(255, 255, 255, 0.01));
  padding: 14px 16px;
}

.compat-dim__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.compat-dim__icon {
  color: rgba(190, 212, 235, 0.7);
  flex: 0 0 auto;
}

.compat-dim__icon--high { color: #8fd1a3; }
.compat-dim__icon--mid { color: #8dbef0; }
.compat-dim__icon--low { color: #e0c08a; }

.compat-dim__label {
  font-size: 15px;
  font-weight: 600;
}

.compat-dim__aspect {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(190, 212, 235, 0.55);
  border: 1px solid rgba(159, 216, 246, 0.16);
  border-radius: 999px;
  padding: 2px 8px;
}

.compat-dim__aspect:empty {
  display: none;
}

.compat-dim__score {
  margin-left: auto;
  font-size: 15px;
  font-weight: 700;
  color: rgba(214, 232, 246, 0.92);
}

.compat-dim__bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  margin: 9px 0;
  overflow: hidden;
}

.compat-dim__bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1);
}

.compat-dim__bar-fill--high { background: #8fd1a3; }
.compat-dim__bar-fill--mid { background: #8dbef0; }
.compat-dim__bar-fill--low { background: #e0c08a; }

.compat-dim__text {
  font-size: 13.5px;
  line-height: 1.5;
  color: rgba(206, 224, 240, 0.82);
  margin: 4px 0 0;
}

.compat-dim__text--locked {
  color: rgba(190, 212, 235, 0.5);
  filter: blur(0.3px);
}

.compat-dim--locked .compat-dim__bar-fill {
  opacity: 0.5;
}

/* ── unlock ── */
.compat-unlock {
  width: 100%;
  margin-top: 18px;
  border-radius: 18px;
  border: 1px solid rgba(240, 200, 138, 0.3);
  background: linear-gradient(180deg, rgba(240, 200, 138, 0.12), rgba(240, 200, 138, 0.03));
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  text-align: center;
}

.compat-unlock__badge {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1.4px;
  color: #e7c489;
}

.compat-unlock__title {
  font-size: 16px;
  font-weight: 600;
  color: #f3e2c4;
}

.compat-unlock__text {
  font-size: 13px;
  line-height: 1.5;
  color: rgba(225, 218, 200, 0.74);
  margin: 0;
}

.compat-unlock__model {
  width: 100%;
  margin-top: 6px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compat-unlock__row {
  display: flex;
  gap: 10px;
  text-align: left;
  font-size: 12.5px;
  line-height: 1.45;
}

.compat-unlock__row-label {
  flex: 0 0 64px;
  font-weight: 600;
  color: #e7c489;
}

.compat-unlock__row-text {
  flex: 1;
  color: rgba(225, 218, 200, 0.7);
}

.compat-unlock__cta {
  margin-top: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #06131f;
  background: #f0d2a0;
  border: none;
  border-radius: 999px;
  padding: 11px 26px;
}

/* ── actions ── */
.compat-actions {
  display: flex;
  gap: 10px;
  margin-top: 22px;
}

.compat-action {
  flex: 1;
  min-height: 52px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
}

.compat-action--secondary {
  border: 1px solid rgba(159, 216, 246, 0.18);
  background: rgba(7, 14, 22, 0.45);
  color: rgba(214, 232, 246, 0.9);
}

.compat-action--primary {
  border: none;
  color: #06131f;
  background: linear-gradient(180deg, #a9d3f0, #7fb0e8);
}

.compat-disclaimer {
  margin-top: 18px;
  text-align: center;
  font-size: 11.5px;
  line-height: 1.5;
  color: rgba(190, 212, 235, 0.42);
}

/* ── dob sheet ── */
.compat-dobsheet {
  width: 100%;
  background: #0a131d;
  border-radius: 20px 20px 0 0;
  padding: 16px 16px calc(20px + env(safe-area-inset-bottom));
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.compat-dobsheet__handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: rgba(190, 212, 235, 0.25);
}

.compat-dobsheet__title {
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(190, 212, 235, 0.6);
}

/* ── day / month / year wheels ── */
.compat-wheel-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.compat-wheel {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  touch-action: pan-y;
}

.compat-wheel__window {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 50%;
  height: 44px;
  transform: translateY(-50%);
  border-radius: 9px;
  border: 1px solid rgba(141, 190, 240, 0.22);
  background: rgba(141, 190, 240, 0.07);
  box-shadow: inset 0 1px 0 rgba(198, 218, 255, 0.1);
  z-index: 1;
  pointer-events: none;
}

.compat-wheel__scroll {
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

.compat-wheel__scroll::-webkit-scrollbar {
  display: none;
}

.compat-wheel__spacer {
  height: 54px;
}

.compat-wheel__item {
  display: block;
  width: 100%;
  min-height: 44px;
  height: 44px;
  padding: 0 8px;
  margin: 0;
  border: 0;
  background: transparent;
  color: rgba(214, 232, 246, 0.55);
  font-size: 16px;
  line-height: 1.2;
  scroll-snap-align: center;
  transition: color 140ms ease, transform 140ms ease;
}

.compat-wheel__item--active {
  color: rgba(244, 248, 255, 0.98);
  font-weight: 600;
  transform: scale(1.04);
}

.compat-dobsheet__confirm {
  width: 100%;
  height: 50px;
  border-radius: 14px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  color: #06131f;
  background: linear-gradient(180deg, #a9d3f0, #7fb0e8);
}

.compat-dobsheet__confirm:disabled {
  opacity: 0.4;
}
</style>
