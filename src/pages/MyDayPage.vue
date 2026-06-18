<template>
  <q-page class="myday-page">
    <div class="myday-bg" :class="bgTintClass" aria-hidden="true"></div>

    <q-pull-to-refresh @refresh="onPullRefresh" color="blue-4">
    <div class="myday-shell">

      <!-- 1. Header (matches DailyCard) -->
      <header class="myday-hero myday-anim" style="--d:0">
        <button type="button" class="myday-back" @click="goBack" aria-label="Back">
          <q-icon name="chevron_left" size="20px" />
        </button>
        <div class="myday-hero__text">
          <div class="myday-title">{{ greetingLine }}</div>
          <div class="myday-kicker">{{ todayLabel }}</div>
          <span v-if="streakLabel" class="myday-streak">{{ streakLabel }}</span>
        </div>
      </header>

      <!-- 2. Card of the Day -->
      <template v-if="ready">
        <div class="myday-card-wrap myday-anim" style="--d:1">
          <button type="button" class="myday-card" @click="openDailyCard">
            <span class="myday-card__visual">
              <span
                class="myday-card__thumb"
                :class="{ 'myday-card__thumb--rev': dailyOrientation === 'reversed' }"
              >
                <img
                  v-if="cardImage"
                  class="myday-card__img"
                  :src="cardImage"
                  :alt="cardTitle"
                />
                <span v-else class="myday-card__placeholder" aria-hidden="true"></span>
              </span>
            </span>
            <span class="myday-card__info">
              <span class="myday-card__eyebrow">{{ heroEyebrow }}</span>
              <span class="myday-card__name">{{ cardTitle }}</span>
              <span class="myday-card__meta">{{ orientationLabel }}</span>
              <span class="myday-card__meaning">{{ heroSummary }}</span>
            </span>
            <q-icon class="myday-card__chevron" name="chevron_right" size="16px" />
          </button>
          <button type="button" class="myday-share" @click="shareDailyCard" :aria-label="copy.shareLabel">
            <q-icon name="ios_share" size="14px" />
          </button>
        </div>
      </template>
      <template v-else>
        <div class="myday-skel myday-skel--card myday-anim" style="--d:1"></div>
      </template>

      <!-- 3. Cosmic strip -->
      <div class="myday-cosmic myday-anim" style="--d:2">
        <div v-if="dailyEnergyLabel" class="myday-cosmic__item">
          <span class="myday-cosmic__dot" :style="{ background: dailyEnergyColor }"></span>
          <span class="myday-cosmic__text">{{ dailyEnergyLabel }}</span>
        </div>
        <span v-if="dailyEnergyLabel" class="myday-cosmic__sep" aria-hidden="true"></span>
        <div class="myday-cosmic__item">
          <span class="myday-cosmic__glyph">{{ moonPhaseEmoji }}</span>
          <span class="myday-cosmic__text">{{ moonPhaseLabel }}</span>
        </div>
        <span class="myday-cosmic__sep" aria-hidden="true"></span>
        <div class="myday-cosmic__item">
          <span class="myday-cosmic__glyph">{{ planetaryEmoji }}</span>
          <span class="myday-cosmic__text">{{ planetaryDayLabel }}</span>
        </div>
        <span class="myday-cosmic__sep" aria-hidden="true"></span>
        <div class="myday-cosmic__item">
          <span class="myday-cosmic__glyph">{{ moonSignEmoji }}</span>
          <span class="myday-cosmic__text">{{ moonSignLabel }}</span>
        </div>
        <template v-if="fullMoonLabel">
          <span class="myday-cosmic__sep" aria-hidden="true"></span>
          <div class="myday-cosmic__item">
            <span class="myday-cosmic__glyph">&#x1F315;</span>
            <span class="myday-cosmic__text">{{ fullMoonLabel }}</span>
          </div>
        </template>
      </div>

      <!-- 4. Progress -->
      <div class="myday-progress myday-anim" style="--d:3">
        <button
          v-for="step in progressSteps"
          :key="step.key"
          type="button"
          class="myday-progress__step"
          :class="{ 'myday-progress__step--done': step.done }"
          @click="step.action"
        >
          <span class="myday-progress__dot">
            <q-icon v-if="step.done" name="check" size="10px" />
          </span>
          <span class="myday-progress__label">{{ step.label }}</span>
        </button>
      </div>

      <!-- 5. Guidance cards -->
      <button
        v-if="isLoggedIn && horoscopeSummary"
        type="button"
        class="myday-horo myday-anim"
        style="--d:5"
        @click="openHoroscope"
      >
        <span class="myday-horo__left">
          <span class="myday-horo__tag">{{ signLabel }}</span>
          <span class="myday-horo__text">{{ horoscopeSnippet }}</span>
        </span>
        <q-icon class="myday-horo__chevron" name="chevron_right" size="14px" />
      </button>

      <button
        v-else-if="isLoggedIn && !horoscopeSummary"
        type="button"
        class="myday-horo myday-anim"
        style="--d:5"
        @click="openHoroscope"
      >
        <span class="myday-horo__left">
          <span class="myday-horo__tag">{{ signLabel }}</span>
          <span class="myday-horo__text myday-horo__text--dim">{{ copy.horoEmptyHint }}</span>
        </span>
        <q-icon class="myday-horo__chevron" name="chevron_right" size="14px" />
      </button>

      <button
        v-else-if="!isLoggedIn"
        type="button"
        class="myday-horo myday-horo--locked myday-anim"
        style="--d:5"
        @click="openSignUp"
      >
        <span class="myday-horo__left">
          <span class="myday-horo__tag">{{ copy.horoLockedTag }}</span>
          <span class="myday-horo__text myday-horo__text--dim">{{ copy.horoLockedHint }}</span>
        </span>
        <q-icon class="myday-horo__chevron" name="chevron_right" size="14px" />
      </button>

      <div class="myday-guidance myday-anim" style="--d:4">
        <div class="myday-guidance__item">
          <span class="myday-guidance__tag">{{ copy.labels.watch }}</span>
          <span class="myday-guidance__body">{{ watchAdvice }}</span>
        </div>
        <div class="myday-guidance__item">
          <span class="myday-guidance__tag">{{ copy.labels.action }}</span>
          <span class="myday-guidance__body">{{ actionAdvice }}</span>
        </div>
      </div>

      <!-- 6. Daily reflection prompt -->
      <div class="myday-reflect myday-anim" style="--d:6">
        <span class="myday-reflect__tag">{{ moonPhaseEmoji }} {{ moonPhaseLabel }}</span>
        <span class="myday-reflect__prompt">{{ dailyPrompt }}</span>
      </div>

      <!-- 7. Tarot CTA -->
      <button type="button" class="myday-tarot myday-anim" :class="{ 'myday-tarot--done': hasTarotToday }" style="--d:7" @click="openTarot">
        <span class="myday-tarot__text">{{ tarotCtaText }}</span>
        <q-icon name="chevron_right" size="14px" />
      </button>

      <div class="myday-end" aria-hidden="true"></div>
    </div>
    </q-pull-to-refresh>
  </q-page>
</template>


<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'
import * as Astronomy from 'astronomy-engine'
import { currentLocale, t } from 'src/i18n'
import { localISODate } from 'src/helpers/date.ts'
import {
  getDeterministicDailyCardSelection,
  loadDailyCardsSnapshot,
} from 'src/helpers/dailyCardCore.js'
import { loadTarotData } from 'src/helpers/tarotData'
import { loadHoroscopeRegistry } from 'src/helpers/horoscopeContentCore.js'
import { loadLocal, saveLocal } from 'src/helpers/localStorageSaver.js'
import { resolveUserSignSnapshot } from 'src/helpers/zodiacUserSignCore.js'
import { DAILY_ACTIVITY_KEYS, hasDailyActivityToday, readDailyStreak } from 'src/helpers/dailyRitual'
import { useAuthStore } from 'stores/authStore.js'
import { selectAppUser, selectHoroscopes } from 'src/services/supabaseNative'

// ── Core state ──────────────────────────────────────────────────
const router = useRouter()
const authStore = useAuthStore()
const locale = computed(() => (currentLocale.value || 'en').toLowerCase().startsWith('uk') ? 'uk' : 'en')
const tt = (key) => t(locale.value, key)

const isLoggedIn = computed(() => Boolean(authStore.state.user))
const userName = computed(() => {
  const meta = authStore.state.user?.user_metadata
  return meta?.name || meta?.full_name || ''
})

const ANON_DAILY_SEED_KEY = 'arcana_daily_seed_v1'

const cards = ref([])
const signKey = ref('')
const horoscopeSummaryRaw = ref('')
const horoscopeThemeKey = ref('energy')
const moonPhaseKey = ref('new')
const moonSignKey = ref('')
const planetaryDayKey = ref('moon')
const nextLunarEventDays = ref(-1)
const ready = ref(false)
const currentHour = ref(new Date().getHours())
const streakCount = ref(0)
const hasDailyCardToday = ref(false)
const hasHoroscopeToday = ref(false)
const hasTarotToday = ref(false)

// ── Copy ────────────────────────────────────────────────────────
const copyByLocale = {
  en: {
    greetingNight: 'Good night',
    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    greetingDefault: 'Your day',
    heroEyebrow: 'CARD OF THE DAY',
    heroEyebrowDone: 'REVEALED',
    fallbackSign: 'Your sign',
    horoscopeFallback: '',
    cardFallbackTitle: 'Your card',
    cardFallbackMeaning: 'Your daily card will appear once the deck is ready.',
    labels: { watch: 'Notice', action: 'Move' },
    cta: {
      openCard: 'Open card',
      viewCard: 'View card',
      openHoroscope: 'Read horoscope',
      viewHoroscope: 'View horoscope',
      askTarot: 'Ask tarot',
      viewTarot: 'View tarot',
    },
    progressItems: { dailyCard: 'Card', horoscope: 'Horoscope', tarot: 'Tarot' },
    tarotTitle: 'Need more depth? Ask tarot',
    tarotDoneTitle: 'Your tarot reading',
    streakLabel: '{n}-day streak',
    shareLabel: 'Share',
    energyLabels: {
      fiery: 'Energetic', grounded: 'Grounded', flowing: 'Flowing',
      expansive: 'Expansive', reflective: 'Reflective', structured: 'Structured',
    },
    shareText: 'My card of the day: {card} ({orientation})\n{meaning}\n\n\u2728 Arcana Insight',
    horoLockedTag: 'Horoscope',
    horoLockedHint: 'Sign up to unlock your personal horoscope',
    horoEmptyHint: 'Your horoscope will appear soon',
    watchByPhase: {
      new: 'Protect your energy and keep beginnings simple.',
      waxingCrescent: 'Trust what feels alive before you explain it.',
      firstQuarter: 'Tension today is asking for a choice.',
      waxingGibbous: 'Refine what is growing instead of starting more.',
      full: 'Emotions are louder now; honesty brings clarity.',
      waningGibbous: 'Notice what wants closure, gratitude, or release.',
      lastQuarter: 'Let go of outcomes that already taught their lesson.',
      waningCrescent: 'Rest, simplify, and listen before acting.',
    },
    actionByPlanet: {
      sun: 'Take one visible step toward what you want.',
      moon: 'Name your real feeling before reacting.',
      mars: 'Finish one hard thing instead of scattering energy.',
      mercury: 'Send the message or write the thought down.',
      jupiter: 'Choose the wider view and back one brave idea.',
      venus: 'Nurture beauty, closeness, or softness on purpose.',
      saturn: 'Bring structure to the area that feels unstable.',
    },
    moonPhaseNames: {
      new: 'New Moon', waxingCrescent: 'Waxing Crescent', firstQuarter: 'First Quarter',
      waxingGibbous: 'Waxing Gibbous', full: 'Full Moon', waningGibbous: 'Waning Gibbous',
      lastQuarter: 'Last Quarter', waningCrescent: 'Waning Crescent',
    },
    planetaryDayNames: {
      sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury',
      jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn',
    },
    moonIn: 'in',
    fullMoonIn: 'Full Moon in {n}d',
    fullMoonToday: 'Full Moon today',
    promptsByPhase: {
      new: 'What wants a quiet beginning today?',
      waxingCrescent: 'What deserves trust before full certainty?',
      firstQuarter: 'What decision is waiting for your courage?',
      waxingGibbous: 'What needs refinement instead of pressure?',
      full: 'What truth asks for an honest voice?',
      waningGibbous: 'What can you appreciate before letting go?',
      lastQuarter: 'What are you finally ready to release?',
      waningCrescent: 'Where would softness help more than force?',
    },
  },
  uk: {
    greetingNight: 'Доброї ночі',
    greetingMorning: 'Доброго ранку',
    greetingAfternoon: 'Добрий день',
    greetingEvening: 'Добрий вечір',
    greetingDefault: 'Твій день',
    heroEyebrow: '\u041A\u0410\u0420\u0422\u0410 \u0414\u041D\u042F',
    heroEyebrowDone: '\u0412\u0406\u0414\u041A\u0420\u0418\u0422\u041E',
    fallbackSign: '\u0422\u0432\u0456\u0439 \u0437\u043D\u0430\u043A',
    horoscopeFallback: '',
    cardFallbackTitle: '\u0422\u0432\u043E\u044F \u043A\u0430\u0440\u0442\u0430',
    cardFallbackMeaning: '\u041A\u0430\u0440\u0442\u0430 \u0434\u043D\u044F \u0437\u2019\u044F\u0432\u0438\u0442\u044C\u0441\u044F, \u0449\u043E\u0439\u043D\u043E \u043A\u043E\u043B\u043E\u0434\u0430 \u0431\u0443\u0434\u0435 \u0433\u043E\u0442\u043E\u0432\u0430.',
    labels: { watch: '\u041F\u043E\u043C\u0456\u0447\u0430\u0439', action: '\u041A\u0440\u043E\u043A' },
    cta: {
      openCard: '\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438',
      viewCard: '\u041F\u0435\u0440\u0435\u0433\u043B\u044F\u043D\u0443\u0442\u0438',
      openHoroscope: '\u0427\u0438\u0442\u0430\u0442\u0438 \u0433\u043E\u0440\u043E\u0441\u043A\u043E\u043F',
      viewHoroscope: '\u041F\u0435\u0440\u0435\u0433\u043B\u044F\u043D\u0443\u0442\u0438',
      askTarot: '\u0417\u0430\u043F\u0438\u0442\u0430\u0442\u0438 \u0442\u0430\u0440\u043E',
      viewTarot: '\u0412\u0456\u0434\u043A\u0440\u0438\u0442\u0438 \u0442\u0430\u0440\u043E',
    },
    progressItems: { dailyCard: '\u041A\u0430\u0440\u0442\u0430', horoscope: '\u0413\u043E\u0440\u043E\u0441\u043A\u043E\u043F', tarot: '\u0422\u0430\u0440\u043E' },
    tarotTitle: '\u041F\u043E\u0442\u0440\u0456\u0431\u043D\u043E \u0433\u043B\u0438\u0431\u0448\u0435? \u0417\u0430\u043F\u0438\u0442\u0430\u0439 \u0442\u0430\u0440\u043E',
    tarotDoneTitle: '\u0422\u0432\u0456\u0439 \u0440\u043E\u0437\u043A\u043B\u0430\u0434 \u0442\u0430\u0440\u043E',
    streakLabel: '{n} \u0434\u043D\u0456\u0432 \u043F\u043E\u0441\u043F\u0456\u043B\u044C',
    shareLabel: '\u041F\u043E\u0434\u0456\u043B\u0438\u0442\u0438\u0441\u044F',
    energyLabels: {
      fiery: '\u0415\u043D\u0435\u0440\u0433\u0456\u0439\u043D\u0438\u0439', grounded: '\u0417\u0435\u043C\u043D\u0438\u0439', flowing: '\u041F\u043B\u0438\u043D\u043D\u0438\u0439',
      expansive: '\u0420\u043E\u0437\u0448\u0438\u0440\u044E\u044E\u0447\u0438\u0439', reflective: '\u0420\u0435\u0444\u043B\u0435\u043A\u0441\u0438\u0432\u043D\u0438\u0439', structured: '\u0421\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u043D\u0438\u0439',
    },
    shareText: '\u041C\u043E\u044F \u043A\u0430\u0440\u0442\u0430 \u0434\u043D\u044F: {card} ({orientation})\n{meaning}\n\n\u2728 Arcana Insight',
    horoLockedTag: '\u0413\u043E\u0440\u043E\u0441\u043A\u043E\u043F',
    horoLockedHint: '\u0417\u0430\u0440\u0435\u0454\u0441\u0442\u0440\u0443\u0439\u0441\u044F, \u0449\u043E\u0431 \u043E\u0442\u0440\u0438\u043C\u0430\u0442\u0438 \u043E\u0441\u043E\u0431\u0438\u0441\u0442\u0438\u0439 \u0433\u043E\u0440\u043E\u0441\u043A\u043E\u043F',
    horoEmptyHint: '\u0422\u0432\u0456\u0439 \u0433\u043E\u0440\u043E\u0441\u043A\u043E\u043F \u0441\u043A\u043E\u0440\u043E \u0437\u2019\u044F\u0432\u0438\u0442\u044C\u0441\u044F',
    watchByPhase: {
      new: '\u0411\u0435\u0440\u0435\u0436\u0438 \u0435\u043D\u0435\u0440\u0433\u0456\u044E \u0456 \u0442\u0440\u0438\u043C\u0430\u0439 \u043F\u043E\u0447\u0430\u0442\u043A\u0438 \u043F\u0440\u043E\u0441\u0442\u0438\u043C\u0438.',
      waxingCrescent: '\u0419\u0434\u0438 \u0437\u0430 \u0442\u0438\u043C, \u0449\u043E \u043E\u0436\u0438\u0432\u0430\u0454, \u0449\u0435 \u0434\u043E \u043F\u043E\u044F\u0441\u043D\u0435\u043D\u044C.',
      firstQuarter: '\u041D\u0430\u043F\u0440\u0443\u0433\u0430 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0432\u0438\u0431\u043E\u0440\u0443.',
      waxingGibbous: '\u0423\u0442\u043E\u0447\u043D\u044E\u0439 \u0442\u0435, \u0449\u043E \u0440\u043E\u0441\u0442\u0435, \u0430 \u043D\u0435 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0439 \u0449\u0435 \u0431\u0456\u043B\u044C\u0448\u0435.',
      full: '\u0415\u043C\u043E\u0446\u0456\u0457 \u0433\u0443\u0447\u043D\u0456\u0448\u0456; \u0447\u0435\u0441\u043D\u0456\u0441\u0442\u044C \u043F\u0440\u0438\u043D\u043E\u0441\u0438\u0442\u044C \u044F\u0441\u043D\u0456\u0441\u0442\u044C.',
      waningGibbous: '\u041F\u043E\u043C\u0456\u0447\u0430\u0439 \u0442\u0435, \u0449\u043E \u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043D\u044F \u0430\u0431\u043E \u0432\u0434\u044F\u0447\u043D\u043E\u0441\u0442\u0456.',
      lastQuarter: '\u0412\u0456\u0434\u043F\u0443\u0441\u0442\u0438 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u0438, \u044F\u043A\u0456 \u0432\u0436\u0435 \u0434\u0430\u043B\u0438 \u0441\u0432\u0456\u0439 \u0443\u0440\u043E\u043A.',
      waningCrescent: '\u0412\u0456\u0434\u043F\u043E\u0447\u0438\u043D\u044C, \u0441\u043F\u0440\u043E\u0441\u0442\u0438\u0441\u044C \u0456 \u0441\u043B\u0443\u0445\u0430\u0439 \u043F\u0435\u0440\u0435\u0434 \u0434\u0456\u0454\u044E.',
    },
    actionByPlanet: {
      sun: '\u0417\u0440\u043E\u0431\u0438 \u043E\u0434\u0438\u043D \u0432\u0438\u0434\u0438\u043C\u0438\u0439 \u043A\u0440\u043E\u043A \u0434\u043E \u0442\u043E\u0433\u043E, \u0447\u043E\u0433\u043E \u0445\u043E\u0447\u0435\u0448.',
      moon: '\u0421\u043F\u043E\u0447\u0430\u0442\u043A\u0443 \u043D\u0430\u0437\u0432\u0438 \u0441\u0432\u043E\u0454 \u0441\u043F\u0440\u0430\u0432\u0436\u043D\u0454 \u0432\u0456\u0434\u0447\u0443\u0442\u0442\u044F.',
      mars: '\u0417\u0430\u0432\u0435\u0440\u0448\u0438 \u043E\u0434\u043D\u0443 \u0441\u043A\u043B\u0430\u0434\u043D\u0443 \u0441\u043F\u0440\u0430\u0432\u0443, \u0430 \u043D\u0435 \u0440\u043E\u0437\u043A\u0438\u0434\u0430\u0439\u0441\u044F.',
      mercury: '\u041D\u0430\u0434\u0456\u0448\u043B\u0438 \u043F\u043E\u0432\u0456\u0434\u043E\u043C\u043B\u0435\u043D\u043D\u044F \u0430\u0431\u043E \u0437\u0430\u043F\u0438\u0448\u0438 \u0434\u0443\u043C\u043A\u0443.',
      jupiter: '\u041E\u0431\u0435\u0440\u0438 \u0448\u0438\u0440\u0448\u0438\u0439 \u043F\u043E\u0433\u043B\u044F\u0434 \u0456 \u043F\u0456\u0434\u0442\u0440\u0438\u043C\u0430\u0439 \u0441\u043C\u0456\u043B\u0438\u0432\u0443 \u0456\u0434\u0435\u044E.',
      venus: '\u0421\u0432\u0456\u0434\u043E\u043C\u043E \u0434\u043E\u0434\u0430\u0439 \u0443 \u0434\u0435\u043D\u044C \u043A\u0440\u0430\u0441\u0443, \u043D\u0456\u0436\u043D\u0456\u0441\u0442\u044C \u0430\u0431\u043E \u0431\u043B\u0438\u0437\u044C\u043A\u0456\u0441\u0442\u044C.',
      saturn: '\u0414\u0430\u0439 \u0441\u0442\u0440\u0443\u043A\u0442\u0443\u0440\u0443 \u0442\u0456\u0439 \u0437\u043E\u043D\u0456, \u0434\u0435 \u0437\u0430\u0440\u0430\u0437 \u0445\u0438\u0442\u043A\u043E.',
    },
    moonPhaseNames: {
      new: '\u041D\u043E\u0432\u0438\u0439 \u041C\u0456\u0441\u044F\u0446\u044C', waxingCrescent: '\u041C\u043E\u043B\u043E\u0434\u0438\u0439', firstQuarter: '\u041F\u0435\u0440\u0448\u0430 \u0447\u0432\u0435\u0440\u0442\u044C',
      waxingGibbous: '\u0417\u0440\u043E\u0441\u0442\u0430\u044E\u0447\u0438\u0439', full: '\u041F\u043E\u0432\u043D\u0438\u0439 \u041C\u0456\u0441\u044F\u0446\u044C', waningGibbous: '\u0421\u043F\u0430\u0434\u0430\u044E\u0447\u0438\u0439',
      lastQuarter: '\u041E\u0441\u0442\u0430\u043D\u043D\u044F \u0447\u0432\u0435\u0440\u0442\u044C', waningCrescent: '\u0421\u0442\u0430\u0440\u0438\u0439 \u041C\u0456\u0441\u044F\u0446\u044C',
    },
    planetaryDayNames: {
      sun: '\u0421\u043E\u043D\u0446\u0435', moon: '\u041C\u0456\u0441\u044F\u0446\u044C', mars: '\u041C\u0430\u0440\u0441', mercury: '\u041C\u0435\u0440\u043A\u0443\u0440\u0456\u0439',
      jupiter: '\u042E\u043F\u0456\u0442\u0435\u0440', venus: '\u0412\u0435\u043D\u0435\u0440\u0430', saturn: '\u0421\u0430\u0442\u0443\u0440\u043D',
    },
    moonIn: '\u0443',
    fullMoonIn: '\u041F\u043E\u0432\u043D\u0438\u0439 \u041C\u0456\u0441\u044F\u0446\u044C \u0447\u0435\u0440\u0435\u0437 {n}\u0434',
    fullMoonToday: '\u041F\u043E\u0432\u043D\u0438\u0439 \u041C\u0456\u0441\u044F\u0446\u044C \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456',
    promptsByPhase: {
      new: '\u0429\u043E \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0445\u043E\u0447\u0435 \u0442\u0438\u0445\u043E\u0433\u043E \u043F\u043E\u0447\u0430\u0442\u043A\u0443?',
      waxingCrescent: '\u0427\u043E\u043C\u0443 \u0441\u044C\u043E\u0433\u043E\u0434\u043D\u0456 \u0432\u0430\u0440\u0442\u043E \u0434\u043E\u0432\u0456\u0440\u0438\u0442\u0438\u0441\u044C \u0440\u0430\u043D\u0456\u0448\u0435 \u0437\u0430 \u044F\u0441\u043D\u0456\u0441\u0442\u044C?',
      firstQuarter: '\u042F\u043A\u0435 \u0440\u0456\u0448\u0435\u043D\u043D\u044F \u0447\u0435\u043A\u0430\u0454 \u043D\u0430 \u0442\u0432\u043E\u044E \u0441\u043C\u0456\u043B\u0438\u0432\u0456\u0441\u0442\u044C?',
      waxingGibbous: '\u0429\u043E \u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0443\u0442\u043E\u0447\u043D\u0435\u043D\u043D\u044F, \u0430 \u043D\u0435 \u0442\u0438\u0441\u043A\u0443?',
      full: '\u042F\u043A\u0430 \u043F\u0440\u0430\u0432\u0434\u0430 \u043F\u0440\u043E\u0441\u0438\u0442\u044C \u0447\u0435\u0441\u043D\u043E\u0433\u043E \u0433\u043E\u043B\u043E\u0441\u0443?',
      waningGibbous: '\u0417\u0430 \u0449\u043E \u043C\u043E\u0436\u043D\u0430 \u043F\u043E\u0434\u044F\u043A\u0443\u0432\u0430\u0442\u0438 \u043F\u0435\u0440\u0435\u0434 \u0432\u0456\u0434\u043F\u0443\u0441\u043A\u0430\u043D\u043D\u044F\u043C?',
      lastQuarter: '\u0429\u043E \u0442\u0438 \u0432\u0436\u0435 \u0433\u043E\u0442\u043E\u0432\u0438\u0439 \u0432\u0456\u0434\u043F\u0443\u0441\u0442\u0438\u0442\u0438?',
      waningCrescent: '\u0414\u0435 \u043C\u2019\u044F\u043A\u0456\u0441\u0442\u044C \u0434\u043E\u043F\u043E\u043C\u043E\u0436\u0435 \u0431\u0456\u043B\u044C\u0448\u0435, \u043D\u0456\u0436 \u0441\u0438\u043B\u0430?',
    },
  },
}

const copy = computed(() => copyByLocale[locale.value] || copyByLocale.en)

// ── Greeting ────────────────────────────────────────────────────
const greetingLine = computed(() => {
  const hour = new Date().getHours()
  let base
  if (hour < 5) base = copy.value.greetingNight
  else if (hour < 12) base = copy.value.greetingMorning
  else if (hour < 17) base = copy.value.greetingAfternoon
  else if (hour < 22) base = copy.value.greetingEvening
  else base = copy.value.greetingNight
  const name = userName.value
  return name ? `${base}, ${name}` : base
})

const todayLabel = computed(() => {
  try {
    return new Intl.DateTimeFormat(locale.value === 'uk' ? 'uk-UA' : 'en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    }).format(new Date())
  } catch {
    return localISODate()
  }
})

// ── Zodiac helper ───────────────────────────────────────────────
const zodiacFromRawDate = (rawDate) => {
  const raw = String(rawDate || '').trim()
  if (!raw) return ''
  let day = 0, month = 0
  if (raw.includes('.')) {
    const p = raw.split('.').map(v => parseInt(v, 10))
    day = p[0] || 0; month = p[1] || 0
  } else if (raw.includes('-')) {
    const p = raw.split('-').map(v => parseInt(v, 10))
    month = p[1] || 0; day = p[2] || 0
  }
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries'
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus'
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini'
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer'
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo'
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo'
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra'
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio'
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius'
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn'
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius'
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'pisces'
  return ''
}

// ── Daily seed & card ───────────────────────────────────────────
const getOrCreateAnonSeed = () => {
  if (typeof window === 'undefined') return 'anon'
  const stored = localStorage.getItem(ANON_DAILY_SEED_KEY)
  if (stored) return stored
  const next = (window.crypto?.randomUUID?.()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`
  localStorage.setItem(ANON_DAILY_SEED_KEY, next)
  return next
}

const dailySelection = computed(() =>
  getDeterministicDailyCardSelection({
    dateKey: localISODate(),
    identity: authStore.state.user?.id || getOrCreateAnonSeed(),
    cardsLength: cards.value.length,
  }),
)
const dailyIndex = computed(() => dailySelection.value.index)
const dailyOrientation = computed(() => dailySelection.value.orientation)
const dailyCard = computed(() => cards.value[dailyIndex.value] || null)

const cardTitle = computed(() => dailyCard.value?.name?.[locale.value] || dailyCard.value?.name?.en || copy.value.cardFallbackTitle)
const cardImage = computed(() => { const f = dailyCard.value?.file; return f ? `/images/cards/${f}` : '' })
const cardMeaning = computed(() =>
  dailyCard.value?.meaning?.[dailyOrientation.value]?.[locale.value] ||
  dailyCard.value?.meaning?.[dailyOrientation.value]?.en ||
  copy.value.cardFallbackMeaning,
)
const orientationLabel = computed(() => dailyOrientation.value === 'reversed' ? tt('cardsPage.reversed') : tt('cardsPage.upright'))

const heroEyebrow = computed(() => hasDailyCardToday.value ? copy.value.heroEyebrowDone : copy.value.heroEyebrow)
const signLabel = computed(() => signKey.value ? tt(`zodiac.${signKey.value}`) : copy.value.fallbackSign)

function firstSentence(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const m = text.match(/.*?[.!?](\s|$)/)
  return m ? m[0].trim() : text
}

const heroSummary = computed(() => firstSentence(cardMeaning.value))

// ── Horoscope ───────────────────────────────────────────────────
const horoscopeSummary = computed(() => horoscopeSummaryRaw.value || '')
const horoscopeSnippet = computed(() => {
  const text = horoscopeSummary.value
  if (!text) return ''
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  return sentences.slice(0, 2).join(' ').trim()
})
// ── Astro display ───────────────────────────────────────────────
const moonPhaseEmojis = { new: '\uD83C\uDF11', waxingCrescent: '\uD83C\uDF12', firstQuarter: '\uD83C\uDF13', waxingGibbous: '\uD83C\uDF14', full: '\uD83C\uDF15', waningGibbous: '\uD83C\uDF16', lastQuarter: '\uD83C\uDF17', waningCrescent: '\uD83C\uDF18' }
const planetaryGlyphs = { sun: '\u2609', moon: '\u263D', mars: '\u2642', mercury: '\u263F', jupiter: '\u2643', venus: '\u2640', saturn: '\u2644' }
const zodiacGlyphs = { aries: '\u2648', taurus: '\u2649', gemini: '\u264A', cancer: '\u264B', leo: '\u264C', virgo: '\u264D', libra: '\u264E', scorpio: '\u264F', sagittarius: '\u2650', capricorn: '\u2651', aquarius: '\u2652', pisces: '\u2653' }

const moonPhaseEmoji = computed(() => moonPhaseEmojis[moonPhaseKey.value] || '\uD83C\uDF11')
const moonPhaseLabel = computed(() => copy.value.moonPhaseNames?.[moonPhaseKey.value] || '')
const planetaryEmoji = computed(() => planetaryGlyphs[planetaryDayKey.value] || '\u2609')
const planetaryDayLabel = computed(() => copy.value.planetaryDayNames?.[planetaryDayKey.value] || '')
const moonSignEmoji = computed(() => zodiacGlyphs[moonSignKey.value] || '\u263D')
const moonSignLabel = computed(() => {
  if (!moonSignKey.value) return ''
  return `${copy.value.moonIn} ${tt(`zodiac.${moonSignKey.value}`)}`
})

const fullMoonLabel = computed(() => {
  const n = nextLunarEventDays.value
  if (n < 0) return ''
  if (n === 0) return copy.value.fullMoonToday
  return copy.value.fullMoonIn.replace('{n}', n)
})

// ── Daily energy ────────────────────────────────────────────────
const PLANET_ENERGY = { sun: 'fiery', moon: 'flowing', mars: 'fiery', mercury: 'reflective', jupiter: 'expansive', venus: 'grounded', saturn: 'structured' }
const PHASE_ENERGY = { new: 'reflective', waxingCrescent: 'flowing', firstQuarter: 'fiery', waxingGibbous: 'expansive', full: 'fiery', waningGibbous: 'grounded', lastQuarter: 'structured', waningCrescent: 'reflective' }
const ENERGY_DOTS = { fiery: '#f59e42', grounded: '#6ec07a', flowing: '#5db8d9', expansive: '#c084fc', reflective: '#8eafc4', structured: '#94a3b8' }

const dailyEnergyKey = computed(() => {
  const planet = PLANET_ENERGY[planetaryDayKey.value] || 'reflective'
  const phase = PHASE_ENERGY[moonPhaseKey.value] || 'reflective'
  return planet === phase ? planet : phase
})
const dailyEnergyLabel = computed(() => copy.value.energyLabels?.[dailyEnergyKey.value] || '')
const dailyEnergyColor = computed(() => ENERGY_DOTS[dailyEnergyKey.value] || '#8eafc4')

// ── Streak ──────────────────────────────────────────────────────
const streakLabel = computed(() => {
  if (streakCount.value < 2) return ''
  return copy.value.streakLabel.replace('{n}', streakCount.value)
})

// ── Tarot CTA ───────────────────────────────────────────────────
const tarotCtaText = computed(() => hasTarotToday.value ? copy.value.tarotDoneTitle : copy.value.tarotTitle)

// ── Background tint by time of day ─────────────────────────────
const bgTintClass = computed(() => {
  const h = currentHour.value
  if (h < 5) return 'myday-bg--night'
  if (h < 12) return 'myday-bg--morning'
  if (h < 17) return 'myday-bg--day'
  if (h < 22) return 'myday-bg--evening'
  return 'myday-bg--night'
})

const watchAdvice = computed(() => copy.value.watchByPhase?.[moonPhaseKey.value] || '')
const actionAdvice = computed(() => copy.value.actionByPlanet?.[planetaryDayKey.value] || '')

// ── Progress ────────────────────────────────────────────────────
const progressSteps = computed(() => {
  const steps = [
    { key: 'card', label: copy.value.progressItems.dailyCard, done: hasDailyCardToday.value, action: openDailyCard },
  ]
  if (isLoggedIn.value) {
    steps.push({ key: 'horo', label: copy.value.progressItems.horoscope, done: hasHoroscopeToday.value, action: openHoroscope })
  }
  steps.push({ key: 'tarot', label: copy.value.progressItems.tarot, done: hasTarotToday.value, action: openTarot })
  return steps
})

// ── Daily reflection prompt ─────────────────────────────────────
const dailyPrompt = computed(() => copy.value.promptsByPhase?.[moonPhaseKey.value] || '')

// ── Astro compute ───────────────────────────────────────────────
function computeAstro() {
  const now = new Date()
  const sunLon = eclipticLon(Astronomy.Body.Sun, now)
  const moonLon = eclipticLon(Astronomy.Body.Moon, now)
  const elong = absDiff(moonLon, sunLon)

  moonPhaseKey.value = phaseKey(elong)
  moonSignKey.value = signKeyFromLon(moonLon)

  try {
    const fm = Astronomy.SearchMoonPhase(180, now, 40)
    nextLunarEventDays.value = fm ? Math.max(0, Math.ceil((fm.date.getTime() - now.getTime()) / 86400000)) : -1
  } catch { nextLunarEventDays.value = -1 }

  const rulers = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']
  planetaryDayKey.value = rulers[now.getDay()]
}

function eclipticLon(body, date) {
  const time = typeof Astronomy.MakeTime === 'function' ? Astronomy.MakeTime(date) : new Astronomy.AstroTime(date)
  return Astronomy.Ecliptic(Astronomy.GeoVector(body, time, false)).elon
}
function absDiff(a, b) { let d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }
function phaseKey(elong) {
  const x = ((elong % 360) + 360) % 360
  if (x < 22.5 || x >= 337.5) return 'new'
  if (x < 67.5) return 'waxingCrescent'
  if (x < 112.5) return 'firstQuarter'
  if (x < 157.5) return 'waxingGibbous'
  if (x < 202.5) return 'full'
  if (x < 247.5) return 'waningGibbous'
  if (x < 292.5) return 'lastQuarter'
  return 'waningCrescent'
}
function signKeyFromLon(lon) {
  const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']
  return signs[Math.floor(((lon % 360) + 360) % 360 / 30) % 12]
}

// ── Haptics ─────────────────────────────────────────────────────
async function hapticTap() {
  if (!Capacitor.isNativePlatform()) return
  try { await Haptics.impact({ style: ImpactStyle.Light }) } catch { /* noop */ }
}

// ── Data loaders ────────────────────────────────────────────────
async function loadSignSnapshot() {
  if (!authStore.state.user && !authStore.state.sessionLoaded) await authStore.syncSession({ refresh: false })
  const snapshot = await resolveUserSignSnapshot({
    readProfileCacheValue: async () => { const { value } = await Preferences.get({ key: 'profile_cache_v1' }); return value },
    getCurrentUserId: () => authStore.state.user?.id || '',
    fetchUserDateOfBirthById: async (userId) => { const { data } = await selectAppUser(userId, 6000, 'date_of_birth'); return data?.date_of_birth || '' },
    zodiacFromRawDate,
  })
  signKey.value = snapshot.signKey || ''
}

async function loadDailyCard() { const { cards: c } = await loadDailyCardsSnapshot({ loadTarotData }); cards.value = c }

async function loadHoroscope() {
  horoscopeThemeKey.value = 'energy'
  horoscopeSummaryRaw.value = ''
  if (!signKey.value) return
  const { registry } = await loadHoroscopeRegistry({ locale: locale.value, today: localISODate(), loadLocal, saveLocal, selectHoroscopes })
  const themes = registry?.[signKey.value] || {}
  const chosen = ['energy', 'love', 'career'].find(k => String(themes?.[k]?.summary || '').trim()) || 'energy'
  horoscopeThemeKey.value = chosen
  horoscopeSummaryRaw.value = String(themes?.[chosen]?.summary || '').trim()
}

function refreshActivitySnapshot() {
  hasDailyCardToday.value = hasDailyActivityToday(DAILY_ACTIVITY_KEYS.dailyCard)
  hasHoroscopeToday.value = hasDailyActivityToday(DAILY_ACTIVITY_KEYS.horoscope)
  hasTarotToday.value = hasDailyActivityToday(DAILY_ACTIVITY_KEYS.tarot)
  const streak = readDailyStreak(DAILY_ACTIVITY_KEYS.dailyCard)
  streakCount.value = streak.current || 0
  currentHour.value = new Date().getHours()
}

async function refreshMyDayState({ includeRemote = false } = {}) {
  refreshActivitySnapshot()
  if (includeRemote || !signKey.value) { await loadSignSnapshot(); await loadHoroscope() }
}

// ── Navigation ──────────────────────────────────────────────────
async function goBack() { await hapticTap(); window?.history?.length > 1 ? router.back() : await router.replace({ name: 'menu' }) }
async function openDailyCard() { await hapticTap(); await router.push({ name: 'daily', query: { source: 'my_day' } }) }
async function openHoroscope() { await hapticTap(); await router.push({ name: 'horoscope', query: { source: 'my_day' } }) }
async function openTarot() { await hapticTap(); await router.push({ name: 'tarot', query: { source: 'my_day' } }) }
async function openSignUp() { await hapticTap(); await router.push({ name: 'signUp', query: { source: 'my_day_horo' } }) }

// ── Share ───────────────────────────────────────────────────────
async function shareDailyCard() {
  await hapticTap()
  const text = copy.value.shareText
    .replace('{card}', cardTitle.value)
    .replace('{orientation}', orientationLabel.value)
    .replace('{meaning}', firstSentence(cardMeaning.value))
  try {
    await Share.share({ text })
  } catch { /* user cancelled or share unavailable */ }
}

// ── Pull to refresh ─────────────────────────────────────────────
async function onPullRefresh(done) {
  computeAstro()
  await Promise.all([loadDailyCard(), refreshMyDayState({ includeRemote: true })])
  done()
}

// ── Lifecycle ───────────────────────────────────────────────────
const onFocus = () => { void refreshMyDayState({ includeRemote: true }) }
const onVisChange = () => { if (document?.visibilityState === 'visible') void refreshMyDayState({ includeRemote: true }) }

onMounted(async () => {
  computeAstro()
  await loadDailyCard()
  ready.value = true
  await refreshMyDayState({ includeRemote: true })
  window.addEventListener('focus', onFocus, { passive: true })
  document.addEventListener('visibilitychange', onVisChange, { passive: true })
})
onBeforeUnmount(() => {
  window.removeEventListener('focus', onFocus)
  document.removeEventListener('visibilitychange', onVisChange)
})
</script>


<style scoped lang="scss">
/* ── Shell ───────────────────────────────────────────────────── */
.myday-page { min-height: 100svh; background: #050d15; position: relative; }

.myday-bg {
  position: fixed; inset: 0; pointer-events: none;
  transition: background 0.6s ease;
  background:
    radial-gradient(110% 54% at 50% 0%, rgba(28, 70, 105, 0.30) 0%, rgba(11, 22, 33, 0.12) 40%, transparent 68%),
    linear-gradient(180deg, #08131d, #050d15);
}
.myday-bg--morning {
  background:
    radial-gradient(110% 54% at 50% 0%, rgba(60, 90, 130, 0.28) 0%, rgba(11, 22, 33, 0.12) 40%, transparent 68%),
    linear-gradient(180deg, #0a1520, #050d15);
}
.myday-bg--day {
  background:
    radial-gradient(110% 54% at 50% 0%, rgba(40, 80, 120, 0.22) 0%, rgba(11, 22, 33, 0.10) 40%, transparent 68%),
    linear-gradient(180deg, #09141e, #050d15);
}
.myday-bg--evening {
  background:
    radial-gradient(110% 54% at 50% 0%, rgba(60, 40, 90, 0.28) 0%, rgba(18, 12, 28, 0.14) 40%, transparent 68%),
    linear-gradient(180deg, #0b101a, #050d15);
}
.myday-bg--night {
  background:
    radial-gradient(110% 54% at 50% 0%, rgba(16, 30, 52, 0.34) 0%, rgba(8, 14, 22, 0.16) 40%, transparent 68%),
    linear-gradient(180deg, #060b12, #040a10);
}

.myday-shell {
  position: relative; box-sizing: border-box;
  padding: calc(90px + env(safe-area-inset-top, 0px)) 18px calc(env(safe-area-inset-bottom, 0px) + 18px);
  display: flex; flex-direction: column; gap: 14px;
  max-width: 440px; margin: 0 auto;
  overflow-y: auto; overflow-x: hidden; -webkit-overflow-scrolling: touch;
}

.myday-end { height: 8px; flex-shrink: 0; }

/* ── 1. Header (DailyCard style) ─────────────────────────────── */
.myday-hero {
  position: relative; display: grid; gap: 12px;
  grid-template-columns: 1fr; align-items: center; justify-items: center;
  flex-shrink: 0;
}

.myday-back {
  position: absolute; left: 0; top: 50%; transform: translateY(-50%);
  width: 36px; height: 36px; border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 14, 22, 0.7);
  color: rgba(214, 225, 242, 0.8);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 0;
}

.myday-hero__text {
  display: flex; flex-direction: column; align-items: center;
  gap: 4px; padding: 0 44px; text-align: center;
}
.myday-title {
  font-family: var(--font-accent), serif;
  font-size: 22px; font-weight: 400; letter-spacing: 0.04em;
  color: rgba(235, 242, 255, 0.96); line-height: 1.2;
}
.myday-kicker {
  font-size: 12px; letter-spacing: 0.04em; text-transform: capitalize;
  color: rgba(214, 225, 242, 0.68);
}
.myday-streak {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 999px; margin-top: 2px;
  background: rgba(245, 158, 66, 0.10); border: 1px solid rgba(245, 158, 66, 0.18);
  font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
  color: rgba(245, 186, 100, 0.82);
}

/* ── 2. Card of the Day ──────────────────────────────────────── */
.myday-card-wrap {
  position: relative; flex-shrink: 0;
}

.myday-card {
  width: 100%; padding: 14px; border-radius: 20px; cursor: pointer;
  border: 1px solid rgba(134,177,221,0.12);
  background:
    radial-gradient(100% 130% at 100% 0%, rgba(80,134,181,0.16) 0%, transparent 54%),
    linear-gradient(160deg, rgba(11,19,30,0.96), rgba(7,13,22,0.98));
  box-shadow: 0 14px 36px rgba(0,0,0,0.20);
  display: flex; align-items: center; gap: 14px;
  text-align: left;
}

.myday-card__visual { flex-shrink: 0; }

.myday-card__thumb {
  display: block; width: 72px; height: 116px; border-radius: 10px; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.05);
  box-shadow: 0 8px 20px rgba(0,0,0,0.24);
}
.myday-card__img { width: 100%; height: 100%; object-fit: cover; display: block; }
.myday-card__thumb--rev .myday-card__img { transform: rotate(180deg); }
.myday-card__placeholder { display: block; width: 100%; height: 100%; background: linear-gradient(145deg, rgba(66,96,133,0.3), rgba(34,50,68,0.7)); }

.myday-card__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.myday-card__eyebrow {
  font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
  color: rgba(191,216,240,0.48);
}
.myday-card__name {
  font-family: var(--font-accent), serif;
  font-size: 19px; font-weight: 400; letter-spacing: 0.02em;
  color: rgba(255,255,255,0.94); line-height: 1.2;
}
.myday-card__meta { font-size: 11px; font-weight: 600; color: rgba(178,202,226,0.44); }
.myday-card__meaning {
  font-size: 12px; color: rgba(237,244,252,0.48); line-height: 1.48;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  margin-top: 2px;
}
.myday-card__chevron { flex-shrink: 0; color: rgba(255,255,255,0.24); }

.myday-share {
  position: absolute; right: 10px; bottom: -14px;
  width: 28px; height: 28px; border-radius: 50%;
  border: 1px solid rgba(255,255,255,0.10);
  background: rgba(10,14,22,0.85); color: rgba(214,225,242,0.6);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; padding: 0; transition: all 0.15s;
  &:active { transform: scale(0.92); }
}

/* ── Skeleton ───────────────────────────────────────────────────── */
.myday-skel {
  border-radius: 20px; flex-shrink: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}
.myday-skel--card { height: 144px; }
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── 3. Cosmic strip ─────────────────────────────────────────── */
.myday-cosmic {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 6px 0; flex-shrink: 0; flex-wrap: wrap;
}
.myday-cosmic__item { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.myday-cosmic__dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.myday-cosmic__glyph { font-size: 13px; line-height: 1; opacity: 0.6; }
.myday-cosmic__text { font-size: 11px; font-weight: 600; color: rgba(200,218,238,0.46); white-space: nowrap; }
.myday-cosmic__sep { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,0.14); flex-shrink: 0; }

/* ── 4. Progress ─────────────────────────────────────────────── */
.myday-progress {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  flex-shrink: 0;
}

.myday-progress__step {
  display: flex; align-items: center; gap: 5px;
  padding: 7px 12px; border-radius: 999px; cursor: pointer;
  background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
  transition: all 0.18s;
}
.myday-progress__step--done {
  background: rgba(110,165,214,0.10); border-color: rgba(110,165,214,0.22);
}
.myday-progress__dot {
  width: 18px; height: 18px; border-radius: 50%;
  border: 1.5px solid rgba(255,255,255,0.14); background: transparent;
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.4); font-size: 10px; transition: all 0.18s;
}
.myday-progress__step--done .myday-progress__dot {
  border-color: rgba(110,165,214,0.5); background: rgba(110,165,214,0.16); color: rgba(174,214,252,0.9);
}
.myday-progress__label {
  font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.38);
  letter-spacing: 0.01em;
}
.myday-progress__step--done .myday-progress__label { color: rgba(174,214,252,0.70); }

/* ── 5. Guidance ─────────────────────────────────────────────── */
.myday-guidance { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex-shrink: 0; }

.myday-guidance__item {
  padding: 12px; border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.03);
  display: flex; flex-direction: column; gap: 5px;
}
.myday-guidance__tag {
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: rgba(178,202,226,0.38);
}
.myday-guidance__body { font-size: 12px; line-height: 1.5; color: rgba(237,244,252,0.56); }

/* ── 6. Horoscope ────────────────────────────────────────────── */
.myday-horo {
  width: 100%; padding: 14px; border-radius: 16px; cursor: pointer;
  border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.03);
  display: flex; align-items: center; gap: 12px; text-align: left; flex-shrink: 0;
}
.myday-horo--locked { border-color: rgba(134,177,221,0.10); }
.myday-horo__left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.myday-horo__tag {
  font-size: 12px; font-weight: 700; color: rgba(174,206,237,0.62); line-height: 1;
}
.myday-horo__text {
  font-size: 12px; line-height: 1.48; color: rgba(237,244,252,0.52);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.myday-horo__text--dim { color: rgba(255,255,255,0.32); }
.myday-horo__chevron { flex-shrink: 0; color: rgba(255,255,255,0.2); }

/* ── 7. Reflection prompt ────────────────────────────────────── */
.myday-reflect {
  padding: 16px; border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.03);
  text-align: center; flex-shrink: 0;
  display: flex; flex-direction: column; gap: 6px; align-items: center;
}
.myday-reflect__tag {
  font-size: 10px; font-weight: 600; letter-spacing: 0.06em;
  color: rgba(178,202,226,0.36);
}
.myday-reflect__prompt {
  font-family: var(--font-accent), serif;
  font-size: 15px; font-style: italic; font-weight: 400;
  line-height: 1.55; letter-spacing: 0.01em;
  color: rgba(214, 225, 242, 0.54);
}

/* ── 7. Tarot CTA ────────────────────────────────────────────── */
.myday-tarot {
  width: 100%; padding: 13px 16px; border-radius: 14px; cursor: pointer;
  border: 1px solid rgba(134,177,221,0.08);
  background: radial-gradient(140% 100% at 0% 100%, rgba(90,60,140,0.10) 0%, transparent 48%), rgba(255,255,255,0.03);
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  flex-shrink: 0; color: rgba(214,229,245,0.64);
}
.myday-tarot__text { font-size: 13px; font-weight: 600; }
.myday-tarot--done {
  border-color: rgba(110,165,214,0.14);
  background: rgba(110,165,214,0.05);
}

/* ── Entrance animation ──────────────────────────────────────── */
.myday-anim {
  opacity: 0; transform: translateY(12px);
  animation: myday-in 0.45s ease-out forwards;
  animation-delay: calc(var(--d, 0) * 0.06s + 0.05s);
}
@keyframes myday-in {
  to { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-height: 700px) {
  .myday-shell { gap: 10px; }
  .myday-card { padding: 12px; }
  .myday-card__thumb { height: 96px; width: 60px; }
  .myday-card__name { font-size: 17px; }
  .myday-guidance__item { padding: 10px; }
}

@media (hover: hover) {
  .myday-card:hover { border-color: rgba(134,177,221,0.22); }
  .myday-progress__step:hover { border-color: rgba(255,255,255,0.12); }
  .myday-horo:hover { border-color: rgba(255,255,255,0.10); }
  .myday-tarot:hover { border-color: rgba(134,177,221,0.16); }
  .myday-share:hover { color: rgba(214,225,242,0.9); border-color: rgba(255,255,255,0.18); }
}
</style>
