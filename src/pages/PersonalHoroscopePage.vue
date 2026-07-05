<template>
  <q-page class="personal-page">
    <div class="readings-bg" aria-hidden="true"></div>

    <section class="readings-content personal-wrap">
      <header class="readings-hero readings-hero--with-back">
        <button type="button" class="readings-back hit-44" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="readings-hero__text">
          <div class="readings-title">{{ tt('personalHoroscope.title') }}</div>
          <div class="readings-kicker">{{ dateLabel }}</div>
        </div>
      </header>

      <section v-if="hasPremiumAccess && profileReady && hasBirthDate" class="personal-hero-card">
        <div class="personal-hero-card__eyebrow">{{ tt('personalHoroscope.generatedLabel') }}</div>
        <div class="personal-hero-card__title">{{ signLabel }}</div>
        <div class="personal-meta">
          <span class="personal-meta__sign">{{ signLabel }}</span>
          <span v-if="moonSign" class="personal-meta__moon">
            {{ tt('personalHoroscope.moonLabel') }} {{ moonSignLabel }}
          </span>
        </div>
        <div class="personal-hero-card__text">{{ tt('personalHoroscope.subtitle') }}</div>
      </section>

      <div class="personal-body" :class="{ 'personal-body--centered': !reading || !hasPremiumAccess }">
        <div v-if="!hasPremiumAccess" class="personal-panel personal-lock">
          <div class="personal-lock__badge">{{ tt('premiumAccess.badge') }}</div>
          <div class="personal-lock__title">{{ tt('premiumAccess.personalHoroscope.title') }}</div>
          <p class="personal-lock__text">{{ tt('premiumAccess.personalHoroscope.text') }}</p>
        </div>

        <div v-else-if="!profileReady" class="personal-panel personal-panel--center personal-loading">
          <q-spinner color="rgba(147,197,253,0.7)" size="32px" />
          <div class="personal-loading__text">{{ tt('personalHoroscope.loading') }}</div>
        </div>

        <div v-else-if="!hasBirthDate" class="personal-panel personal-panel--center personal-empty">
          <div class="personal-empty__icon">🌙</div>
          <div class="personal-empty__text">{{ tt('personalHoroscope.errorNoBirthDate') }}</div>
        </div>

        <div v-else-if="loading" class="personal-panel personal-panel--center personal-loading">
          <q-spinner color="rgba(147,197,253,0.7)" size="32px" />
          <div class="personal-loading__text">{{ tt('personalHoroscope.loading') }}</div>
        </div>

        <div v-else-if="error" class="personal-panel personal-panel--center personal-empty">
          <div class="personal-empty__icon"><q-icon name="error_outline" size="30px" /></div>
          <div class="personal-empty__text">{{ error }}</div>
        </div>

        <div v-else-if="reading" class="personal-reading">
          <article
            v-for="section in readingSections"
            :key="section.key"
            class="personal-panel personal-section"
            :class="section.className"
          >
            <div class="personal-section__label">{{ section.label }}</div>
            <div class="personal-section__text">{{ section.text }}</div>
          </article>
          <p class="personal-disclaimer">{{ tt('common.disclaimer') }}</p>
        </div>

        <div v-else class="personal-panel personal-panel--center personal-start">
          <div class="personal-start__subtitle">{{ tt('personalHoroscope.subtitle') }}</div>
        </div>
      </div>
    </section>

    <div class="personal-sticky">
      <div v-if="!hasPremiumAccess" class="personal-sticky__actions">
        <button type="button" class="arcana-btn arcana-btn--primary" @click="goPremium">
          <q-icon name="workspace_premium" size="16px" />
          <span>{{ tt('premiumAccess.cta') }}</span>
        </button>
      </div>

      <div v-else-if="reading" class="personal-sticky__actions personal-sticky__actions--double">
        <button type="button" class="arcana-btn arcana-btn--secondary" @click="shareReading">
          <q-icon name="ios_share" size="16px" />
          <span>{{ tt('misc.share') }}</span>
        </button>
        <button type="button" class="arcana-btn arcana-btn--primary" :disabled="loading" @click="generate">
          <q-icon v-if="!loading" name="refresh" size="16px" />
          <q-spinner v-else size="16px" color="white" />
          <span>{{ tt('personalHoroscope.btnRegenerate') }}</span>
        </button>
      </div>

      <div v-else-if="hasBirthDate" class="personal-sticky__actions">
        <button type="button" class="arcana-btn arcana-btn--primary" :disabled="loading || !profileReady" @click="generate">
          <q-icon v-if="!loading" name="nightlight" size="16px" />
          <q-spinner v-else size="16px" color="white" />
          <span>{{ tt('personalHoroscope.btnGenerate') }}</span>
        </button>
      </div>

      <div v-else-if="profileReady" class="personal-sticky__actions">
        <button type="button" class="arcana-btn arcana-btn--primary" @click="goToBirthDateSetup">
          <q-icon name="manage_accounts" size="16px" />
          <span>{{ tt('personalHoroscope.noBirthDateBtn') }}</span>
        </button>
      </div>

      <div class="sticky-purchase__close-wrap">
        <button type="button" class="arcana-btn arcana-btn--secondary" @click="onBack">
          {{ tt('common.close') }}
        </button>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { Share } from '@capacitor/share'
import { t, currentLocale } from 'src/i18n'
import { invokeFunction, selectAppUser } from 'src/services/supabaseNative'
import { isDailyLimitError, isPremiumRequiredError, isUnauthorizedError } from 'src/helpers/functionErrors.js'
import { useAuthStore } from 'stores/authStore.js'
import { localISODate } from 'src/helpers/date.ts'
import { analytics } from 'src/services/analytics'
import { CONTENT_SHARE_EVENTS, PAYWALL_ENTRY_POINTS } from 'src/constants/analyticsEvents'
import { usePremiumAccess } from 'src/stores/premiumAccess'

import * as Astronomy from 'astronomy-engine'

const router = useRouter()
const authStore = useAuthStore()
const { hasPremiumAccess, revokePremiumAccess } = usePremiumAccess()
const PROFILE_CACHE_KEY = 'profile_cache_v1'


const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)

const SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces']

// --- state ---
const loading = ref(false)
const error = ref('')
const reading = ref(null)
const profileReady = ref(false)
const dateOfBirth = ref('')
const sign = ref('')
const moonSign = ref('')

// --- computed ---
const hasBirthDate = computed(() => !!dateOfBirth.value)

// Use the device-local date (not UTC) so "today" matches the daily horoscope
// screen and the cache bucket for users in negative-UTC timezones.
const todayISO = () => localISODate()

const dateLabel = computed(() => {
  const d = new Date(todayISO() + 'T00:00:00')
  return d.toLocaleDateString(locale.value === 'uk' ? 'uk-UA' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })
})

const signLabel = computed(() => {
  if (!sign.value) return ''
  return tt(`zodiac.${sign.value}`)
})

const moonSignLabel = computed(() => {
  if (!moonSign.value) return ''
  return tt(`zodiac.${moonSign.value}`)
})

const readingSections = computed(() => {
  if (!reading.value) return []

  return [
    {
      key: 'intro',
      label: tt('personalHoroscope.sectionIntro'),
      text: reading.value.intro || '',
      className: 'personal-section--intro',
    },
    {
      key: 'love',
      label: tt('personalHoroscope.sectionLove'),
      text: reading.value.love || '',
      className: 'personal-section--love',
    },
    {
      key: 'career',
      label: tt('personalHoroscope.sectionCareer'),
      text: reading.value.career || '',
      className: 'personal-section--career',
    },
    {
      key: 'energy',
      label: tt('personalHoroscope.sectionEnergy'),
      text: reading.value.energy || '',
      className: 'personal-section--energy',
    },
  ].filter((section) => String(section.text || '').trim())
})

// --- cache key ---
const cacheKey = () =>
  `personal_horoscope_${todayISO()}_${authStore.state.user?.id || 'guest'}_${locale.value}`

// --- birth date helpers ---
function birthDateToISO(raw) {
  const s = String(raw || '').trim()
  const dot = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s)
  if (dot) return `${dot[3]}-${dot[2]}-${dot[1]}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  return ''
}

function moonSignFromISO(iso) {
  try {
    const date = new Date(iso + 'T12:00:00Z')
    const time = Astronomy.MakeTime(date)
    const vec = Astronomy.GeoVector(Astronomy.Body.Moon, time, false)
    const ecl = Astronomy.Ecliptic(vec)
    const lon = ((ecl.elon % 360) + 360) % 360
    return SIGNS[Math.floor(lon / 30) % 12] || ''
  } catch {
    return ''
  }
}

function zodiacFromISO(iso) {
  const d = new Date(iso + 'T00:00:00Z')
  const m = d.getUTCMonth() + 1
  const day = d.getUTCDate()
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return 'aries'
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return 'taurus'
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return 'gemini'
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return 'cancer'
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return 'leo'
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return 'virgo'
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return 'libra'
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return 'scorpio'
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return 'sagittarius'
  if ((m === 12 && day >= 22) || (m === 1 && day <= 19)) return 'capricorn'
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return 'aquarius'
  return 'pisces'
}

function applyProfileData(profile = {}) {
  const dob = String(profile?.date_of_birth || '').trim()
  dateOfBirth.value = dob

  const iso = birthDateToISO(dob)
  if (iso) {
    sign.value = zodiacFromISO(iso)
    moonSign.value = moonSignFromISO(iso)
    return
  }

  sign.value = String(profile?.zodiac_sign || '').trim()
  moonSign.value = ''
}

async function loadCachedProfile() {
  try {
    const { value } = await Preferences.get({ key: PROFILE_CACHE_KEY })
    if (!value) return null
    return JSON.parse(value)
  } catch {
    return null
  }
}

// --- load profile ---
async function loadProfile() {
  const cachedProfile = await loadCachedProfile()
  if (cachedProfile) {
    applyProfileData(cachedProfile)
  }

  let userId = authStore.state.user?.id || ''
  if (!userId) {
    await authStore.syncSession({ refresh: false })
    userId = authStore.state.user?.id || ''
  }

  if (!userId) return

  try {
    const { data } = await selectAppUser(userId, 6000, 'date_of_birth,zodiac_sign,interests')
    if (data) {
      applyProfileData(data)
    }
  } catch (e) {
    console.warn('[PersonalHoroscope] profile load failed', e)
  }
}

// --- cache ---
async function loadFromCache() {
  try {
    const { value } = await Preferences.get({ key: cacheKey() })
    if (!value) return null
    return JSON.parse(value)
  } catch {
    return null
  }
}

async function saveToCache(data) {
  try {
    await Preferences.set({ key: cacheKey(), value: JSON.stringify(data) })
  } catch (e) {
    console.warn('personal-horoscope cache save failed', e)
  }
}

// --- generate ---
async function generate() {
  if (!hasPremiumAccess.value) {
    goPremium()
    return
  }
  if (!sign.value) return
  loading.value = true
  error.value = ''
  try {
    const { data, error: err } = await invokeFunction('personal-horoscope', {
      sign: sign.value,
      moonSign: moonSign.value || null,
      locale: locale.value,
      date: todayISO(),
    }, 30000)

    if (err) throw err // carries .status/.code from invokeFunction
    if (!data?.ok) throw new Error(data?.error || 'Request failed')

    reading.value = data.reading
    await saveToCache(data.reading)
  } catch (e) {
    if (isPremiumRequiredError(e) || isUnauthorizedError(e)) {
      // Stale local premium flag with a not-entitled (403) or missing/expired
      // session (401). Reconcile so the lock + sign-in/upgrade CTA show instead of a
      // generic error whose retry just re-POSTs into the same 403/401 (H4).
      revokePremiumAccess()
    } else if (isDailyLimitError(e)) {
      error.value = tt('aiLimits.dailyReached')
    } else {
      error.value = tt('personalHoroscope.errorGeneric')
    }
    console.error('personal-horoscope failed', e)
  } finally {
    loading.value = false
  }
}

async function shareReading() {
  if (!reading.value) return

  void analytics.logEvent(CONTENT_SHARE_EVENTS.personalHoroscopeShare, {
    sign: sign.value || '',
    moonSign: moonSign.value || '',
  })

  const lines = [
    tt('personalHoroscope.title'),
    dateLabel.value,
    signLabel.value,
  ]

  if (moonSign.value) {
    lines.push(`${tt('personalHoroscope.moonLabel')} ${moonSignLabel.value}`)
  }

  for (const section of readingSections.value) {
    lines.push('')
    lines.push(section.label)
    lines.push(section.text)
  }

  lines.push('')
  lines.push(tt('shareSubInfo'))

  try {
    await Share.share({
      title: tt('personalHoroscope.title'),
      text: lines.join('\n'),
    })
  } catch (e) {
    console.warn('[PersonalHoroscope] share cancelled/failed', e)
  }
}

// --- navigation ---
// Focused page (no bottom nav) — fall back to home if there's no history to pop
// (deep link / first navigation), so the user can never dead-end here.
function onBack() {
  if (typeof window !== 'undefined' && window.history.length > 1) router.back()
  else router.replace({ name: 'arcana' })
}

function goPremium() {
  const point = PAYWALL_ENTRY_POINTS.personalHoroscopeLock
  void analytics.logEvent(point.event, { source: point.source, entry: point.entry })
  router.push({ name: 'premium', query: { source: point.source, entry: point.entry } })
}

function goToBirthDateSetup() {
  if (authStore.state.user?.id) {
    router.push({ name: 'account' })
    return
  }
  router.push({ name: 'signUp' })
}

// The AI reading body is locale-specific. If the user switches app language
// while on this screen, regenerate so the text matches the new language
// (mirrors the daily horoscope screen's locale watcher).
watch(locale, async () => {
  if (!hasPremiumAccess.value || !hasBirthDate.value || loading.value) return
  // H3: switching language shouldn't burn a fresh 30s AI generation if a reading
  // for the new locale is already cached (cacheKey is per-locale). Try cache first.
  const cached = await loadFromCache()
  if (cached?.intro) {
    reading.value = cached
    return
  }
  void generate()
})

// --- init ---
onMounted(async () => {
  try {
    await loadProfile()
  } finally {
    profileReady.value = true
  }

  // Non-premium users see the lock panel — do NOT auto-generate, which calls
  // goPremium() and bounces back to /premium, creating a redirect loop (back/close
  // from the paywall returned here and re-redirected). The "Unlock Premium" CTA is
  // the only path to the paywall.
  if (!hasPremiumAccess.value) return

  if (!hasBirthDate.value) return

  // try cache first
  const cached = await loadFromCache()
  if (cached?.intro) {
    reading.value = cached
    return
  }

  // auto-generate on first open
  await generate()
})
</script>

<style lang="scss" scoped>
.personal-page {
  min-height: 100vh;
  background: #060910;
  color: #fff;
}

.personal-page::after {
  content: '';
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(22px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, rgba(5, 13, 21, 0), rgba(5, 13, 21, 0.98));
  pointer-events: none;
  z-index: 3;
}

.readings-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  z-index: 0;
}

.readings-content {
  position: relative;
  z-index: 1;
  padding: calc(90px + env(safe-area-inset-top)) 16px calc(54px + env(safe-area-inset-bottom) + 230px);
  max-width: 520px;
  margin: 0 auto;
  min-height: calc(100vh - env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.readings-hero {
  display: grid;
  gap: 3px;
}

.readings-hero--with-back {
  position: relative;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 12px;
}

.readings-hero__text {
  text-align: center;
  display: grid;
  gap: 3px;
  justify-items: center;
  padding: 0 44px;
}

.readings-title {
  font-size: 18px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.readings-kicker {
  font-size: 9px;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.6);
}

.readings-back {
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

.personal-hero-card {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(120% 120% at 50% 0%, rgba(95, 161, 220, 0.18), rgba(95, 161, 220, 0) 54%),
    linear-gradient(180deg, rgba(14, 25, 37, 0.98), rgba(8, 14, 23, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(197, 221, 255, 0.06),
    0 22px 42px rgba(0, 0, 0, 0.28);
  padding: 20px 18px;
  display: grid;
  gap: 10px;
}

.personal-hero-card__eyebrow {
  font-size: 10px;
  line-height: 1.2;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(168, 203, 255, 0.56);
}

.personal-hero-card__title {
  font-size: 26px;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: rgba(248, 251, 255, 0.96);
}

.personal-hero-card__text {
  max-width: 32ch;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(214, 225, 242, 0.68);
}

.personal-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;

  &__sign {
    font-size: 12px;
    font-weight: 660;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(147, 197, 253, 0.8);
    padding: 4px 10px;
    border-radius: 20px;
    border: 1px solid rgba(147, 197, 253, 0.2);
    background: rgba(147, 197, 253, 0.07);
  }

  &__moon {
    font-size: 11px;
    color: rgba(180, 200, 240, 0.5);
    padding: 4px 10px;
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.07);
  }
}

.personal-panel {
  position: relative;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, rgba(12, 20, 31, 0.96), rgba(7, 12, 20, 0.98));
  box-shadow:
    inset 0 1px 0 rgba(197, 221, 255, 0.04),
    0 18px 36px rgba(0, 0, 0, 0.24);
  padding: 18px 16px;
}

.personal-lock {
  display: grid;
  gap: 10px;
  justify-items: center;
  text-align: center;
  padding: 24px 18px;
}

.personal-lock__badge {
  justify-self: center;
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(230, 242, 255, 0.95);
  border: 1px solid rgba(141, 201, 255, 0.5);
  background: rgba(147, 203, 255, 0.16);
}

.personal-lock__title {
  font-size: 18px;
  line-height: 1.35;
  color: rgba(246, 242, 232, 0.96);
}

.personal-lock__text {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: rgba(214, 225, 242, 0.82);
  max-width: 340px;
}

.personal-panel--center {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.personal-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.personal-body--centered {
  justify-content: center;
}

.personal-section {
  display: grid;
  gap: 12px;

  &__label {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgba(152, 189, 244, 0.62);
  }

  &__text {
    font-size: 15px;
    line-height: 1.72;
    color: rgba(244, 248, 255, 0.86);
  }
}

.personal-reading {
  display: grid;
  gap: 14px;
}

.personal-disclaimer {
  margin: 4px 0 0;
  padding: 0 8px;
  text-align: center;
  font-size: 11px;
  line-height: 1.4;
  color: rgba(200, 206, 220, 0.5);
}

.personal-section--intro {
  background:
    radial-gradient(110% 120% at 0% 0%, rgba(123, 174, 232, 0.1), rgba(123, 174, 232, 0) 46%),
    linear-gradient(180deg, rgba(12, 20, 31, 0.98), rgba(7, 12, 20, 0.98));
}

.personal-section--love .personal-section__label {
  color: rgba(247, 185, 208, 0.76);
}

.personal-section--career .personal-section__label {
  color: rgba(172, 214, 252, 0.76);
}

.personal-section--energy .personal-section__label {
  color: rgba(196, 188, 255, 0.78);
}

.personal-start {
  text-align: center;
  gap: 20px;

  &__subtitle {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.45);
    max-width: 280px;
  }
}

.personal-empty {
  text-align: center;
  gap: 16px;

  &__icon { font-size: 36px; }

  &__text {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.5);
    max-width: 260px;
  }
}

.personal-loading {
  gap: 16px;

  &__text {
    font-size: 13px;
    color: rgba(147, 197, 253, 0.5);
    letter-spacing: 0.02em;
  }
}

.personal-sticky {
  position: fixed;
  left: 14px;
  right: 14px;
  bottom: 10px;
  z-index: 4;
  border: 1px solid transparent;
  border-radius: 24px;
  background:
    linear-gradient(165deg, rgba(8, 12, 20, 0.98), rgba(4, 6, 12, 0.99)) padding-box,
    linear-gradient(
        132deg,
        rgba(147, 203, 255, 0.34),
        rgba(127, 162, 226, 0.2),
        rgba(147, 203, 255, 0.08)
      )
      border-box;
  backdrop-filter: blur(22px);
  box-shadow:
    inset 0 1px 0 rgba(186, 207, 247, 0.08),
    0 22px 40px rgba(0, 0, 0, 0.44),
    0 8px 20px rgba(0, 0, 0, 0.28);
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom));
  display: grid;
  gap: 10px;
  overflow: hidden;
}

.personal-sticky::before {
  content: '';
  position: absolute;
  left: 16px;
  right: 16px;
  top: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(186, 207, 247, 0),
    rgba(186, 207, 247, 0.46),
    rgba(186, 207, 247, 0)
  );
  pointer-events: none;
}

.personal-sticky__actions {
  display: grid;
  gap: 10px;
}

.personal-sticky__actions--double {
  grid-template-columns: 1fr 1fr;
}

.sticky-purchase__close-wrap {
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

@media (min-width: 620px) {
  .personal-sticky {
    left: 50%;
    right: auto;
    width: min(560px, calc(100vw - 22px));
    transform: translateX(-50%);
  }
}

@media (max-width: 460px) {
  .readings-content {
    padding-left: 14px;
    padding-right: 14px;
    padding-bottom: calc(58px + env(safe-area-inset-bottom) + 236px);
  }

  .personal-hero-card {
    padding: 18px 16px;
  }

  .personal-hero-card__title {
    font-size: 24px;
  }

  .personal-sticky {
    bottom: 12px;
  }

  .personal-sticky__actions--double {
    grid-template-columns: 1fr;
  }
}
</style>
