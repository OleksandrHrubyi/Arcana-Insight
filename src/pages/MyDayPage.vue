<template>
  <q-page class="myday-page">
    <div class="myday-bg" aria-hidden="true"></div>

    <div class="myday-shell">

      <!-- 1. Topbar -->
      <header class="myday-topbar">
        <button type="button" class="myday-back" @click="goBack">
          <q-icon name="chevron_left" size="20px" />
        </button>
        <div class="myday-topbar__center">
          <span class="myday-topbar__title">{{ copy.title }}</span>
          <span class="myday-topbar__date">{{ todayLabel }}</span>
        </div>
        <div class="myday-topbar__ghost"></div>
      </header>

      <!-- 2. Hero launcher (stretches to fill remaining space) -->
      <button type="button" class="myday-launcher" @click="openDailyCard">
        <span class="myday-launcher__top">
          <span class="myday-chips">
            <span class="myday-chip">{{ signLabel }}</span>
            <span class="myday-chip">{{ moonPhaseLabel }}</span>
          </span>
          <span class="myday-launcher__eyebrow">{{ copy.heroEyebrow }}</span>
        </span>

        <span class="myday-launcher__body">
          <span class="myday-launcher__copy">
            <span class="myday-launcher__title">{{ cardTitle }}</span>
            <span class="myday-launcher__meta">{{ orientationLabel }}</span>
            <span class="myday-launcher__hint">{{ heroSummary }}</span>
            <span v-if="cardKeywords.length" class="myday-launcher__tags">
              <span v-for="word in cardKeywords" :key="word" class="myday-tag">{{ word }}</span>
            </span>
          </span>
          <span class="myday-launcher__visual">
            <span
              class="myday-card-thumb"
              :class="{ 'myday-card-thumb--reversed': dailyOrientation === 'reversed' }"
            >
              <img
                v-if="cardImage"
                class="myday-card-thumb__img"
                :src="cardImage"
                :alt="cardTitle"
              />
              <span v-else class="myday-card-thumb__back" aria-hidden="true"></span>
            </span>
          </span>
        </span>

        <span class="myday-launcher__signals">
          <span class="myday-signal-item">
            <span class="myday-signal-item__label">{{ copy.labels.focus }}</span>
            <span class="myday-signal-item__val">{{ signalFocus }}</span>
          </span>
          <span class="myday-signal-sep" aria-hidden="true">·</span>
          <span class="myday-signal-item">
            <span class="myday-signal-item__label">{{ copy.labels.watch }}</span>
            <span class="myday-signal-item__val">{{ signalWatch }}</span>
          </span>
          <span class="myday-signal-sep" aria-hidden="true">·</span>
          <span class="myday-signal-item myday-signal-item--accent">
            <span class="myday-signal-item__label">{{ copy.labels.action }}</span>
            <span class="myday-signal-item__val">{{ signalAction }}</span>
          </span>
        </span>

        <span class="myday-launcher__cta">
          <span>{{ copy.cta.openCard }}</span>
          <q-icon name="chevron_right" size="13px" />
        </span>
      </button>

      <!-- 3. Action dock -->
      <div class="myday-action-dock">
        <button
          type="button"
          class="myday-action-tile myday-action-tile--horoscope"
          @click="openHoroscope"
        >
          <span class="myday-action-tile__eyebrow">{{ copy.sections.horoscope }}</span>
          <span class="myday-action-tile__title">{{ horoscopeTitle }}</span>
          <span class="myday-action-tile__text">{{ horoscopePreview }}</span>
        </button>
        <button
          type="button"
          class="myday-action-tile myday-action-tile--tarot"
          @click="openTarot"
        >
          <span class="myday-action-tile__eyebrow">{{ copy.sections.tarot }}</span>
          <span class="myday-action-tile__title">{{ copy.tarotTitle }}</span>
          <span class="myday-action-tile__text">{{ copy.tarotText }}</span>
        </button>
      </div>

      <!-- 4. Ritual -->
      <div class="myday-ritual">
        <div class="myday-ritual__head">
          <span class="myday-ritual__title">{{ ritualHeading }}</span>
          <span v-if="ritualSavedLabel" class="myday-saved-badge">{{ ritualSavedLabel }}</span>
          <div class="myday-ritual-switch">
            <button
              type="button"
              :class="['myday-switch-btn', { 'myday-switch-btn--active': ritualMode === 'intention' }]"
              @click="ritualMode = 'intention'"
            >{{ copy.ritualMorning }}</button>
            <button
              type="button"
              :class="['myday-switch-btn', { 'myday-switch-btn--active': ritualMode === 'checkin' }]"
              @click="ritualMode = 'checkin'"
            >{{ copy.ritualEvening }}</button>
          </div>
        </div>

        <div class="myday-ritual__inputs">
          <div v-if="ritualMode === 'checkin'" class="myday-mood-row">
            <button
              v-for="option in moodOptions"
              :key="option.value"
              type="button"
              :class="['myday-mood-chip', { 'myday-mood-chip--active': selectedMood === option.value }]"
              @click="selectedMood = option.value"
            >{{ option.emoji }}</button>
          </div>

          <div class="myday-input-row">
            <input
              v-if="ritualMode === 'intention'"
              v-model="intentionNote"
              class="myday-ritual-input"
              :placeholder="copy.intentionPlaceholder"
              maxlength="140"
            />
            <input
              v-else
              v-model="checkInNote"
              class="myday-ritual-input"
              :placeholder="copy.checkInPlaceholder"
              maxlength="160"
            />
            <button type="button" class="myday-ritual-save" @click="saveActiveRitual">
              {{ ritualButtonLabel }}
            </button>
          </div>
        </div>
      </div>

    </div>
  </q-page>
</template>


<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Preferences } from '@capacitor/preferences'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'
import * as Astronomy from 'astronomy-engine'
import { currentLocale, t } from 'src/i18n'
import { localISODate } from 'src/helpers/date.ts'
import { loadDailyCardsSnapshot } from 'src/helpers/dailyCardCore.js'
import { loadTarotData } from 'src/helpers/tarotData'
import { loadHoroscopeRegistry } from 'src/helpers/horoscopeContentCore.js'
import { loadLocal, saveLocal } from 'src/helpers/localStorageSaver.js'
import { resolveUserSignSnapshot } from 'src/helpers/zodiacUserSignCore.js'
import { useAuthStore } from 'stores/authStore.js'
import { selectAppUser, selectHoroscopes } from 'src/services/supabaseNative'

const router = useRouter()
const authStore = useAuthStore()
const locale = computed(() => (currentLocale.value || 'en').toLowerCase().startsWith('uk') ? 'uk' : 'en')
const tt = (key) => t(locale.value, key)

const CHECKIN_KEY_PREFIX = 'arcana_my_day_checkin_v1'
const INTENTION_KEY_PREFIX = 'arcana_my_day_intention_v1'
const ANON_DAILY_SEED_KEY = 'arcana_daily_seed_v1'

const cards = ref([])
const signKey = ref('')
const horoscopeSummaryRaw = ref('')
const horoscopeThemeKey = ref('spirit')
const moonPhaseKey = ref('new')
const moonSignKey = ref('')
const planetaryDayKey = ref('moon')
const nextLunarEventDays = ref(-1)
const selectedMood = ref('')
const checkInNote = ref('')
const savedCheckInAt = ref('')
const intentionNote = ref('')
const savedIntentionAt = ref('')
const ritualMode = ref(new Date().getHours() >= 18 ? 'checkin' : 'intention')

const copyByLocale = {
  en: {
    title: 'My Day',
    heroEyebrow: 'TODAY SIGNAL',
    fallbackSign: 'Your sign',
    horoscopeFallbackTitle: 'Today energy',
    horoscopeFallback: 'Your horoscope will appear here once your sign and daily content are ready.',
    cardFallbackTitle: 'Today card',
    cardFallbackMeaning: 'Your daily card will appear here once the deck is ready.',
    savedPrefix: 'Saved',
    labels: {
      sign: 'Sign',
      moon: 'Moon',
      focus: 'Focus',
      watch: 'Notice',
      action: 'Move',
    },
    sections: {
      horoscope: 'HOROSCOPE',
      tarot: 'TAROT',
      ritual: 'QUICK RITUAL',
    },
    cta: {
      openCard: 'Open your card',
      openHoroscope: 'Open horoscope',
      askTarot: 'Ask tarot',
    },
    tarotTitle: 'Ask a real question',
    tarotText: 'Go deeper when the day needs more than a mood.',
    ritualMorning: 'Morning',
    ritualEvening: 'Evening',
    ritualHeadingIntention: 'Set the tone for the day',
    ritualHeadingCheckIn: 'Close the day consciously',
    intentionPlaceholder: 'What do you want to embody today?',
    checkInPlaceholder: 'How did the day actually feel?',
    checkInPrompt: 'Choose the mood that matched the day, then leave one short note.',
    returnTomorrowTonight: 'Tonight is already shifting. Come back tomorrow for a new signal.',
    returnTomorrowDefault: 'A new card and new cosmic weather will meet you tomorrow.',
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
    moods: [
      { value: 'grounded', emoji: '🌿', label: 'Grounded' },
      { value: 'open', emoji: '☀️', label: 'Open' },
      { value: 'tender', emoji: '🌙', label: 'Tender' },
      { value: 'overthinking', emoji: '🫧', label: 'Overthinking' },
    ],
    save: {
      idle: 'Save check-in',
      done: 'Saved',
    },
    intentionSave: {
      idle: 'Save',
      done: 'Saved',
    },
  },
  uk: {
    title: 'My Day',
    heroEyebrow: 'СИГНАЛ ДНЯ',
    fallbackSign: 'Твій знак',
    horoscopeFallbackTitle: 'Енергія дня',
    horoscopeFallback: 'Твій гороскоп з’явиться тут, коли будуть готові знак і денний контент.',
    cardFallbackTitle: 'Карта на сьогодні',
    cardFallbackMeaning: 'Твоя карта дня з’явиться тут, щойно колода буде готова.',
    savedPrefix: 'Збережено',
    labels: {
      sign: 'Знак',
      moon: 'Місяць',
      focus: 'Фокус',
      watch: 'Помічай',
      action: 'Крок',
    },
    sections: {
      horoscope: 'ГОРОСКОП',
      tarot: 'ТАРО',
      ritual: 'ШВИДКИЙ РИТУАЛ',
    },
    cta: {
      openCard: 'Відкрити карту',
      openHoroscope: 'Відкрити гороскоп',
      askTarot: 'Запитати таро',
    },
    tarotTitle: 'Поставити справжнє питання',
    tarotText: 'Йди глибше, коли дня вже мало і потрібен чесний інсайт.',
    ritualMorning: 'Ранок',
    ritualEvening: 'Вечір',
    ritualHeadingIntention: 'Задай тон своєму дню',
    ritualHeadingCheckIn: 'Свідомо закрий цей день',
    intentionPlaceholder: 'Що ти хочеш уособлювати сьогодні?',
    checkInPlaceholder: 'Як день відчувався насправді?',
    checkInPrompt: 'Обери настрій дня і залиш одну коротку нотатку.',
    returnTomorrowTonight: 'Ніч уже змінює ритм. Завтра тут буде новий сигнал.',
    returnTomorrowDefault: 'Завтра на тебе чекатимуть нова карта і нова космічна погода.',
    watchByPhase: {
      new: 'Бережи енергію і тримай початки простими.',
      waxingCrescent: 'Йди за тим, що оживає, ще до пояснень.',
      firstQuarter: 'Напруга сьогодні просить вибору.',
      waxingGibbous: 'Уточнюй те, що росте, а не запускай ще більше.',
      full: 'Емоції гучніші зазвичай; чесність приносить ясність.',
      waningGibbous: 'Помічай те, що просить завершення або вдячності.',
      lastQuarter: 'Відпусти результати, які вже дали свій урок.',
      waningCrescent: 'Відпочинь, спростись і слухай перед дією.',
    },
    actionByPlanet: {
      sun: 'Зроби один видимий крок до того, чого хочеш.',
      moon: 'Спочатку назви своє справжнє відчуття.',
      mars: 'Заверши одну складну справу, а не розкидайся.',
      mercury: 'Надішли повідомлення або запиши думку.',
      jupiter: 'Обери ширший погляд і підтримай сміливу ідею.',
      venus: 'Свідомо додай у день красу, ніжність або близькість.',
      saturn: 'Дай структуру тій зоні, де зараз хитко.',
    },
    promptsByPhase: {
      new: 'Що сьогодні хоче тихого початку?',
      waxingCrescent: 'Чому сьогодні варто довіритись раніше за ясність?',
      firstQuarter: 'Яке рішення чекає на твою сміливість?',
      waxingGibbous: 'Що просить уточнення, а не тиску?',
      full: 'Яка правда просить чесного голосу?',
      waningGibbous: 'За що можна подякувати перед відпусканням?',
      lastQuarter: 'Що ти вже готовий відпустити?',
      waningCrescent: 'Де м’якість допоможе більше, ніж сила?',
    },
    moods: [
      { value: 'grounded', emoji: '🌿', label: 'Заземлено' },
      { value: 'open', emoji: '☀️', label: 'Відкрито' },
      { value: 'tender', emoji: '🌙', label: 'Тонко' },
      { value: 'overthinking', emoji: '🫧', label: 'Перемислення' },
    ],
    save: {
      idle: 'Зберегти',
      done: 'Збережено',
    },
    intentionSave: {
      idle: 'Зберегти',
      done: 'Збережено',
    },
  },
}

const copy = computed(() => copyByLocale[locale.value] || copyByLocale.en)
const moodOptions = computed(() => copy.value.moods)

const zodiacFromRawDate = (rawDate) => {
  const raw = String(rawDate || '').trim()
  if (!raw) return ''

  let day = 0
  let month = 0

  if (raw.includes('.')) {
    const parts = raw.split('.').map((value) => parseInt(value, 10))
    day = parts[0] || 0
    month = parts[1] || 0
  } else if (raw.includes('-')) {
    const parts = raw.split('-').map((value) => parseInt(value, 10))
    month = parts[1] || 0
    day = parts[2] || 0
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

const hashString = (value) => {
  let hash = 0
  const raw = String(value || '')
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
  }
  return hash
}

const getOrCreateAnonSeed = () => {
  if (typeof window === 'undefined') return 'anon'
  const stored = localStorage.getItem(ANON_DAILY_SEED_KEY)
  if (stored) return stored

  const next =
    (window.crypto &&
      typeof window.crypto.randomUUID === 'function' &&
      window.crypto.randomUUID()) ||
    `${Date.now()}-${Math.random().toString(36).slice(2)}`

  localStorage.setItem(ANON_DAILY_SEED_KEY, next)
  return next
}

const dailySeed = computed(() => {
  const userId = authStore.state.user?.id
  const identity = userId || getOrCreateAnonSeed()
  return `${localISODate()}::${identity}`
})

const dailyIndex = computed(() => {
  if (!cards.value.length) return 0
  return hashString(`${dailySeed.value}::card`) % cards.value.length
})

const dailyOrientation = computed(() => {
  const hash = hashString(`${dailySeed.value}::orientation`)
  return hash % 2 === 0 ? 'upright' : 'reversed'
})

const dailyCard = computed(() => cards.value[dailyIndex.value] || null)
const cardTitle = computed(
  () => dailyCard.value?.name?.[locale.value] || dailyCard.value?.name?.en || copy.value.cardFallbackTitle,
)
const cardImage = computed(() => {
  const file = dailyCard.value?.file
  return file ? `/images/cards/${file}` : ''
})
const cardMeaning = computed(
  () =>
    dailyCard.value?.meaning?.[dailyOrientation.value]?.[locale.value] ||
    dailyCard.value?.meaning?.[dailyOrientation.value]?.en ||
    copy.value.cardFallbackMeaning,
)
const cardKeywords = computed(() => {
  const raw = dailyCard.value?.keywords?.[locale.value] || dailyCard.value?.keywords?.en || []
  return raw.slice(0, 3)
})
const orientationLabel = computed(() =>
  dailyOrientation.value === 'reversed' ? tt('cardsPage.reversed') : tt('cardsPage.upright'),
)

const horoscopeTheme = computed(() => horoscopeThemeKey.value || 'spirit')
const horoscopeTitle = computed(() => {
  const key = horoscopeTheme.value === 'career'
    ? 'career'
    : horoscopeTheme.value === 'love'
      ? 'love'
      : 'spirit'
  return tt(key)
})
const horoscopeSummary = computed(() => horoscopeSummaryRaw.value || copy.value.horoscopeFallback)
const horoscopePreview = computed(() => firstSentence(horoscopeSummary.value))

const signLabel = computed(() => signKey.value ? tt(`zodiac.${signKey.value}`) : copy.value.fallbackSign)

const phaseEmoji = {
  new: '🌑',
  waxingCrescent: '🌒',
  firstQuarter: '🌓',
  waxingGibbous: '🌔',
  full: '🌕',
  waningGibbous: '🌖',
  lastQuarter: '🌗',
  waningCrescent: '🌘',
}

const moonPhaseLabel = computed(() => {
  const title = tt(`astro.phases.${moonPhaseKey.value}`)
  return `${phaseEmoji[moonPhaseKey.value] || '🌙'} ${title}`
})

const dailyFocus = computed(() => firstSentence(horoscopeSummary.value) || copy.value.horoscopeFallback)
const watchFor = computed(() => copy.value.watchByPhase[moonPhaseKey.value] || copy.value.horoscopeFallback)
const dailyAction = computed(() => copy.value.actionByPlanet[planetaryDayKey.value] || copy.value.actionByPlanet.moon)
const heroSummary = computed(() => firstSentence(cardMeaning.value) || dailyFocus.value)
const signalFocus = computed(() => compactText(dailyFocus.value, 6, 40))
const signalWatch = computed(() => compactText(watchFor.value, 6, 40))
const signalAction = computed(() => compactText(dailyAction.value, 6, 40))

const todayLabel = computed(() => {
  try {
    return new Intl.DateTimeFormat(locale.value === 'uk' ? 'uk-UA' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(new Date())
  } catch {
    return localISODate()
  }
})

const saveButtonLabel = computed(() => savedCheckInAt.value ? copy.value.save.done : copy.value.save.idle)
const intentionButtonLabel = computed(() =>
  savedIntentionAt.value ? copy.value.intentionSave.done : copy.value.intentionSave.idle,
)
const savedCheckInAtLabel = computed(() => {
  if (!savedCheckInAt.value) return ''
  const date = new Date(savedCheckInAt.value)
  if (Number.isNaN(date.getTime())) return copy.value.savedPrefix
  try {
    const formatted = new Intl.DateTimeFormat(locale.value === 'uk' ? 'uk-UA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
    return `${copy.value.savedPrefix} ${formatted}`
  } catch {
    return copy.value.savedPrefix
  }
})
const savedIntentionAtLabel = computed(() => {
  if (!savedIntentionAt.value) return ''
  const date = new Date(savedIntentionAt.value)
  if (Number.isNaN(date.getTime())) return copy.value.savedPrefix
  try {
    const formatted = new Intl.DateTimeFormat(locale.value === 'uk' ? 'uk-UA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
    return `${copy.value.savedPrefix} ${formatted}`
  } catch {
    return copy.value.savedPrefix
  }
})
const ritualHeading = computed(() =>
  ritualMode.value === 'intention' ? copy.value.ritualHeadingIntention : copy.value.ritualHeadingCheckIn,
)
const ritualButtonLabel = computed(() =>
  ritualMode.value === 'intention' ? intentionButtonLabel.value : saveButtonLabel.value,
)
const ritualSavedLabel = computed(() =>
  ritualMode.value === 'intention' ? savedIntentionAtLabel.value : savedCheckInAtLabel.value,
)

function firstSentence(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  const match = text.match(/.*?[.!?](\s|$)/)
  return match ? match[0].trim() : text
}

function compactText(value, maxWords = 7, maxChars = 56) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''

  const words = text.split(' ').filter(Boolean)
  let next = words.slice(0, maxWords).join(' ')
  if (next.length > maxChars) next = next.slice(0, maxChars).trim()

  if (next.length < text.length) {
    return `${next.replace(/[.,;:!?-]+$/u, '').trim()}…`
  }
  return next
}

function computeAstro() {
  const now = new Date()
  const t1 = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  const sunLon = astroEclipticLon(Astronomy.Body.Sun, now)
  const moonLon = astroEclipticLon(Astronomy.Body.Moon, now)
  const merc0 = astroEclipticLon(Astronomy.Body.Mercury, now)
  const merc1 = astroEclipticLon(Astronomy.Body.Mercury, t1)
  const elong = astroAbsDiff(moonLon, sunLon)
  const nextLunarEvent = astroNextLunarEvent(now)

  moonPhaseKey.value = astroPhaseKey(elong)
  moonSignKey.value = astroSignKey(moonLon)
  nextLunarEventDays.value = nextLunarEvent?.daysUntil ?? -1

  const rulers = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']
  planetaryDayKey.value = rulers[new Date().getDay()]

  if (astroSignedDelta(merc1, merc0) < 0 && !horoscopeSummaryRaw.value) {
    horoscopeSummaryRaw.value = locale.value === 'uk'
      ? 'Сьогодні краще говорити простіше і перевіряти деталі двічі.'
      : 'Today works better when you keep communication simple and double-check details.'
  }
}

function astroEclipticLon(body, date) {
  const time = typeof Astronomy.MakeTime === 'function'
    ? Astronomy.MakeTime(date)
    : new Astronomy.AstroTime(date)
  return Astronomy.Ecliptic(Astronomy.GeoVector(body, time, false)).elon
}

function astroAbsDiff(a, b) {
  let d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

function astroSignedDelta(next, prev) {
  let d = (next - prev) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

function astroPhaseKey(elong) {
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

function astroNextLunarEvent(now) {
  try {
    const fullMoonTime = Astronomy.SearchMoonPhase(180, now, 40)
    if (!fullMoonTime) return null
    const daysUntil = Math.max(0, Math.ceil((fullMoonTime.date.getTime() - now.getTime()) / 86400000))
    return { daysUntil }
  } catch {
    return null
  }
}

function astroSignKey(lon) {
  const signs = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces']
  return signs[Math.floor(((lon % 360) + 360) % 360 / 30) % 12]
}

async function hapticTap() {
  if (!Capacitor.isNativePlatform()) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // ignore haptic errors
  }
}

async function loadSignSnapshot() {
  if (!authStore.state.user && !authStore.state.sessionLoaded) {
    await authStore.syncSession({ refresh: false })
  }
  const snapshot = await resolveUserSignSnapshot({
    readProfileCacheValue: async () => {
      const { value } = await Preferences.get({ key: 'profile_cache_v1' })
      return value
    },
    getCurrentUserId: () => authStore.state.user?.id || '',
    fetchUserDateOfBirthById: async (userId) => {
      const { data } = await selectAppUser(userId, 6000, 'date_of_birth')
      return data?.date_of_birth || ''
    },
    zodiacFromRawDate,
  })
  signKey.value = snapshot.signKey || ''
}

async function loadDailyCard() {
  const { cards: nextCards } = await loadDailyCardsSnapshot({ loadTarotData })
  cards.value = nextCards
}

async function loadHoroscope() {
  const activeSign = signKey.value
  if (!activeSign) return
  const { registry } = await loadHoroscopeRegistry({
    locale: locale.value,
    today: localISODate(),
    loadLocal,
    saveLocal,
    selectHoroscopes,
  })
  const themes = registry?.[activeSign] || {}
  const preferredOrder = ['spirit', 'love', 'career']
  const chosenTheme = preferredOrder.find((key) => String(themes?.[key]?.summary || '').trim()) || 'spirit'
  horoscopeThemeKey.value = chosenTheme
  horoscopeSummaryRaw.value = String(themes?.[chosenTheme]?.summary || '').trim()
}

async function loadCheckIn() {
  const { value } = await Preferences.get({ key: `${CHECKIN_KEY_PREFIX}:${localISODate()}` })
  if (!value) return
  try {
    const parsed = JSON.parse(value)
    selectedMood.value = String(parsed?.mood || '')
    checkInNote.value = String(parsed?.note || '')
    savedCheckInAt.value = String(parsed?.savedAt || '')
  } catch {
    // ignore malformed saved check-in
  }
}

async function loadIntention() {
  const { value } = await Preferences.get({ key: `${INTENTION_KEY_PREFIX}:${localISODate()}` })
  if (!value) return
  try {
    const parsed = JSON.parse(value)
    intentionNote.value = String(parsed?.note || '')
    savedIntentionAt.value = String(parsed?.savedAt || '')
  } catch {
    // ignore malformed saved intention
  }
}

async function saveCheckIn() {
  await hapticTap()
  const payload = {
    mood: selectedMood.value,
    note: String(checkInNote.value || '').trim(),
    savedAt: new Date().toISOString(),
  }
  await Preferences.set({
    key: `${CHECKIN_KEY_PREFIX}:${localISODate()}`,
    value: JSON.stringify(payload),
  })
  savedCheckInAt.value = payload.savedAt
}

async function saveIntention() {
  await hapticTap()
  const payload = {
    note: String(intentionNote.value || '').trim(),
    savedAt: new Date().toISOString(),
  }
  await Preferences.set({
    key: `${INTENTION_KEY_PREFIX}:${localISODate()}`,
    value: JSON.stringify(payload),
  })
  savedIntentionAt.value = payload.savedAt
}

async function saveActiveRitual() {
  if (ritualMode.value === 'intention') {
    await saveIntention()
    return
  }
  await saveCheckIn()
}

async function goBack() {
  await hapticTap()
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back()
    return
  }
  await router.replace({ name: 'menu' })
}

async function openDailyCard() {
  await hapticTap()
  await router.push({ name: 'daily', query: { source: 'my_day', entry: 'hero_card' } })
}

async function openHoroscope() {
  await hapticTap()
  await router.push({ name: 'horoscope', query: { source: 'my_day', theme: horoscopeTheme.value } })
}

async function openTarot() {
  await hapticTap()
  await router.push({ name: 'tarot', query: { source: 'my_day', focus: horoscopeTheme.value } })
}

onMounted(async () => {
  computeAstro()
  await loadIntention()
  await loadCheckIn()
  await loadSignSnapshot()
  await loadDailyCard()
  await loadHoroscope()
})
</script>



<style scoped lang="scss">
// ── Page shell ────────────────────────────────────────────────
.myday-page {
  height: 100svh;
  overflow: hidden;
  background: #050d15;
  position: relative;
}

.myday-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  pointer-events: none;
}

// Padding matches /daily: top = 90px + safe-area, bottom = bottom-nav 86px + safe-area
.myday-shell {
  position: relative;
  height: 100%;
  box-sizing: border-box;
  padding:
    calc(90px + env(safe-area-inset-top, 0px))
    16px
    calc(86px + env(safe-area-inset-bottom, 0px) + 8px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: 10px;
  max-width: 450px;
  margin: 0 auto;
  overflow: hidden;
}

// ── Topbar ────────────────────────────────────────────────────
.myday-topbar {
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  gap: 4px;
}

.myday-back {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
}

.myday-topbar__center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.myday-topbar__title {
  font-size: 15px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.01em;
  line-height: 1.2;
}

.myday-topbar__date {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.38);
  letter-spacing: 0.02em;
  line-height: 1;
}

.myday-topbar__ghost {
  width: 36px;
}

// ── Hero launcher ─────────────────────────────────────────────
.myday-launcher {
  min-height: 0;
  width: 100%;
  padding: 14px 16px;
  border-radius: 20px;
  border: 1px solid rgba(163, 212, 255, 0.18);
  background:
    radial-gradient(120% 160% at 100% 0%, rgba(125, 188, 255, 0.22) 0%, rgba(125, 188, 255, 0) 55%),
    linear-gradient(164deg, rgba(11, 18, 30, 0.97), rgba(7, 12, 22, 0.99));
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.35);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
  overflow: hidden;
}

.myday-launcher__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.myday-chips {
  display: flex;
  gap: 5px;
  flex-wrap: nowrap;
}

.myday-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  background: rgba(147, 197, 253, 0.1);
  border: 1px solid rgba(147, 197, 253, 0.18);
  color: rgba(147, 197, 253, 0.75);
  white-space: nowrap;
}

.myday-launcher__eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(147, 197, 253, 0.5);
  white-space: nowrap;
}

.myday-launcher__body {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.myday-launcher__copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.myday-launcher__title {
  font-size: 20px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.myday-launcher__meta {
  font-size: 11px;
  color: rgba(147, 197, 253, 0.55);
  font-weight: 500;
}

.myday-launcher__hint {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.myday-launcher__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 2px;
}

.myday-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5);
}

// Card thumbnail
.myday-launcher__visual {
  flex-shrink: 0;
}

.myday-card-thumb {
  display: block;
  width: 62px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
}

.myday-card-thumb__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.myday-card-thumb--reversed .myday-card-thumb__img {
  transform: rotate(180deg);
}

.myday-card-thumb__back {
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(100, 149, 237, 0.15), rgba(72, 61, 139, 0.2));
}

// Signals strip (inside hero)
.myday-launcher__signals {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  flex-wrap: nowrap;
  overflow: hidden;
}

.myday-signal-sep {
  color: rgba(255, 255, 255, 0.2);
  font-size: 10px;
  flex-shrink: 0;
}

.myday-signal-item {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
  flex-shrink: 1;
  overflow: hidden;
}

.myday-signal-item__label {
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.28);
  white-space: nowrap;
}

.myday-signal-item__val {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.myday-signal-item--accent .myday-signal-item__val {
  color: rgba(147, 197, 253, 0.8);
}

// CTA row
.myday-launcher__cta {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(147, 197, 253, 0.7);
  letter-spacing: 0.01em;
  flex-shrink: 0;
  align-self: flex-end;
}

// ── Action dock ───────────────────────────────────────────────
.myday-action-dock {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.myday-action-tile {
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: left;
  overflow: hidden;
  transition: background 0.15s;

  &:active {
    background: rgba(255, 255, 255, 0.07);
  }
}

.myday-action-tile--horoscope {
  border-color: rgba(251, 191, 36, 0.18);
  background: linear-gradient(145deg, rgba(251, 191, 36, 0.07), rgba(251, 191, 36, 0.03));
}

.myday-action-tile--tarot {
  border-color: rgba(167, 139, 250, 0.18);
  background: linear-gradient(145deg, rgba(167, 139, 250, 0.08), rgba(167, 139, 250, 0.03));
}

.myday-action-tile__eyebrow {
  display: block;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  line-height: 1;
}

.myday-action-tile__title {
  display: block;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.88);
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.myday-action-tile__text {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

// ── Ritual ────────────────────────────────────────────────────
.myday-ritual {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.03);
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.myday-ritual__head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}

.myday-ritual__title {
  font-size: 12px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.65);
  white-space: nowrap;
  flex-shrink: 0;
}

.myday-saved-badge {
  font-size: 10px;
  font-weight: 600;
  color: rgba(74, 222, 128, 0.8);
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.2);
  border-radius: 6px;
  padding: 2px 6px;
  white-space: nowrap;
  flex-shrink: 0;
}

.myday-ritual-switch {
  display: flex;
  gap: 4px;
  margin-left: auto;
  flex-shrink: 0;
}

.myday-switch-btn {
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  &--active {
    background: rgba(147, 197, 253, 0.15);
    border-color: rgba(147, 197, 253, 0.3);
    color: rgba(147, 197, 253, 0.9);
  }
}

.myday-ritual__inputs {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.myday-mood-row {
  display: flex;
  gap: 6px;
}

.myday-mood-chip {
  width: 36px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &--active {
    background: rgba(147, 197, 253, 0.15);
    border-color: rgba(147, 197, 253, 0.35);
  }
}

.myday-input-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.myday-ritual-input {
  flex: 1;
  min-width: 0;
  height: 36px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 10px;
  padding: 0 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }

  &:focus {
    border-color: rgba(147, 197, 253, 0.35);
    background: rgba(147, 197, 253, 0.06);
  }
}

.myday-ritual-save {
  flex-shrink: 0;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(147, 197, 253, 0.3);
  background: rgba(147, 197, 253, 0.12);
  font-size: 12px;
  font-weight: 700;
  color: rgba(147, 197, 253, 0.9);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s;

  &:active {
    background: rgba(147, 197, 253, 0.2);
  }
}

// ── Responsive ───────────────────────────────────────────────
@media (max-height: 780px) {
  .myday-shell { gap: 8px; }
  .myday-launcher { padding: 11px 14px; }
  .myday-launcher__title { font-size: 18px; }
  .myday-launcher__hint { -webkit-line-clamp: 2; }
  .myday-card-thumb { height: 88px; width: 54px; }
  .myday-action-tile { padding: 10px 12px; }
  .myday-ritual { padding: 8px 12px; gap: 6px; }
}

@media (max-height: 700px) {
  .myday-shell { gap: 6px; }
  .myday-topbar__date { display: none; }
  .myday-launcher__tags { display: none; }
  .myday-launcher__signals { display: none; }
  .myday-card-thumb { height: 76px; width: 48px; }
}

@media (hover: hover) {
  .myday-launcher:hover { border-color: rgba(163, 212, 255, 0.3); }
  .myday-action-tile:hover { background: rgba(255, 255, 255, 0.07); }
}
</style>
