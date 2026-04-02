<template>
  <q-page class="personal-page">
    <div class="personal-bg" aria-hidden="true"></div>

    <section class="personal-wrap">
      <!-- header -->
      <header class="personal-header">
        <button type="button" class="personal-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="personal-header__text">
          <div class="personal-header__title">{{ tt('personalHoroscope.title') }}</div>
          <div class="personal-header__date">{{ dateLabel }}</div>
        </div>
      </header>

      <!-- no birth date -->
      <div v-if="!hasBirthDate" class="personal-empty">
        <div class="personal-empty__icon">🌙</div>
        <div class="personal-empty__text">{{ tt('personalHoroscope.errorNoBirthDate') }}</div>
        <button type="button" class="personal-cta" @click="goToSettings">
          {{ tt('personalHoroscope.noBirthDateBtn') }}
        </button>
      </div>

      <!-- loading -->
      <div v-else-if="loading" class="personal-loading">
        <q-spinner color="rgba(147,197,253,0.7)" size="32px" />
        <div class="personal-loading__text">{{ tt('personalHoroscope.loading') }}</div>
      </div>

      <!-- error -->
      <div v-else-if="error" class="personal-empty">
        <div class="personal-empty__icon">✦</div>
        <div class="personal-empty__text">{{ error }}</div>
        <button type="button" class="personal-cta" @click="generate">
          {{ tt('personalHoroscope.btnRegenerate') }}
        </button>
      </div>

      <!-- reading -->
      <div v-else-if="reading" class="personal-content">
        <div class="personal-meta">
          <span class="personal-meta__sign">{{ signLabel }}</span>
          <span v-if="moonSign" class="personal-meta__moon">
            {{ tt('personalHoroscope.moonLabel') }} {{ moonSignLabel }}
          </span>
        </div>

        <div class="personal-section">
          <div class="personal-section__label">{{ tt('personalHoroscope.sectionIntro') }}</div>
          <div class="personal-section__text">{{ reading.intro }}</div>
        </div>

        <div class="personal-section">
          <div class="personal-section__label personal-section__label--love">
            💖 {{ tt('personalHoroscope.sectionLove') }}
          </div>
          <div class="personal-section__text">{{ reading.love }}</div>
        </div>

        <div class="personal-section">
          <div class="personal-section__label personal-section__label--career">
            💼 {{ tt('personalHoroscope.sectionCareer') }}
          </div>
          <div class="personal-section__text">{{ reading.career }}</div>
        </div>

        <div class="personal-section">
          <div class="personal-section__label personal-section__label--spirit">
            ✨ {{ tt('personalHoroscope.sectionSpirit') }}
          </div>
          <div class="personal-section__text">{{ reading.spirit }}</div>
        </div>

        <div class="personal-generated-label">{{ tt('personalHoroscope.generatedLabel') }}</div>
      </div>

      <!-- initial state — not yet generated -->
      <div v-else class="personal-start">
        <div class="personal-start__subtitle">{{ tt('personalHoroscope.subtitle') }}</div>
        <div class="personal-start__meta">
          <span class="personal-meta__sign">{{ signLabel }}</span>
          <span v-if="moonSign" class="personal-meta__moon">
            {{ tt('personalHoroscope.moonLabel') }} {{ moonSignLabel }}
          </span>
        </div>
        <button type="button" class="personal-cta personal-cta--primary" @click="generate">
          {{ tt('personalHoroscope.btnGenerate') }}
        </button>
      </div>

      <!-- footer close -->
      <div class="personal-footer">
        <button type="button" class="personal-close" @click="onBack">
          {{ tt('common.close') }}
        </button>
      </div>
    </section>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { t, currentLocale } from 'src/i18n'
import { invokeFunction, selectAppUser } from 'src/services/supabaseNative'
import { useAuthStore } from 'stores/authStore.js'

import * as Astronomy from 'astronomy-engine'

const router = useRouter()
const authStore = useAuthStore()


const locale = computed(() => currentLocale.value || 'en')
const tt = (key) => t(locale.value, key)

const SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces']

// --- state ---
const loading = ref(false)
const error = ref('')
const reading = ref(null)
const dateOfBirth = ref('')
const sign = ref('')
const moonSign = ref('')

// --- computed ---
const hasBirthDate = computed(() => !!dateOfBirth.value)

const todayISO = () => new Date().toISOString().slice(0, 10)

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

// --- cache key ---
const cacheKey = () => `personal_horoscope_${todayISO()}_${authStore.state.user?.id || 'guest'}`

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

// --- load profile ---
async function loadProfile() {
  const userId = authStore.state.user?.id
  if (!userId) return
  const { data } = await selectAppUser(userId, 6000, 'date_of_birth,zodiac_sign,interests')
  const dob = data?.date_of_birth || ''
  dateOfBirth.value = dob

  const iso = birthDateToISO(dob)
  if (iso) {
    sign.value = zodiacFromISO(iso)
    moonSign.value = moonSignFromISO(iso)
  } else if (data?.zodiac_sign) {
    sign.value = data.zodiac_sign
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

    if (err || !data?.ok) {
      throw new Error(data?.error || 'Request failed')
    }

    reading.value = data.reading
    await saveToCache(data.reading)
  } catch (e) {
    error.value = tt('personalHoroscope.errorGeneric')
    console.error('personal-horoscope failed', e)
  } finally {
    loading.value = false
  }
}

// --- navigation ---
function onBack() { router.back() }
function goToSettings() { router.push({ name: 'settings' }) }

// --- init ---
onMounted(async () => {
  await loadProfile()

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

.personal-bg {
  position: fixed;
  inset: 0;
  background: radial-gradient(120% 55% at 50% 0%, #091828 0%, #060c18 45%, #040810 100%);
  pointer-events: none;
  z-index: 0;
}

.personal-wrap {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 0 20px;
  padding-bottom: calc(32px + env(safe-area-inset-bottom));
}

// --- header ---
.personal-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: calc(14px + env(safe-area-inset-top));
  padding-bottom: 18px;

  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__title {
    font-size: 16px;
    font-weight: 680;
    letter-spacing: -0.01em;
    color: rgba(255, 255, 255, 0.92);
  }

  &__date {
    font-size: 12px;
    color: rgba(147, 197, 253, 0.55);
    letter-spacing: 0.01em;
  }
}

.personal-back {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

// --- meta badges ---
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

// --- sections ---
.personal-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.personal-section {
  padding: 18px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  &:last-of-type { border-bottom: none; }

  &__label {
    font-size: 11px;
    font-weight: 660;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: rgba(147, 197, 253, 0.5);
    margin-bottom: 10px;

    &--love   { color: rgba(251, 182, 206, 0.7); }
    &--career { color: rgba(167, 213, 255, 0.7); }
    &--spirit { color: rgba(192, 167, 255, 0.7); }
  }

  &__text {
    font-size: 15px;
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.82);
  }
}

.personal-generated-label {
  margin-top: 28px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.2);
  text-align: center;
  letter-spacing: 0.04em;
}

// --- start / empty states ---
.personal-start {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 20px;
  padding: 32px 0;

  &__subtitle {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.45);
    max-width: 280px;
  }
}

.personal-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 16px;
  padding: 32px 0;

  &__icon { font-size: 36px; }

  &__text {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.5);
    max-width: 260px;
  }
}

.personal-loading {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;

  &__text {
    font-size: 13px;
    color: rgba(147, 197, 253, 0.5);
    letter-spacing: 0.02em;
  }
}

// --- CTA button ---
.personal-cta {
  padding: 14px 32px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(155deg, #3b82f6 0%, #1d4ed8 100%);
  box-shadow: inset 0 1px 0 rgba(219, 234, 254, 0.28), 0 12px 28px rgba(29, 78, 216, 0.45);
  color: #fff;
  font-size: 15px;
  font-weight: 640;
  cursor: pointer;
  letter-spacing: -0.01em;

  &--primary { min-width: 220px; }
}

// --- footer close ---
.personal-footer {
  padding-top: 24px;
  display: flex;
  justify-content: center;
}

.personal-close {
  min-height: 50px;
  min-width: 160px;
  border-radius: 14px;
  border: 1px solid rgba(156, 184, 235, 0.25);
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.9), rgba(10, 15, 27, 0.96));
  color: rgba(255, 255, 255, 0.72);
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}
</style>
