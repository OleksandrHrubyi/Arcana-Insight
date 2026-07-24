<template>
  <q-page class="journal-page">
    <div class="journal-bg" aria-hidden="true"></div>

    <div class="journal-content">
      <header class="journal-hero">
        <button type="button" class="journal-back hit-44" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="journal-hero__text">
          <div class="journal-title">{{ tt('journalPage.title') }}</div>
          <div class="journal-kicker">{{ tt('journalPage.subtitle') }}</div>
        </div>
      </header>

      <div v-if="loading" class="journal-loading">
        <q-spinner color="white" size="32px" />
      </div>

      <template v-else>
        <div v-if="loadError" class="journal-error">
          <span>{{ tt('common.loadError') }}</span>
          <button type="button" class="arcana-btn arcana-btn--secondary" @click="retryLoad">
            {{ tt('common.retry') }}
          </button>
        </div>

        <section class="journal-today">
          <div class="journal-today__kicker">
            {{ tt('journalPage.todayKicker') }} · {{ formatDateKey(todayKey) }}
          </div>
          <div v-if="skyLine" class="journal-sky">{{ skyLine }}</div>

          <template v-if="!todayEntry || editing">
            <div class="journal-block-label">{{ tt('journalPage.moodQuestion') }}</div>
            <div class="journal-moods">
              <button
                v-for="mood in moods"
                :key="mood.key"
                type="button"
                class="journal-mood hit-44"
                :class="{ 'journal-mood--active': selectedMood === mood.key }"
                @click="pickMood(mood.key)"
              >
                <q-icon :name="mood.icon" size="18px" />
                <span>{{ tt(`journalPage.moods.${mood.key}`) }}</span>
              </button>
            </div>

            <div v-if="promptText" class="journal-prompt">
              <div class="journal-block-label">{{ tt('journalPage.promptLabel') }}</div>
              <p class="journal-prompt__text">{{ promptText }}</p>
            </div>

            <q-input
              v-model="body"
              type="textarea"
              autogrow
              borderless
              :maxlength="bodyMax"
              :placeholder="tt('journalPage.entryPlaceholder')"
              class="journal-input"
            />
            <div class="journal-char">{{ body.length }}/{{ bodyMax }}</div>

            <button
              type="button"
              class="arcana-btn arcana-btn--primary journal-save"
              :disabled="!canSave || saving"
              @click="saveEntry"
            >
              {{ tt('journalPage.saveBtn') }}
            </button>
          </template>

          <template v-else>
            <div class="journal-done">
              <div class="journal-done__title">{{ tt('journalPage.doneTitle') }}</div>
              <div v-if="todayEntry.mood" class="journal-done__mood">
                <q-icon :name="moodIcon(todayEntry.mood)" size="16px" />
                <span>{{ tt(`journalPage.moods.${todayEntry.mood}`) }}</span>
              </div>
              <p v-if="entryPromptText(todayEntry)" class="journal-done__prompt">
                {{ entryPromptText(todayEntry) }}
              </p>
              <p v-if="todayEntry.body" class="journal-done__body">{{ todayEntry.body }}</p>
              <p class="journal-done__hint">{{ tt('journalPage.doneText') }}</p>
              <button type="button" class="arcana-btn arcana-btn--secondary" @click="startEdit">
                {{ tt('journalPage.editBtn') }}
              </button>
            </div>
          </template>
        </section>

        <div v-if="!isLoggedIn" class="journal-guest">
          <span class="journal-guest__text">{{ tt('journalPage.guestHint') }}</span>
          <button type="button" class="arcana-btn arcana-btn--secondary" @click="goToLogin">
            {{ tt('journalPage.loginCta') }}
          </button>
        </div>

        <section v-if="journalPatterns" class="journal-patterns">
          <div class="journal-patterns__title">{{ tt('journalPage.patternsTitle') }}</div>
          <div class="journal-patterns__chips">
            <span class="journal-patterns__chip">
              {{ journalPatterns.entryCount }} {{ patternsEntryWord }} · 7
              {{ tt('landing.dayForms.many') }}
            </span>
            <span v-if="journalPatterns.topMood" class="journal-patterns__chip">
              {{ tt('journalPage.patternsMood') }}:
              {{ tt(`journalPage.moods.${journalPatterns.topMood.key}`) }}
            </span>
            <span v-if="journalPatterns.topPhase" class="journal-patterns__chip">
              {{ tt('journalPage.patternsPhase') }}:
              {{ tt(`astro.phases.${journalPatterns.topPhase.key}`) }}
            </span>
          </div>
        </section>

        <section v-if="pastEntries.length" class="journal-history">
          <div class="journal-history__title">{{ tt('journalPage.historyTitle') }}</div>
          <article
            v-for="entry in pastEntries"
            :key="entry.dateKey"
            class="journal-entry-card"
            @click="openEntry(entry)"
          >
            <div class="journal-entry-card__header">
              <span class="journal-entry-card__date">{{ formatDateKey(entry.dateKey) }}</span>
              <span v-if="entry.mood" class="journal-entry-card__mood">
                <q-icon :name="moodIcon(entry.mood)" size="14px" />
                {{ tt(`journalPage.moods.${entry.mood}`) }}
              </span>
            </div>
            <p v-if="entry.body" class="journal-entry-card__excerpt">{{ entry.body }}</p>
            <q-icon name="chevron_right" size="16px" class="journal-entry-card__arrow" />
          </article>
        </section>

        <div v-else-if="!todayEntry" class="journal-empty">
          <div class="journal-empty__title">{{ tt('journalPage.emptyTitle') }}</div>
          <div class="journal-empty__text">{{ tt('journalPage.emptyHint') }}</div>
        </div>
      </template>
    </div>

    <q-dialog
      v-model="detailOpen"
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="440"
    >
      <section class="journal-detail">
        <header class="journal-detail__header">
          <button type="button" class="journal-back hit-44" @click="closeDetail">
            <q-icon name="close" size="18px" />
          </button>
          <div class="journal-detail__date">
            {{ selectedEntry ? formatDateKey(selectedEntry.dateKey) : '' }}
          </div>
        </header>
        <div v-if="selectedEntry" class="journal-detail__body">
          <div v-if="selectedEntry.mood" class="journal-done__mood">
            <q-icon :name="moodIcon(selectedEntry.mood)" size="16px" />
            <span>{{ tt(`journalPage.moods.${selectedEntry.mood}`) }}</span>
          </div>
          <p v-if="entryPromptText(selectedEntry)" class="journal-done__prompt">
            {{ entryPromptText(selectedEntry) }}
          </p>
          <p v-if="selectedEntry.body" class="journal-detail__text">{{ selectedEntry.body }}</p>
          <button type="button" class="arcana-btn arcana-btn--secondary journal-delete" @click="confirmDelete">
            <q-icon name="delete_outline" size="16px" />
            <span>{{ tt('journalPage.deleteBtn') }}</span>
          </button>
        </div>
      </section>
    </q-dialog>

    <q-dialog v-model="deleteDialog">
      <div class="journal-confirm">
        <div class="journal-confirm__title">{{ tt('journalPage.deleteTitle') }}</div>
        <p class="journal-confirm__text">{{ tt('journalPage.deleteText') }}</p>
        <div class="journal-confirm__actions">
          <button type="button" class="arcana-btn arcana-btn--secondary" @click="deleteDialog = false">
            {{ tt('common.cancel') }}
          </button>
          <button
            type="button"
            class="arcana-btn arcana-btn--primary"
            :disabled="deleting"
            @click="deleteEntry"
          >
            {{ tt('journalPage.deleteBtn') }}
          </button>
        </div>
      </div>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { t, currentLocale, pluralForm } from 'src/i18n'
import {
  getUserNative,
  selectJournalEntriesByUser,
  upsertJournalEntry,
  deleteJournalEntry,
} from 'src/services/supabaseNative'
import {
  JOURNAL_BODY_MAX,
  JOURNAL_MOODS,
  computeJournalPatterns,
  computePersonalDayNumber,
  computeUniversalDayNumber,
  selectDailyPrompt,
  loadJournalSnapshot,
  saveJournalEntrySnapshot,
  removeLocalJournalEntry,
} from 'src/helpers/journalCore.js'
import { Preferences } from '@capacitor/preferences'
import {
  DAILY_ACTIVITY_KEYS,
  getLocalDateKey,
  hasDailyActivityToday,
  markDailyActivity,
} from 'src/helpers/dailyRitual'
import { trackRitualActivityWithGuestFallback } from 'src/helpers/ritualRewardsBackend.js'
import { isDayKeyStale } from 'src/helpers/dayRollover.js'
import { analytics } from 'src/services/analytics'
import { logMindfulSessionIfEnabled } from 'src/services/mindfulness.js'
import { JOURNAL_EVENTS } from 'src/constants/analyticsEvents'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)
const router = useRouter()
const $q = useQuasar()

const moods = JOURNAL_MOODS
const bodyMax = JOURNAL_BODY_MAX

const loading = ref(true)
const loadError = ref(false)
const isLoggedIn = ref(false)
const userId = ref('')
const entries = ref([])
const todayEntry = ref(null)
const todayKey = ref(getLocalDateKey())
const editing = ref(false)
const selectedMood = ref('')
const body = ref('')
const saving = ref(false)
const astroToday = ref(null)
const birthDateKey = ref('')
const promptKey = ref('')
const promptPool = ref('')
const detailOpen = ref(false)
const selectedEntry = ref(null)
const deleteDialog = ref(false)
const deleting = ref(false)

let astronomyEnginePromise = null
const loadAstronomyEngine = async () => {
  if (!astronomyEnginePromise) {
    astronomyEnginePromise = import('astronomy-engine')
  }
  const mod = await astronomyEnginePromise
  return mod?.default || mod
}

const hapticTap = async () => {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch (e) {
    console.error(e)
  }
}

const canSave = computed(() => Boolean(selectedMood.value || body.value.trim()))
const pastEntries = computed(() => entries.value.filter((entry) => entry.dateKey !== todayKey.value))

// "Your week" (RP-14): recomputes as entries change (save/delete included).
const journalPatterns = computed(() =>
  computeJournalPatterns(entries.value, { todayKey: todayKey.value }),
)
const patternsEntryWord = computed(() =>
  pluralForm(locale.value, journalPatterns.value?.entryCount || 0, {
    one: tt('journalPage.patternsEntryForms.one'),
    few: tt('journalPage.patternsEntryForms.few'),
    many: tt('journalPage.patternsEntryForms.many'),
    other: tt('journalPage.patternsEntryForms.other'),
  }),
)

// Personal day (RP-11) when the birth date is known; universal day otherwise.
const journalDayNumber = computed(() => {
  const personal = computePersonalDayNumber(todayKey.value, birthDateKey.value)
  if (personal) return { value: personal, personal: true }
  const universal = computeUniversalDayNumber(todayKey.value)
  return universal ? { value: universal, personal: false } : null
})

const skyLine = computed(() => {
  const astro = astroToday.value
  const parts = []
  if (astro?.moonSignKey && astro?.moonPhaseKey) {
    parts.push(
      `${tt('astro.moonIn')} ${tt(`zodiacLocative.${astro.moonSignKey}`)}`,
      tt(`astro.phases.${astro.moonPhaseKey}`),
    )
    if (astro.mercuryRetrograde) parts.push(tt('astro.mercuryRetrograde'))
  }
  const day = journalDayNumber.value
  if (day) {
    parts.push(
      `${tt(day.personal ? 'journalPage.personalDayWord' : 'journalPage.dayWord')} ${day.value}`,
    )
  }
  return parts.join(' · ')
})

const resolvePromptText = (key) => {
  if (!key) return ''
  const path = `journalPage.prompts.${key}`
  const text = tt(path)
  // t() returns the key path when nothing resolves — fall back to a general
  // prompt so legacy/unknown keys never render as raw paths.
  if (text && text !== path) return text
  return tt('journalPage.prompts.general.0')
}

const promptText = computed(() => resolvePromptText(promptKey.value))
const entryPromptText = (entry) => (entry?.promptKey ? resolvePromptText(entry.promptKey) : '')

const moodIcon = (moodKey) => moods.find((mood) => mood.key === moodKey)?.icon || 'circle'

const formatDateKey = (dateKey) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''))
  if (!match) return ''
  try {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    return new Intl.DateTimeFormat(locale.value, { month: 'short', day: 'numeric' }).format(date)
  } catch {
    return dateKey
  }
}

const computeAstro = async () => {
  try {
    const Astronomy = await loadAstronomyEngine()
    const now = new Date()
    const t1 = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const eclipticLon = (body_, date) => {
      const time =
        typeof Astronomy.MakeTime === 'function'
          ? Astronomy.MakeTime(date)
          : new Astronomy.AstroTime(date)
      return Astronomy.Ecliptic(Astronomy.GeoVector(body_, time, false)).elon
    }
    const sunLon = eclipticLon(Astronomy.Body.Sun, now)
    const moonLon = eclipticLon(Astronomy.Body.Moon, now)
    const merc0 = eclipticLon(Astronomy.Body.Mercury, now)
    const merc1 = eclipticLon(Astronomy.Body.Mercury, t1)
    let elong = Math.abs(moonLon - sunLon) % 360
    if (elong > 180) elong = 360 - elong
    const phaseFromElong = (x) => {
      const v = ((x % 360) + 360) % 360
      if (v < 22.5 || v >= 337.5) return 'new'
      if (v < 67.5) return 'waxingCrescent'
      if (v < 112.5) return 'firstQuarter'
      if (v < 157.5) return 'waxingGibbous'
      if (v < 202.5) return 'full'
      if (v < 247.5) return 'waningGibbous'
      if (v < 292.5) return 'lastQuarter'
      return 'waningCrescent'
    }
    const signFromLon = (lon) => {
      const signs = [
        'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
        'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
      ]
      return signs[Math.floor((((lon % 360) + 360) % 360) / 30) % 12]
    }
    let mercDelta = (merc1 - merc0) % 360
    if (mercDelta > 180) mercDelta -= 360
    if (mercDelta < -180) mercDelta += 360
    const rulers = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']
    astroToday.value = {
      moonPhaseKey: phaseFromElong(elong),
      moonSignKey: signFromLon(moonLon),
      planetaryDay: rulers[now.getDay()],
      mercuryRetrograde: mercDelta < 0,
    }
  } catch (e) {
    // No astro → the prompt silently falls back to the general pool.
    console.warn('[JournalPage] astro calc failed', e)
    astroToday.value = null
  }
}

// Best-effort: the profile cache (native Preferences) carries date_of_birth for
// signed-in users; guests/web simply fall back to the universal day number.
const loadBirthDate = async () => {
  try {
    const { value } = await Preferences.get({ key: 'profile_cache_v1' })
    const profile = value ? JSON.parse(value) : null
    birthDateKey.value = String(profile?.date_of_birth || '').trim()
  } catch {
    birthDateKey.value = ''
  }
}

const refreshPrompt = () => {
  const yesterdayKey = getLocalDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000))
  const previous = entries.value.find((entry) => entry.dateKey === yesterdayKey)
  const selection = selectDailyPrompt({
    dateKey: todayKey.value,
    astro: astroToday.value,
    dayNumber: journalDayNumber.value?.value || null,
    previousPromptKey: previous?.promptKey || '',
  })
  promptKey.value = selection.promptKey
  promptPool.value = selection.poolKey
  void analytics.logEvent(JOURNAL_EVENTS.promptShown, { prompt_pool: selection.poolKey })
}

const loadEntries = async () => {
  loading.value = true
  let user = null
  try {
    const { data } = await getUserNative(8000)
    user = data
  } catch {
    user = null
  }
  isLoggedIn.value = Boolean(user?.id)
  userId.value = user?.id || ''

  const snapshot = await loadJournalSnapshot({
    isAuthenticated: isLoggedIn.value,
    userId: userId.value,
    selectJournalEntriesByUser,
  })
  entries.value = snapshot.entries
  todayEntry.value = snapshot.today
  loadError.value = snapshot.status === 'error'
  if (snapshot.error) {
    console.error('Load journal failed:', snapshot.error)
  }
  loading.value = false
}

const initToday = async () => {
  todayKey.value = getLocalDateKey()
  editing.value = false
  selectedMood.value = ''
  body.value = ''
  await loadEntries()
  await loadBirthDate()
  await computeAstro()
  refreshPrompt()
}

const retryLoad = async () => {
  await hapticTap()
  await loadEntries()
}

const pickMood = async (moodKey) => {
  selectedMood.value = selectedMood.value === moodKey ? '' : moodKey
  if (selectedMood.value) {
    void analytics.logEvent(JOURNAL_EVENTS.moodSelect, { mood: selectedMood.value })
  }
  await hapticTap()
}

const startEdit = async () => {
  editing.value = true
  selectedMood.value = todayEntry.value?.mood || ''
  body.value = todayEntry.value?.body || ''
  await hapticTap()
}

const saveEntry = async () => {
  if (!canSave.value || saving.value) return
  saving.value = true
  try {
    const wasNewToday = !hasDailyActivityToday(DAILY_ACTIVITY_KEYS.reflection)
    const result = await saveJournalEntrySnapshot({
      entry: {
        dateKey: todayKey.value,
        id: todayEntry.value?.id || '',
        mood: selectedMood.value,
        promptKey: promptKey.value,
        body: body.value,
        sky: astroToday.value || {},
      },
      isAuthenticated: isLoggedIn.value,
      userId: userId.value,
      upsertJournalEntry,
    })

    if (!result.ok) {
      $q.notify({ type: 'negative', message: tt('errors.generic'), position: 'top' })
      return
    }

    todayEntry.value = result.entry
    entries.value = [result.entry, ...entries.value.filter((e) => e.dateKey !== result.entry.dateKey)]
    editing.value = false

    if (wasNewToday) {
      markDailyActivity(DAILY_ACTIVITY_KEYS.reflection)
      void trackRitualActivityWithGuestFallback(DAILY_ACTIVITY_KEYS.reflection, {
        source: 'journal_page',
        userId: userId.value,
      })
      // RP-15: opt-in Apple Health Mindful Minutes (write-only, never blocks UI).
      void logMindfulSessionIfEnabled()
    }
    void analytics.logEvent(JOURNAL_EVENTS.entrySave, {
      mood: result.entry.mood || 'none',
      has_body: Boolean(result.entry.body),
      prompt_pool: promptPool.value || 'unknown',
    })
    $q.notify({ type: 'positive', message: tt('journalPage.savedToast'), position: 'top' })
    await hapticTap()
  } finally {
    saving.value = false
  }
}

const openEntry = async (entry) => {
  selectedEntry.value = entry
  detailOpen.value = true
  await hapticTap()
}

const closeDetail = async () => {
  detailOpen.value = false
  await hapticTap()
}

const confirmDelete = async () => {
  deleteDialog.value = true
  await hapticTap()
}

const deleteEntry = async () => {
  const entry = selectedEntry.value
  if (!entry || deleting.value) return
  deleting.value = true
  try {
    if (isLoggedIn.value && entry.id) {
      const { error } = await deleteJournalEntry(entry.id, 8000)
      if (error) {
        console.error('Delete journal entry failed:', error)
        $q.notify({ type: 'negative', message: tt('errors.generic'), position: 'top' })
        return
      }
    }
    removeLocalJournalEntry(entry.dateKey)
    entries.value = entries.value.filter((e) => e.dateKey !== entry.dateKey)
    if (entry.dateKey === todayKey.value) {
      todayEntry.value = null
      editing.value = false
      selectedMood.value = ''
      body.value = ''
    }
    void analytics.logEvent(JOURNAL_EVENTS.entryDelete, {})
    deleteDialog.value = false
    detailOpen.value = false
    await hapticTap()
  } finally {
    deleting.value = false
  }
}

const goToLogin = async () => {
  await hapticTap()
  router.push({ name: 'login', query: { redirect: '/journal' } })
}

const onBack = async () => {
  await hapticTap()
  if (typeof window !== 'undefined' && window.history.length > 1) router.back()
  else router.replace({ name: 'arcana' })
}

const onVisibilityChange = () => {
  if (typeof document === 'undefined' || document.visibilityState !== 'visible') return
  // Date rollover while backgrounded: re-key the day so an old form can't save
  // under yesterday's date (unsaved text is kept and saves under the new day).
  if (isDayKeyStale(todayKey.value, getLocalDateKey())) {
    void initToday()
  }
}

onMounted(() => {
  void initToday()
  void analytics.logEvent(JOURNAL_EVENTS.journalView, {})
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
})
</script>

<style scoped lang="scss">
.journal-page {
  min-height: 100vh;
  color: #e9edf4;
  position: relative;
  overflow: hidden;
}

.journal-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.journal-content {
  position: relative;
  z-index: 1;
  padding: calc(90px + env(safe-area-inset-top)) 16px 84px;
  max-width: 520px;
  margin: 0 auto;
  display: grid;
  gap: 16px;
}

.journal-hero {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 12px;
}

.journal-hero__text {
  text-align: center;
  display: grid;
  gap: 3px;
  justify-items: center;
  padding: 0 44px;
}

.journal-title {
  font-size: 18px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.journal-kicker {
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.journal-back {
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

.journal-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.journal-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-radius: 14px;
  border: 1px solid rgba(255, 173, 153, 0.25);
  background: rgba(64, 22, 18, 0.35);
  padding: 10px 12px;
  font-size: 13px;
  color: rgba(255, 214, 204, 0.9);
}

.journal-today {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(120% 90% at 20% 0%, rgba(112, 156, 255, 0.16) 0%, rgba(12, 18, 30, 0.12) 42%, transparent 100%),
    linear-gradient(160deg, rgba(14, 20, 32, 0.92), rgba(6, 10, 18, 0.98));
  box-shadow:
    0 18px 40px rgba(2, 6, 12, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  padding: 20px 16px 18px;
  display: grid;
  gap: 14px;
}

.journal-today__kicker {
  font-size: 10px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.62);
}

.journal-sky {
  font-size: 13px;
  color: rgba(196, 214, 240, 0.85);
}

.journal-block-label {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.55);
}

.journal-moods {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.journal-mood {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 6px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(9, 14, 23, 0.65);
  color: rgba(214, 225, 242, 0.82);
  font-size: 12px;
  transition: border-color 0.18s ease, background 0.18s ease;
}

.journal-mood--active {
  border-color: rgba(145, 188, 255, 0.65);
  background: rgba(64, 96, 156, 0.3);
  color: rgba(238, 244, 255, 0.98);
}

.journal-prompt {
  display: grid;
  gap: 6px;
}

.journal-prompt__text {
  margin: 0;
  font-size: 15px;
  line-height: 1.55;
  color: rgba(232, 240, 252, 0.94);
}

.journal-input {
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(7, 12, 20, 0.6);
  padding: 4px 12px;
  color: #e9edf4;

  :deep(textarea) {
    color: #e9edf4;
    min-height: 88px;
    font-size: 14px;
    line-height: 1.55;
  }
}

.journal-char {
  justify-self: end;
  font-size: 11px;
  color: rgba(214, 225, 242, 0.45);
}

.journal-save {
  justify-self: stretch;
}

.journal-done {
  display: grid;
  gap: 10px;
}

.journal-done__title {
  font-size: 16px;
  font-weight: 600;
  color: rgba(238, 244, 255, 0.96);
}

.journal-done__mood {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(165, 196, 245, 0.3);
  background: rgba(64, 96, 156, 0.22);
  font-size: 12px;
  color: rgba(226, 236, 255, 0.92);
}

.journal-done__prompt {
  margin: 0;
  font-size: 13px;
  font-style: italic;
  color: rgba(196, 214, 240, 0.7);
}

.journal-done__body {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(228, 237, 250, 0.92);
  white-space: pre-wrap;
}

.journal-done__hint {
  margin: 0;
  font-size: 12px;
  color: rgba(214, 225, 242, 0.55);
}

.journal-guest {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 16, 26, 0.72);
  padding: 12px 14px;
}

.journal-guest__text {
  font-size: 12px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.72);
}

.journal-patterns {
  display: grid;
  gap: 8px;
  border-radius: 14px;
  border: 1px solid rgba(148, 178, 214, 0.12);
  background: linear-gradient(180deg, rgba(17, 28, 46, 0.42), rgba(10, 17, 29, 0.58));
  padding: 12px 14px;
}

.journal-patterns__title {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.55);
}

.journal-patterns__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.journal-patterns__chip {
  padding: 5px 10px;
  border-radius: 999px;
  border: 1px solid rgba(165, 196, 245, 0.22);
  background: rgba(64, 96, 156, 0.16);
  font-size: 12px;
  color: rgba(226, 236, 255, 0.9);
}

.journal-history {
  display: grid;
  gap: 10px;
}

.journal-history__title {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.55);
}

.journal-entry-card {
  position: relative;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 16, 26, 0.72);
  padding: 14px 36px 14px 14px;
  display: grid;
  gap: 8px;
  cursor: pointer;
}

.journal-entry-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.journal-entry-card__date {
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.68);
}

.journal-entry-card__mood {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: rgba(196, 214, 240, 0.8);
}

.journal-entry-card__excerpt {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(228, 237, 250, 0.86);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.journal-entry-card__arrow {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(214, 225, 242, 0.4);
}

.journal-empty {
  text-align: center;
  display: grid;
  gap: 6px;
  padding: 12px 0;
}

.journal-empty__title {
  font-size: 15px;
  color: rgba(238, 244, 255, 0.9);
}

.journal-empty__text {
  font-size: 13px;
  color: rgba(214, 225, 242, 0.6);
}

.journal-detail {
  // Custom (non-QCard) dialog content: without this taps fall through to the
  // backdrop and close the dialog.
  pointer-events: auto;
  min-height: 100vh;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  color: #e9edf4;
  padding: calc(24px + env(safe-area-inset-top)) 16px 40px;
  display: grid;
  align-content: start;
  gap: 18px;
}

.journal-detail__header {
  position: relative;
  display: grid;
  justify-items: center;
  min-height: 36px;
}

.journal-detail__date {
  font-size: 14px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  align-self: center;
}

.journal-detail__body {
  display: grid;
  gap: 12px;
  max-width: 520px;
  margin: 0 auto;
  width: 100%;
}

.journal-detail__text {
  margin: 0;
  font-size: 15px;
  line-height: 1.65;
  color: rgba(232, 240, 252, 0.94);
  white-space: pre-wrap;
}

.journal-delete {
  justify-self: start;
}

.journal-confirm {
  pointer-events: auto;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(160deg, rgba(14, 20, 32, 0.98), rgba(6, 10, 18, 1));
  color: #e9edf4;
  padding: 20px 18px;
  display: grid;
  gap: 12px;
  min-width: 280px;
}

.journal-confirm__title {
  font-size: 16px;
  font-weight: 600;
}

.journal-confirm__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: rgba(214, 225, 242, 0.7);
}

.journal-confirm__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
