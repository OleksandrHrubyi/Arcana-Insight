<template>
  <q-page class="compat-page">
    <div class="compat-bg" aria-hidden="true"></div>

    <section class="compat-content">
      <header class="compat-hero">
        <button type="button" class="compat-back hit-44" :aria-label="tt('common.close')" @click="onBack">
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
          class="arcana-btn arcana-btn--primary"
          :disabled="!canReveal"
          @click="reveal"
        >
          {{ tt('compatibilityPage.reveal') }}
        </button>
        <div class="compat-reveal__hint">{{ tt('compatibilityPage.revealHint') }}</div>

        <div v-if="connections.length" class="compat-recent">
          <div class="compat-recent__title">{{ tt('compatibilityPage.savedTitle') }}</div>
          <div class="compat-connlist">
            <div v-for="conn in rankedConnections" :key="conn.id" class="compat-savedconn">
              <button type="button" class="compat-savedconn__open" @click="openConnection(conn)">
                <span class="compat-savedconn__emoji">{{ conn.emoji }}</span>
                <span class="compat-savedconn__meta">
                  <span class="compat-savedconn__name">{{ conn.name }}</span>
                  <span class="compat-savedconn__sign">{{ tt(`zodiac.${connectionSign(conn)}`) }}</span>
                </span>
                <span
                  v-if="conn.score != null"
                  class="compat-savedconn__score"
                  :class="`compat-savedconn__score--${conn.tier}`"
                >{{ conn.score }}</span>
              </button>
              <button type="button" class="compat-savedconn__del" :aria-label="tt('common.close')" @click="askDeleteConnection(conn.id)">
                <q-icon name="close" size="13px" />
              </button>
            </div>
          </div>

          <button
            v-if="reminderAvailable"
            type="button"
            class="compat-reminder"
            :class="{ 'compat-reminder--on': reminderEnabled }"
            :aria-pressed="reminderEnabled"
            @click="toggleReminder"
          >
            <q-icon name="notifications_none" size="18px" class="compat-reminder__icon" />
            <span class="compat-reminder__label">{{ tt('compatibilityPage.reminderLabel') }}</span>
            <span class="compat-reminder__switch" :class="{ on: reminderEnabled }">
              <span class="compat-reminder__knob"></span>
            </span>
          </button>
        </div>
      </div>

      <!-- ───────────────── RESULT ───────────────── -->
      <div v-else class="compat-result">
        <div class="compat-scorecard">
          <div class="compat-pair">
            <div class="compat-pair__person">
              <div class="compat-pair__glyph">{{ signGlyph(result.charts.a.sun) }}</div>
              <div class="compat-pair__name">{{ tt(`zodiac.${result.charts.a.sun}`) }}</div>
              <div v-if="rising.a" class="compat-pair__rising">↑ {{ tt(`zodiac.${rising.a}`) }}</div>
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
              <div v-if="rising.b" class="compat-pair__rising">↑ {{ tt(`zodiac.${rising.b}`) }}</div>
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

        <div v-if="weather.length" class="compat-weather">
          <div class="compat-section-title">{{ tt('compatibilityPage.weatherTitle') }}</div>
          <div class="compat-section-hint">{{ tt('compatibilityPage.weatherHint') }}</div>
          <div
            v-for="(w, i) in weather"
            :key="`w-${i}`"
            class="compat-weather__row"
            :class="`compat-weather__row--${w.harmony}`"
          >
            <span class="compat-weather__glyph" aria-hidden="true">{{ planetGlyph(w.transit) }}</span>
            <span class="compat-weather__text">{{ weatherText(w) }}</span>
          </div>

          <div v-if="weeklyAction" class="compat-weather__action">
            <q-icon name="wb_twilight" size="16px" class="compat-weather__action-icon" />
            <span><b>{{ tt('compatibilityPage.weatherActionLabel') }}</b> {{ weeklyAction }}</span>
          </div>
        </div>

        <div v-if="hasPremiumAccess && (aiReading || aiLoading || aiError)" class="compat-overview">
          <p v-if="aiReading" class="compat-overview__text">{{ aiReading.overview }}</p>
          <div v-else-if="aiLoading" class="compat-overview__loading">
            <q-spinner-dots size="22px" color="rgba(169,211,240,0.8)" />
            <span>{{ tt('compatibilityPage.aiLoading') }}</span>
          </div>
          <div v-else class="compat-overview__error">
            <span>{{ tt('common.loadError') }}</span>
            <button
              type="button"
              class="arcana-btn arcana-btn--secondary compat-overview__retry"
              @click="requestAiReading(result)"
            >
              {{ tt('common.retry') }}
            </button>
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
            <div class="compat-conn__badge" aria-hidden="true">{{ aspectGlyph(conn.type) }}</div>
            <div class="compat-conn__body">
              <div class="compat-conn__title">
                <span class="compat-conn__glyphs" aria-hidden="true">{{ planetGlyph(conn.pa) }}{{ planetGlyph(conn.pb) }}</span>
                {{ connTitle(conn) }}
                <span class="compat-conn__orb">{{ conn.orb }}°</span>
              </div>
              <div class="compat-conn__meaning">{{ connMeaning(conn) }}</div>
            </div>
          </div>
        </div>

        <div v-if="houseOverlays.length" class="compat-houses">
          <div class="compat-section-title">{{ tt('compatibilityPage.housesTitle') }}</div>
          <div class="compat-section-hint">{{ tt('compatibilityPage.housesHint') }}</div>
          <div v-for="(o, i) in houseOverlays" :key="`h-${i}`" class="compat-house">
            <span class="compat-house__badge">{{ o.house }}</span>
            <div class="compat-house__body">
              <div class="compat-house__title">
                {{ tt(`compatibilityPage.planets.${o.planet}`) }}
                <span class="compat-house__dir">{{ overlayDir(o) }}</span>
              </div>
              <div class="compat-house__meaning">{{ tt(`compatibilityPage.houseThemes.${o.house}`) }}</div>
            </div>
          </div>
        </div>

        <div class="compat-dims">
          <div
            v-for="dim in result.dimensions"
            :key="dim.key"
            class="compat-dim"
            :class="{ 'compat-dim--locked': isDimLocked(dim) }"
            @click="isDimLocked(dim) && goPremium()"
          >
            <div class="compat-dim__head">
              <q-icon :name="dimIcon(dim.key)" size="17px" class="compat-dim__icon" :class="`compat-dim__icon--${dim.level}`" />
              <span class="compat-dim__label">{{ tt(`compatibilityPage.dim.${dim.key}.label`) }}</span>
              <span v-if="!isDimLocked(dim)" class="compat-dim__aspect">{{ aspectLabel(dim.aspect) }}</span>
              <q-icon v-else name="lock" size="13px" class="compat-dim__lock" />
              <span class="compat-dim__score">{{ dim.score }}</span>
            </div>
            <div class="compat-dim__bar">
              <span class="compat-dim__bar-fill" :class="`compat-dim__bar-fill--${dim.level}`" :style="{ width: dim.score + '%' }"></span>
            </div>
            <p v-if="!isDimLocked(dim)" class="compat-dim__text">
              {{ dimText(dim) }}
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
          <button type="button" class="arcana-btn arcana-btn--primary" @click="goPremium">
            {{ tt('premiumAccess.cta') }}
          </button>
        </section>

        <button
          type="button"
          class="compat-save-btn"
          :class="{ 'compat-save-btn--done': isCurrentSaved }"
          :disabled="isCurrentSaved"
          @click="openSaveSheet"
        >
          <q-icon :name="isCurrentSaved ? 'check' : 'bookmark_add'" size="17px" />
          <span>{{ isCurrentSaved ? tt('compatibilityPage.saved') : tt('compatibilityPage.saveConnection') }}</span>
        </button>

        <div class="compat-actions">
          <button type="button" class="arcana-btn arcana-btn--secondary" @click="shareResult">
            <q-icon name="share" size="16px" />
            <span>{{ tt('compatibilityPage.shareCta') }}</span>
          </button>
          <button type="button" class="arcana-btn arcana-btn--primary" @click="resetPairing">
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

        <button
          type="button"
          class="compat-timeplace-toggle"
          :class="{ open: timePlaceOpen }"
          @click="timePlaceOpen = !timePlaceOpen"
        >
          <q-icon name="schedule" size="16px" />
          <span>{{ tt('compatibilityPage.addTimePlace') }}</span>
          <q-icon :name="timePlaceOpen ? 'expand_less' : 'expand_more'" size="18px" class="compat-timeplace-toggle__chev" />
        </button>

        <div v-if="timePlaceOpen" class="compat-timeplace">
          <input
            v-model="draftTime"
            type="time"
            class="compat-timeplace__time"
            :aria-label="tt('compatibilityPage.birthTime')"
          />
          <div class="compat-timeplace__city">
            <input
              v-model="citySearch"
              class="compat-timeplace__cityinput"
              :placeholder="tt('compatibilityPage.birthCity')"
              @input="onCitySearch"
            />
            <q-spinner v-if="citySearching" size="16px" color="rgba(169,211,240,0.7)" class="compat-timeplace__spin" />
            <ul v-if="cityResults.length" class="compat-timeplace__results">
              <li v-for="(c, i) in cityResults" :key="i">
                <button type="button" class="compat-timeplace__result" @click="pickCity(c)">{{ c.label }}</button>
              </li>
            </ul>
          </div>
          <div class="compat-timeplace__hint">{{ tt('compatibilityPage.timePlaceHint') }}</div>
        </div>

        <button type="button" class="arcana-btn arcana-btn--primary" @click="confirmDob">
          {{ tt('common.save') }}
        </button>
      </div>
    </q-dialog>

    <!-- Save connection sheet -->
    <q-dialog v-model="saveSheet" position="bottom">
      <div class="compat-dobsheet compat-savesheet">
        <div class="compat-dobsheet__handle" aria-hidden="true"></div>
        <div class="compat-dobsheet__title">{{ tt('compatibilityPage.saveConnection') }}</div>
        <input
          v-model="saveName"
          class="compat-savesheet__input"
          :placeholder="tt('compatibilityPage.namePlaceholder')"
          maxlength="24"
        />
        <div class="compat-savesheet__emojis">
          <button
            v-for="e in SAVE_EMOJI"
            :key="e"
            type="button"
            class="compat-savesheet__emoji"
            :class="{ active: saveEmoji === e }"
            @click="saveEmoji = e"
          >{{ e }}</button>
        </div>
        <button type="button" class="arcana-btn arcana-btn--primary" @click="confirmSaveConnection">
          {{ tt('common.save') }}
        </button>
      </div>
    </q-dialog>

    <!-- Confirm before permanently removing a saved person (UX-14) -->
    <q-dialog v-model="deleteConnDialog">
      <div class="compat-confirm">
        <div class="compat-confirm__title">{{ tt('compatibilityPage.deleteConnectionTitle') }}</div>
        <p class="compat-confirm__text">{{ tt('compatibilityPage.deleteConnectionText') }}</p>
        <div class="compat-confirm__actions">
          <q-btn flat no-caps class="compat-confirm__btn" :label="tt('common.cancel')" @click="deleteConnDialog = false" />
          <q-btn flat no-caps class="compat-confirm__btn compat-confirm__btn--delete" :label="tt('common.delete')" @click="confirmDeleteConnection" />
        </div>
      </div>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, nextTick, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import { usePremiumAccess } from 'src/stores/premiumAccess'
import { analytics } from 'src/services/analytics'
import { PAYWALL_ENTRY_POINTS, CONTENT_SHARE_EVENTS } from 'src/constants/analyticsEvents'
import { selectAppUser, invokeFunction } from 'src/services/supabaseNative'
import { isPremiumRequiredError } from 'src/helpers/functionErrors.js'
import { useAuthStore } from 'stores/authStore.js'
import { computeChart, computeCompatibility, computeWeather } from 'src/helpers/compatibilityCore.js'
import { localISODate } from 'src/helpers/date.ts'
import { reminderSupported, ensureReminderPermission, scheduleWeeklyReminder, cancelWeeklyReminder } from 'src/services/relationshipReminder.js'
import { computeAscendant, wholeSignHouse, localToUTC } from 'src/helpers/ascendant.js'
import { searchCities } from 'src/services/geocode.js'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const { hasPremiumAccess, revokePremiumAccess } = usePremiumAccess()

const locale = computed(() =>
  (currentLocale.value || 'en').toLowerCase().startsWith('uk') ? 'uk' : 'en',
)
const tt = (key) => t(locale.value, key)

const CONNECTIONS_KEY = 'arcana_compatibility_connections_v1'
const REMINDER_KEY = 'arcana_compatibility_reminder_v1'
const PROFILE_CACHE_KEY = 'profile_cache_v1'

const reminderAvailable = reminderSupported()
const reminderEnabled = ref(false)
const reminderBusy = ref(false)

const relTypes = [
  { key: 'romantic', icon: 'favorite' },
  { key: 'friend', icon: 'group' },
  { key: 'family', icon: 'diversity_1' },
  { key: 'colleague', icon: 'work_outline' },
]

// Default avatar emoji per relationship type (user can change when saving).
const REL_EMOJI = { romantic: '❤️', friend: '🤝', family: '🏡', colleague: '💼' }
const SAVE_EMOJI = ['❤️', '🤍', '🔥', '🌙', '⭐', '🌸', '🤝', '🏡']

const dobA = ref('')
// Set when a saved connection was tapped before the user's own birth date existed:
// after they fill "You" in the DOB sheet, auto-reveal the pending pairing instead
// of leaving them to find the reveal button (QA #8).
const pendingRevealAfterDobA = ref(false)
const dobB = ref('')
// Optional birth time + place per person (for rising sign / houses).
// Shape: { time:'HH:MM', lat, lon, tz, place } | null
const birthA = ref(null)
const birthB = ref(null)
const rising = ref({ a: null, b: null })
const houseOverlays = ref([])
const relationshipType = ref('romantic')
const result = ref(null)
const connections = ref([])
const displayScore = ref(0)
const weather = ref([])

// Delete-connection confirm (UX-14): deleting a saved person was instant + unguarded.
const deleteConnDialog = ref(false)
const pendingDeleteConnId = ref('')

// Save-connection sheet state.
const saveSheet = ref(false)
const saveName = ref('')
const saveEmoji = ref('❤️')

const weatherText = (w) =>
  `${tt(`compatibilityPage.weatherThemes.${w.theme}`)} ${tt(`compatibilityPage.weatherFraming.${w.harmony}`)}`

// "Your planet → their chart" direction label for a house overlay (gender-safe:
// uses person labels, not possessive adjectives).
const overlayDir = (o) =>
  o.who === 'a'
    ? `${tt('compatibilityPage.youLabel')} → ${tt('compatibilityPage.partnerLabel')}`
    : `${tt('compatibilityPage.partnerLabel')} → ${tt('compatibilityPage.youLabel')}`

// One concrete, grounded suggestion driven by the dominant weather influence.
const weeklyAction = computed(() => {
  const top = weather.value[0]
  return top ? tt(`compatibilityPage.weatherActions.${top.theme}`) : ''
})

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

// DOB-sheet optional "birth time & city" sub-section.
const timePlaceOpen = ref(false)
const draftTime = ref('')
const draftPlace = ref(null) // { label, lat, lon, tz }
const citySearch = ref('')
const cityResults = ref([])
const citySearching = ref(false)
let citySearchTimer = 0

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

// When birth time + place are known, compute the chart at the exact UTC instant
// (much more accurate for the fast-moving Moon) instead of noon.
function chartOpts(birth, iso) {
  if (birth?.time && birth?.tz) {
    const utc = localToUTC(iso, birth.time, birth.tz)
    if (utc) return { utc }
  }
  return undefined
}
const chartA = computed(() => computeChart(dobA.value, chartOpts(birthA.value, dobA.value)))
const chartB = computed(() => computeChart(dobB.value, chartOpts(birthB.value, dobB.value)))
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
const PLANET_GLYPH = { sun: '☉', moon: '☾', mercury: '☿', venus: '♀', mars: '♂', jupiter: '♃', saturn: '♄' }
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
  commitment: 'anchor',
  growth: 'eco',
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
  // A fresh manual open is not a pending-connection reveal — reset the flag so it
  // only auto-reveals on the openConnection path that set it.
  pendingRevealAfterDobA.value = false
  activeDob.value = which
  buildDateOptions()
  syncSelectionFromISO(which === 'a' ? dobA.value : dobB.value)
  // Load existing birth time/place into the draft.
  const birth = which === 'a' ? birthA.value : birthB.value
  draftTime.value = birth?.time || ''
  draftPlace.value = birth ? { label: birth.place, lat: birth.lat, lon: birth.lon, tz: birth.tz } : null
  citySearch.value = birth?.place || ''
  cityResults.value = []
  timePlaceOpen.value = Boolean(birth)
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
  // Birth time + place only count when BOTH are present (rising needs both).
  const birth = (draftTime.value && draftPlace.value)
    ? { time: draftTime.value, lat: draftPlace.value.lat, lon: draftPlace.value.lon, tz: draftPlace.value.tz, place: draftPlace.value.label }
    : null
  if (activeDob.value === 'a') { dobA.value = iso; birthA.value = birth }
  else { dobB.value = iso; birthB.value = birth }
  dobSheet.value = false
  void hapticSelect()
  // Complete the pairing the user tapped before "You" existed (QA #8).
  if (pendingRevealAfterDobA.value) {
    pendingRevealAfterDobA.value = false
    if (canReveal.value) reveal()
  }
}

function onCitySearch() {
  const q = citySearch.value
  draftPlace.value = null
  window.clearTimeout(citySearchTimer)
  if (String(q || '').trim().length < 2) { cityResults.value = []; return }
  citySearchTimer = window.setTimeout(async () => {
    citySearching.value = true
    try {
      cityResults.value = await searchCities(q, locale.value)
    } finally {
      citySearching.value = false
    }
  }, 350)
}

function pickCity(city) {
  draftPlace.value = { label: city.label, lat: city.lat, lon: city.lon, tz: city.tz }
  citySearch.value = city.label
  cityResults.value = []
  void hapticSelect()
}

// Rising signs (needs each person's time+place) and whole-sign house overlays
// (needs BOTH ascendants). Graceful: leaves nulls/[] when data is missing.
function computeRisingAndHouses(res) {
  const ascA = birthA.value
    ? computeAscendant({ iso: dobA.value, time: birthA.value.time, lat: birthA.value.lat, lon: birthA.value.lon, tz: birthA.value.tz })
    : null
  const ascB = birthB.value
    ? computeAscendant({ iso: dobB.value, time: birthB.value.time, lat: birthB.value.lat, lon: birthB.value.lon, tz: birthB.value.tz })
    : null
  rising.value = { a: ascA?.ascSign || null, b: ascB?.ascSign || null }

  if (!ascA?.ascSign || !ascB?.ascSign) {
    houseOverlays.value = []
    return
  }
  const planets = ['sun', 'moon', 'venus', 'mars']
  const overlays = []
  for (const p of planets) {
    const h = wholeSignHouse(ascB.ascSign, res.charts.a[p])
    if (h) overlays.push({ who: 'a', planet: p, house: h })
  }
  for (const p of planets) {
    const h = wholeSignHouse(ascA.ascSign, res.charts.b[p])
    if (h) overlays.push({ who: 'b', planet: p, house: h })
  }
  // Surface the most relationship-relevant house placements first.
  const priority = { 7: 6, 5: 6, 1: 5, 8: 5, 4: 4, 10: 4, 11: 3, 2: 2 }
  overlays.sort((x, y) => (priority[y.house] || 1) - (priority[x.house] || 1))
  houseOverlays.value = overlays.slice(0, 4)
}

const isDimLocked = (dim) => !hasPremiumAccess.value && dim.key !== result.value?.teaserKey

function pickSigns(c) {
  return { sun: c?.sun, moon: c?.moon, mercury: c?.mercury, venus: c?.venus, mars: c?.mars, jupiter: c?.jupiter, saturn: c?.saturn }
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
      rising: { a: rising.value.a, b: rising.value.b },
      houses: houseOverlays.value.map((o) => ({ who: o.who, planet: o.planet, house: o.house })),
    }
    const { data, error } = await invokeFunction('compatibility', payload, 30000)
    if (reqId !== aiRequestId) return
    if (error) throw error // carries .status/.code from invokeFunction
    if (!data?.ok) throw new Error(data?.error || 'request_failed')
    aiReading.value = data.reading
  } catch (e) {
    if (reqId !== aiRequestId) return
    if (isPremiumRequiredError(e)) {
      // Server says this user isn't entitled — reconcile the stale local premium
      // flag so the unlock panel shows instead of a generic error whose retry just
      // re-hits the same 403.
      revokePremiumAccess()
      aiError.value = false
    } else {
      aiError.value = true
    }
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
  weather.value = computeWeather(res.charts.a, res.charts.b, localISODate())
  computeRisingAndHouses(res)
  displayScore.value = 0
  animateScore(res.overallScore)
  void hapticSelect()
  void analytics.logEvent('compatibility_reveal', {
    tier: res.tier,
    score: res.overallScore,
    relationshipType: res.relationshipType,
  })
  void requestAiReading(res)
}

function resetPairing() {
  result.value = null
  weather.value = []
  rising.value = { a: null, b: null }
  houseOverlays.value = []
  displayScore.value = 0
  aiReading.value = null
  aiError.value = false
  aiLoading.value = false
  aiRequestId += 1
  void hapticSelect()
}

// Open a saved connection: their DOB + type against your chart, then reveal.
function openConnection(conn) {
  dobB.value = conn.dob || ''
  birthB.value = conn.birth || null
  relationshipType.value = conn.relationshipType || 'romantic'
  void hapticSelect()
  if (canReveal.value) {
    reveal()
  } else if (!chartA.value) {
    // Partner loaded but the user's own chart isn't set — prompt for "You" instead
    // of a dead no-op tap, and auto-reveal once it's filled.
    openDob('a')
    pendingRevealAfterDobA.value = true
  }
}

// Is the currently-revealed partner already saved?
const isCurrentSaved = computed(() =>
  Boolean(result.value) &&
  // Saves de-dupe by (dob + relationshipType), so the "Saved" state must match on
  // both — otherwise the same person under a different relationship type wrongly
  // shows as already saved (QA NICE #3).
  connections.value.some((c) => c.dob === dobB.value && c.relationshipType === relationshipType.value),
)

function openSaveSheet() {
  if (!result.value) return
  saveName.value = ''
  saveEmoji.value = REL_EMOJI[relationshipType.value] || '❤️'
  saveSheet.value = true
  void hapticSelect()
}

async function confirmSaveConnection() {
  if (!dobB.value) return
  const name = saveName.value.trim() || tt(`compatibilityPage.relTypes.${relationshipType.value}`)
  const conn = {
    id: `c${connections.value.length}_${dobB.value}_${relationshipType.value}`,
    name,
    emoji: saveEmoji.value,
    dob: dobB.value,
    birth: birthB.value || null,
    relationshipType: relationshipType.value,
  }
  // De-dupe by (dob + type); newest first; cap at 24.
  const next = [conn, ...connections.value.filter((c) => !(c.dob === conn.dob && c.relationshipType === conn.relationshipType))].slice(0, 24)
  connections.value = next
  await persistConnections()
  await refreshReminderIfOn()
  saveSheet.value = false
  void hapticSelect()
}

function askDeleteConnection(id) {
  pendingDeleteConnId.value = id
  deleteConnDialog.value = true
  void hapticSelect()
}

async function confirmDeleteConnection() {
  const id = pendingDeleteConnId.value
  deleteConnDialog.value = false
  pendingDeleteConnId.value = ''
  if (!id) return
  connections.value = connections.value.filter((c) => c.id !== id)
  await persistConnections()
  await refreshReminderIfOn()
  void hapticSelect()
}

async function persistConnections() {
  try {
    await Preferences.set({ key: CONNECTIONS_KEY, value: JSON.stringify(connections.value) })
  } catch {
    // storage unavailable — ignore
  }
}

async function goPremium() {
  await hapticSelect()
  const point = PAYWALL_ENTRY_POINTS.compatibilityLock
  void analytics.logEvent(point.event, { source: point.source, entry: point.entry })
  router.push({ name: 'premium', query: { source: point.source, entry: point.entry } }).catch(() => {})
}

function wrapCanvasText(ctx, text, x, y, maxW, lh) {
  const words = String(text).split(' ')
  let line = ''
  let yy = y
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy)
      yy += lh
      line = w
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, x, yy)
}

// A shareable IG/story-ready image, drawn on a canvas (no extra deps).
function buildShareCardImage(r) {
  if (typeof document === 'undefined') return null
  const W = 1080
  const H = 1350
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.textAlign = 'center'

  const g = ctx.createRadialGradient(W / 2, -120, 120, W / 2, H * 0.42, H)
  g.addColorStop(0, '#0c2740')
  g.addColorStop(0.45, '#0a1722')
  g.addColorStop(1, '#05090f')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  for (const [x, y, rr] of [[120, 180, 2], [300, 120, 1.5], [820, 160, 2.4], [960, 320, 1.6], [200, 380, 1.4], [690, 100, 1.4], [520, 250, 1.2], [900, 560, 1.8], [170, 600, 1.3]]) {
    ctx.beginPath()
    ctx.arc(x, y, rr, 0, Math.PI * 2)
    ctx.fill()
  }

  const tierColors = { magnetic: '#f0a6c0', harmonious: '#8fd1a3', growing: '#8dbef0', complex: '#e0c08a', challenging: '#e09a8a' }
  const accent = tierColors[r.tier] || '#8dbef0'

  ctx.fillStyle = 'rgba(214,232,246,0.55)'
  ctx.font = '600 30px sans-serif'
  ctx.fillText(`ARCANA · ${tt('compatibilityPage.title').toUpperCase()}`, W / 2, 120)

  ctx.fillStyle = '#d3e6f8'
  ctx.font = '118px sans-serif'
  ctx.fillText(signGlyph(r.charts.a.sun), W * 0.28, 370)
  ctx.fillText(signGlyph(r.charts.b.sun), W * 0.72, 370)
  ctx.fillStyle = 'rgba(190,212,235,0.45)'
  ctx.font = '300 64px sans-serif'
  ctx.fillText('&', W / 2, 350)
  ctx.fillStyle = '#fff'
  ctx.font = '600 42px sans-serif'
  ctx.fillText(tt(`zodiac.${r.charts.a.sun}`), W * 0.28, 450)
  ctx.fillText(tt(`zodiac.${r.charts.b.sun}`), W * 0.72, 450)

  const cx = W / 2
  const cy = 740
  const rad = 185
  ctx.lineWidth = 24
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.beginPath()
  ctx.arc(cx, cy, rad, 0, Math.PI * 2)
  ctx.stroke()
  ctx.strokeStyle = accent
  ctx.beginPath()
  ctx.arc(cx, cy, rad, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (r.overallScore / 100))
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'
  ctx.font = '700 158px sans-serif'
  ctx.fillText(String(r.overallScore), cx, cy - 8)
  ctx.font = '500 32px sans-serif'
  ctx.fillStyle = 'rgba(190,212,235,0.6)'
  ctx.fillText(tt('compatibilityPage.scoreLabel').toUpperCase(), cx, cy + 92)
  ctx.textBaseline = 'alphabetic'

  ctx.fillStyle = accent
  ctx.font = '700 66px sans-serif'
  ctx.fillText(tt(`compatibilityPage.tiers.${r.tier}.title`), W / 2, 1040)

  ctx.fillStyle = 'rgba(220,232,245,0.82)'
  ctx.font = '400 38px sans-serif'
  wrapCanvasText(ctx, tt(`compatibilityPage.tiers.${r.tier}.headline`), W / 2, 1120, W - 240, 52)

  ctx.fillStyle = 'rgba(190,212,235,0.4)'
  ctx.font = '400 30px sans-serif'
  ctx.fillText(tt('shareSubInfo'), W / 2, H - 70)

  return { dataUrl: canvas.toDataURL('image/png') }
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
  const title = tt('compatibilityPage.title')
  const shareText = [
    `${tt(`zodiac.${r.charts.a.sun}`)} & ${tt(`zodiac.${r.charts.b.sun}`)}`,
    `${tt('compatibilityPage.scoreLabel')}: ${r.overallScore}/100 — ${tt(`compatibilityPage.tiers.${r.tier}.title`)}`,
    tt(`compatibilityPage.tiers.${r.tier}.headline`),
    '',
    tt('shareSubInfo'),
  ].join('\n')

  // Native-first: share a visual card image; fall back to text.
  if (Capacitor.isNativePlatform?.()) {
    let tempPath = ''
    try {
      const img = buildShareCardImage(r)
      const base64 = img?.dataUrl ? img.dataUrl.split(',')[1] : ''
      if (base64) {
        const filePath = `share/compat-${Date.now()}.png`
        const { uri } = await Filesystem.writeFile({ path: filePath, data: base64, directory: Directory.Cache, recursive: true })
        if (uri) {
          tempPath = filePath
          await Share.share({ title, dialogTitle: title, text: shareText, files: [uri] })
          return
        }
      }
    } catch (e) {
      console.warn('[compatibility] image share failed, falling back to text', e)
    } finally {
      if (tempPath) {
        try { await Filesystem.deleteFile({ path: tempPath, directory: Directory.Cache }) } catch { /* ignore */ }
      }
    }
  }

  try {
    await Share.share({ title, text: shareText })
  } catch {
    // share cancelled — ignore
  }
}

function onBack() {
  void hapticSelect()
  // Guard shallow history (deep-link / push entry) so back never no-ops (UX-6).
  if (typeof window !== 'undefined' && window.history.length > 1) router.back()
  else router.replace({ name: 'arcana' })
}

/* saved connections persistence (local-first, on-device) */
async function loadConnections() {
  try {
    const { value } = await Preferences.get({ key: CONNECTIONS_KEY })
    const parsed = value ? JSON.parse(value) : []
    if (Array.isArray(parsed)) {
      connections.value = parsed
        .filter((c) => c && /^\d{4}-\d{2}-\d{2}$/.test(c.dob || ''))
        .slice(0, 24)
    }
  } catch {
    connections.value = []
  }
}

// Sun sign for a saved connection's avatar/label (cheap, from its DOB).
function connectionSign(conn) {
  return computeChart(conn.dob)?.sun || ''
}

// Saved connections scored against YOUR chart and ranked by match (strongest
// first). Score/tier are null when your own birth date isn't set yet.
const rankedConnections = computed(() => {
  const me = chartA.value
  return connections.value
    .map((conn) => {
      let score = null
      let tier = null
      if (me) {
        const their = computeChart(conn.dob, chartOpts(conn.birth, conn.dob))
        const res = their ? computeCompatibility(me, their, { relationshipType: conn.relationshipType }) : null
        if (res) { score = res.overallScore; tier = res.tier }
      }
      return { ...conn, score, tier }
    })
    .sort((x, y) => (y.score ?? -1) - (x.score ?? -1))
})

/* weekly local reminder (on-device, no server) */
function reminderTexts() {
  // C2: name the connection the user actually sees on top (ranked by score), not
  // the newest-saved one, so the notification subject matches the displayed list.
  const name =
    rankedConnections.value[0]?.name ||
    connections.value[0]?.name ||
    tt('compatibilityPage.partnerLabel')
  return {
    title: tt('compatibilityPage.reminderTitle'),
    body: tt('compatibilityPage.reminderBody').replace('{name}', name),
  }
}

async function persistReminderPref() {
  try {
    await Preferences.set({ key: REMINDER_KEY, value: JSON.stringify({ enabled: reminderEnabled.value }) })
  } catch {
    // storage unavailable — ignore
  }
}

async function loadReminderPref() {
  try {
    const { value } = await Preferences.get({ key: REMINDER_KEY })
    reminderEnabled.value = value ? Boolean(JSON.parse(value)?.enabled) : false
  } catch {
    reminderEnabled.value = false
  }
}

function notifyReminder(message) {
  if (!message) return
  $q.notify({ message, color: 'dark', textColor: 'white', position: 'bottom', timeout: 3200 })
}

async function toggleReminder() {
  if (reminderBusy.value) return
  reminderBusy.value = true
  void hapticSelect()
  try {
    if (reminderEnabled.value) {
      await cancelWeeklyReminder()
      reminderEnabled.value = false
      await persistReminderPref()
      return
    }
    if (!connections.value.length) return // needs a saved connection to remind about
    const granted = await ensureReminderPermission()
    if (!granted) {
      // C1: don't fail silently — the switch didn't move; tell the user why.
      notifyReminder(tt('compatibilityPage.reminderDenied'))
      return
    }
    const ok = await scheduleWeeklyReminder(reminderTexts())
    if (ok) {
      reminderEnabled.value = true
      await persistReminderPref()
    } else {
      notifyReminder(tt('compatibilityPage.reminderFailed'))
    }
  } finally {
    reminderBusy.value = false
  }
}

// Keep the scheduled reminder in sync when the primary connection changes.
async function refreshReminderIfOn() {
  if (!reminderEnabled.value) return
  if (!connections.value.length) {
    await cancelWeeklyReminder()
    reminderEnabled.value = false
    await persistReminderPref()
    return
  }
  await scheduleWeeklyReminder(reminderTexts())
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

onMounted(() => {
  void loadConnections()
  void loadReminderPref()
  void loadProfileDob()
})

// The bottom-nav wrap sits above q-dialogs in this app, so a visible nav overlaps
// the bottom DOB / save sheets. Hide it ONLY while a sheet is open (not page-wide,
// which previously cost the page its navigation). Cleared on unmount so leaving the
// page mid-sheet can't strand the hidden state.
function setHideBottomNav(enabled) {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('hide-bottom-nav', enabled)
}

watch([dobSheet, saveSheet], ([dob, save]) => {
  setHideBottomNav(Boolean(dob || save))
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
  /* +84px clears the fixed bottom nav (matches ZodiacGuide / CardLibrary) so the
     last content isn't hidden behind it now that the nav stays visible here. */
  padding: calc(90px + env(safe-area-inset-top)) 18px calc(40px + env(safe-area-inset-bottom) + 84px);
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

/* saved connections list */
.compat-connlist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.compat-savedconn {
  display: flex;
  align-items: stretch;
  gap: 8px;
}

.compat-savedconn__open {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  border-radius: 14px;
  border: 1px solid rgba(159, 216, 246, 0.12);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
  padding: 11px 14px;
  text-align: left;
}

.compat-savedconn__open:active {
  transform: scale(0.99);
}

.compat-savedconn__emoji {
  font-size: 22px;
  flex: 0 0 auto;
  width: 30px;
  text-align: center;
}

.compat-savedconn__meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.compat-savedconn__score {
  flex: 0 0 auto;
  min-width: 34px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 10px;
  color: #06131f;
  background: #8dbef0;
}

.compat-savedconn__score--magnetic { background: #f0a6c0; }
.compat-savedconn__score--harmonious { background: #8fd1a3; }
.compat-savedconn__score--growing { background: #8dbef0; }
.compat-savedconn__score--complex { background: #e0c08a; }
.compat-savedconn__score--challenging { background: #e09a8a; }

.compat-savedconn__name {
  font-size: 14.5px;
  font-weight: 600;
  color: rgba(235, 242, 255, 0.94);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compat-savedconn__sign {
  font-size: 12px;
  color: rgba(190, 212, 235, 0.55);
}

.compat-savedconn__del {
  flex: 0 0 auto;
  width: 38px;
  border-radius: 12px;
  border: 1px solid rgba(159, 216, 246, 0.1);
  background: rgba(7, 14, 22, 0.4);
  color: rgba(190, 212, 235, 0.5);
  display: grid;
  place-items: center;
}

.compat-savedconn__del:active {
  transform: scale(0.94);
}

/* weekly reminder toggle */
.compat-reminder {
  width: 100%;
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(159, 216, 246, 0.12);
  background: rgba(7, 14, 22, 0.4);
  color: rgba(214, 232, 246, 0.82);
  transition: border-color 160ms ease, background 160ms ease;
}

.compat-reminder--on {
  border-color: rgba(141, 190, 240, 0.4);
  background: rgba(141, 190, 240, 0.1);
}

.compat-reminder__icon {
  color: rgba(190, 212, 235, 0.6);
  flex: 0 0 auto;
}

.compat-reminder--on .compat-reminder__icon {
  color: #a9d3f0;
}

.compat-reminder__label {
  flex: 1;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
}

.compat-reminder__switch {
  flex: 0 0 auto;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  position: relative;
  transition: background 180ms ease;
}

.compat-reminder__switch.on {
  background: #7fb0e8;
}

.compat-reminder__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform 180ms cubic-bezier(0.34, 1.3, 0.64, 1);
}

.compat-reminder__switch.on .compat-reminder__knob {
  transform: translateX(18px);
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

/* ── relationship weather (transits) ── */
.compat-weather {
  margin-top: 22px;
  border-radius: 16px;
  border: 1px solid rgba(159, 216, 246, 0.12);
  background: linear-gradient(180deg, rgba(141, 190, 240, 0.06), rgba(141, 190, 240, 0.015));
  padding: 14px 16px;
}

.compat-weather__row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.compat-weather__row:first-of-type {
  border-top: none;
}

.compat-weather__glyph {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 15px;
  background: rgba(141, 190, 240, 0.12);
  color: #a9d3f0;
  border: 1px solid rgba(141, 190, 240, 0.25);
}

.compat-weather__row--flowing .compat-weather__glyph { color: #8fd1a3; border-color: rgba(143, 209, 163, 0.32); background: rgba(143, 209, 163, 0.12); }
.compat-weather__row--friction .compat-weather__glyph { color: #e0c08a; border-color: rgba(224, 192, 138, 0.32); background: rgba(224, 192, 138, 0.12); }
.compat-weather__row--intense .compat-weather__glyph { color: #f0a6c0; border-color: rgba(240, 166, 192, 0.32); background: rgba(240, 166, 192, 0.12); }

.compat-weather__text {
  flex: 1;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(214, 232, 246, 0.85);
}

.compat-weather__action {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  background: rgba(143, 209, 163, 0.1);
  border: 1px solid rgba(143, 209, 163, 0.22);
  font-size: 12.5px;
  line-height: 1.45;
  color: rgba(220, 238, 226, 0.9);
}

.compat-weather__action b {
  color: #9fd6ad;
  font-weight: 600;
}

.compat-weather__action-icon {
  color: #9fd6ad;
  flex: 0 0 auto;
  margin-top: 1px;
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

.compat-overview__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  font-size: 13px;
  color: rgba(212, 190, 195, 0.75);
}

.compat-overview__retry {
  min-height: 38px;
  padding: 0 16px;
  font-size: 13px;
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
  gap: 13px;
  padding: 13px 15px;
  margin-bottom: 10px;
  border-radius: 16px;
  border: 1px solid rgba(159, 216, 246, 0.1);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.045), rgba(255, 255, 255, 0.01));
}

/* Circular, harmony-tinted aspect badge — the visual anchor of each connection. */
.compat-conn__badge {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 18px;
  border: 1px solid rgba(141, 190, 240, 0.32);
  background: rgba(141, 190, 240, 0.13);
  color: #a9d3f0;
}

.compat-conn--flowing .compat-conn__badge {
  border-color: rgba(143, 209, 163, 0.42);
  background: rgba(143, 209, 163, 0.14);
  color: #8fd1a3;
  box-shadow: 0 0 16px rgba(143, 209, 163, 0.18);
}
.compat-conn--friction .compat-conn__badge {
  border-color: rgba(224, 192, 138, 0.42);
  background: rgba(224, 192, 138, 0.14);
  color: #e0c08a;
  box-shadow: 0 0 16px rgba(224, 192, 138, 0.16);
}
.compat-conn--intense .compat-conn__badge {
  border-color: rgba(240, 166, 192, 0.42);
  background: rgba(240, 166, 192, 0.14);
  color: #f0a6c0;
  box-shadow: 0 0 16px rgba(240, 166, 192, 0.18);
}

.compat-conn__body {
  flex: 1;
  min-width: 0;
}

.compat-conn__title {
  font-size: 14.5px;
  font-weight: 600;
  color: rgba(235, 242, 255, 0.95);
}

.compat-conn__glyphs {
  color: rgba(190, 212, 235, 0.6);
  font-size: 13px;
  margin-right: 5px;
  letter-spacing: 1px;
}

.compat-conn__orb {
  font-size: 11px;
  font-weight: 500;
  color: rgba(190, 212, 235, 0.5);
  margin-left: 6px;
}

.compat-conn__meaning {
  font-size: 12.5px;
  line-height: 1.45;
  color: rgba(206, 224, 240, 0.74);
  margin-top: 3px;
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

.compat-dim__lock {
  color: rgba(190, 212, 235, 0.5);
}

.compat-dim__score {
  margin-left: auto;
  font-size: 15px;
  font-weight: 700;
  color: rgba(214, 232, 246, 0.92);
}

.compat-dim__bar {
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.25);
  margin: 10px 0;
  overflow: hidden;
}

.compat-dim__bar-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width 600ms cubic-bezier(0.22, 1, 0.36, 1);
}

.compat-dim__bar-fill--high { background: linear-gradient(90deg, rgba(143, 209, 163, 0.7), #8fd1a3); box-shadow: 0 0 10px rgba(143, 209, 163, 0.4); }
.compat-dim__bar-fill--mid { background: linear-gradient(90deg, rgba(141, 190, 240, 0.7), #8dbef0); box-shadow: 0 0 10px rgba(141, 190, 240, 0.4); }
.compat-dim__bar-fill--low { background: linear-gradient(90deg, rgba(224, 192, 138, 0.7), #e0c08a); box-shadow: 0 0 10px rgba(224, 192, 138, 0.35); }

.compat-dim__text {
  font-size: 13.5px;
  line-height: 1.5;
  color: rgba(206, 224, 240, 0.82);
  margin: 4px 0 0;
}

.compat-dim--locked {
  opacity: 0.74;
}

.compat-dim--locked .compat-dim__bar-fill {
  opacity: 0.55;
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

/* ── actions ── */
.compat-save-btn {
  width: 100%;
  margin-top: 18px;
  min-height: 50px;
  border-radius: 14px;
  border: 1px solid rgba(159, 216, 246, 0.2);
  background: rgba(141, 190, 240, 0.1);
  color: rgba(224, 235, 248, 0.92);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  transition: transform 120ms ease, opacity 160ms ease;
}

.compat-save-btn:active {
  transform: translateY(1px);
}

.compat-save-btn--done {
  border-color: rgba(143, 209, 163, 0.32);
  background: rgba(143, 209, 163, 0.12);
  color: #9fd6ad;
  opacity: 0.9;
}

.compat-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
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

/* Delete-connection confirm (UX-14). pointer-events:auto so taps on the custom
   (non-QCard) dialog content don't fall through to the backdrop. */
.compat-confirm {
  width: min(340px, 88vw);
  background: #0a131d;
  border-radius: 18px;
  padding: 20px;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}

.compat-confirm__title {
  font-size: 17px;
  font-weight: 600;
  color: #fff;
}

.compat-confirm__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.45;
  color: rgba(214, 225, 242, 0.78);
}

.compat-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.compat-confirm__btn {
  color: rgba(214, 225, 242, 0.86);
}

.compat-confirm__btn--delete {
  color: #ff9b9b;
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

/* ── save-connection sheet ── */
.compat-savesheet {
  gap: 14px;
}

.compat-savesheet__input {
  width: 100%;
  height: 50px;
  border-radius: 12px;
  border: 1px solid rgba(159, 216, 246, 0.18);
  background: rgba(7, 14, 22, 0.5);
  color: #fff;
  font-size: 15px;
  padding: 0 14px;
  outline: none;
}

.compat-savesheet__input::placeholder {
  color: rgba(190, 212, 235, 0.4);
}

.compat-savesheet__input:focus {
  border-color: rgba(141, 190, 240, 0.5);
}

.compat-savesheet__emojis {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.compat-savesheet__emoji {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid rgba(159, 216, 246, 0.12);
  background: rgba(7, 14, 22, 0.4);
  font-size: 22px;
  display: grid;
  place-items: center;
  transition: border-color 140ms ease, background 140ms ease, transform 120ms ease;
}

.compat-savesheet__emoji.active {
  border-color: rgba(141, 190, 240, 0.55);
  background: rgba(141, 190, 240, 0.16);
  transform: scale(1.05);
}

/* ── rising sign (hero) ── */
.compat-pair__rising {
  font-size: 11.5px;
  color: rgba(190, 212, 235, 0.72);
  margin-top: 3px;
}

/* ── birth time & place (DOB sheet) ── */
.compat-timeplace-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: 12px;
  border: 1px dashed rgba(159, 216, 246, 0.22);
  background: rgba(7, 14, 22, 0.4);
  color: rgba(190, 212, 235, 0.78);
  font-size: 13px;
  font-weight: 500;
}

.compat-timeplace-toggle.open {
  border-style: solid;
  border-color: rgba(141, 190, 240, 0.3);
}

.compat-timeplace-toggle__chev {
  margin-left: auto;
}

.compat-timeplace {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.compat-timeplace__time,
.compat-timeplace__cityinput {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(159, 216, 246, 0.18);
  background: rgba(7, 14, 22, 0.5);
  color: #fff;
  font-size: 16px;
  padding: 0 14px;
  outline: none;
}

.compat-timeplace__time:focus,
.compat-timeplace__cityinput:focus {
  border-color: rgba(141, 190, 240, 0.5);
}

.compat-timeplace__city {
  position: relative;
}

.compat-timeplace__spin {
  position: absolute;
  right: 12px;
  top: 16px;
}

.compat-timeplace__results {
  list-style: none;
  margin: 6px 0 0;
  padding: 0;
  border-radius: 12px;
  border: 1px solid rgba(159, 216, 246, 0.14);
  background: #0a131d;
  overflow: hidden;
  max-height: 220px;
  overflow-y: auto;
}

.compat-timeplace__result {
  width: 100%;
  text-align: left;
  padding: 11px 14px;
  background: transparent;
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  color: rgba(224, 235, 248, 0.9);
  font-size: 14px;
}

.compat-timeplace__results li:first-child .compat-timeplace__result {
  border-top: none;
}

.compat-timeplace__hint {
  font-size: 11.5px;
  color: rgba(190, 212, 235, 0.45);
}

/* ── house overlays ── */
.compat-houses {
  margin-top: 26px;
}

.compat-house {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  margin-bottom: 9px;
  border-radius: 14px;
  border: 1px solid rgba(159, 216, 246, 0.1);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01));
}

.compat-house__badge {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 16px;
  font-weight: 700;
  color: #a9d3f0;
  background: rgba(141, 190, 240, 0.13);
  border: 1px solid rgba(141, 190, 240, 0.28);
}

.compat-house__body {
  flex: 1;
  min-width: 0;
}

.compat-house__title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(235, 242, 255, 0.94);
}

.compat-house__dir {
  font-size: 11px;
  font-weight: 500;
  color: rgba(190, 212, 235, 0.5);
  margin-left: 6px;
}

.compat-house__meaning {
  font-size: 12.5px;
  line-height: 1.4;
  color: rgba(206, 224, 240, 0.74);
  margin-top: 2px;
}
</style>
