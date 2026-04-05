<template>
  <div class="wrapper" :class="{ 'scene-ready': isPreloaded }">
    <div class="container bg-container" :class="{ 'scene-ready': isPreloaded }">

      <!-- Phrase: shown only on first visit of day -->
      <div v-if="isFirstVisitToday" class="content-wrapper">
        <div class="appear-content mono-text">
          <template v-for="token in fullTextTokens" :key="token.key">
            <span v-if="token.type === 'space'">{{ token.text }}</span>
            <span v-else style="display: inline-block; white-space: nowrap;">
              <span
                v-for="(ch, i) in token.chars"
                :key="token.start + i"
                :class="{ 'char-hidden': !revealedSet.has(token.start + i) }"
              >{{ ch }}</span>
            </span>
          </template>
        </div>
      </div>

      <div class="decor-layer">
        <div class="shooting-star"></div>
      </div>

      <!-- Logo -->
      <div class="logo-wrap no-pointer-events">
        <img :src="logo" :alt="tt('appName')" class="logo-img" />
      </div>

      <!-- Astro strip -->
      <div v-if="astroCards.length" class="astro-cards" :class="{ 'astro-cards--visible': showAstroCards }">
        <div
          v-for="card in astroCards"
          :key="card.id"
          class="astro-card"
          :style="astroCardStyle(card)"
        >
          <span class="astro-card__label">{{ card.label }}</span>
          <span class="astro-card__icon">{{ card.icon }}</span>
          <span class="astro-card__value">{{ card.value }}</span>
          <span v-if="card.sub" class="astro-card__sub">{{ card.sub }}</span>
        </div>
      </div>

      <!-- Card in circle: main hero -->
      <button
        type="button"
        class="circle-card"
        :class="{ 'circle-card--visible': showHomeActions }"
        @click="handleHeroCardClick"
        :aria-label="hasDailyCardToday ? 'Open daily card interpretation' : 'Reveal daily card'"
      >
        <div class="circle-card__eyebrow">
          {{ locale === 'uk' ? 'КАРТА ДНЯ' : 'CARD OF THE DAY' }}
        </div>

        <div class="circle-card__media">
          <div
            class="circle-card__img-wrap"
            :class="{
              'circle-card__img-wrap--revealed': hasDailyCardToday,
            }"
          >
            <div class="circle-card__face circle-card__face--front">
              <img
                v-if="dailyCardData && dailyCardData.image"
                class="circle-card__img"
                :class="{ 'circle-card__img--reversed': dailyCardData && dailyCardData.orientation === 'reversed' }"
                :src="dailyCardData.image"
                :alt="dailyCardData ? dailyCardData.title : tt('dailyPage.title')"
              />
            </div>

            <div class="circle-card__face circle-card__face--back">
              <div class="circle-card__back">
                <span class="circle-card__back-frame" aria-hidden="true"></span>
                <span class="circle-card__back-frame circle-card__back-frame--inner" aria-hidden="true"></span>
                <span class="circle-card__back-band" aria-hidden="true"></span>
                <span class="circle-card__back-center" aria-hidden="true">
                  <span class="circle-card__back-core"></span>
                  <span class="circle-card__back-core-ring"></span>
                  <img class="circle-card__back-logo" :src="logo" alt="" />
                </span>
              </div>
            </div>
          </div>
        </div>

        <transition name="circle-card-name">
          <div v-if="hasDailyCardToday" class="circle-card__info">
            <div class="circle-card__name">
              {{ dailyCardData ? dailyCardData.title : '' }}
            </div>
          </div>
        </transition>

        <div class="circle-card__cta">
          {{ hasDailyCardToday ? (locale === 'uk' ? 'Читати значення' : 'Read interpretation') : (locale === 'uk' ? 'Розкрити карту' : 'Reveal card') }}
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6h8M7 3.5l3 2.5-3 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
      </button>

      <!-- Two compact action blocks -->
      <div class="home-actions" :class="{ 'home-actions--visible': showHomeActions }">

        <button type="button" class="home-action home-action--horoscope" @click="openHoroscope">
          <span class="home-action__eyebrow">{{ locale === 'uk' ? 'ГОРОСКОП' : 'HOROSCOPE' }}</span>
          <span class="home-action__title">
            {{ horoscopeData ? horoscopeData.signLabel : (locale === 'uk' ? 'Ваш знак' : 'Your sign') }}
          </span>
          <span class="home-action__text">
            {{ horoscopeData && horoscopeData.preview ? horoscopeData.preview : (locale === 'uk' ? 'Енергія дня для вашого знаку.' : 'Daily energy for your sign.') }}
          </span>
          <span class="home-action__cta">
            {{ locale === 'uk' ? 'Читати' : 'Read' }}
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <path d="M2 5.5h7M6 3l3 2.5L6 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>

        <button type="button" class="home-action home-action--tarot" @click="openTarot">
          <span class="home-action__eyebrow">{{ landingCopy.secondaryEyebrow }}</span>
          <span class="home-action__title">{{ landingCopy.secondaryTitle }}</span>
          <span class="home-action__text">{{ landingCopy.secondaryText }}</span>
          <span class="home-action__cta">
            {{ locale === 'uk' ? 'Почати' : 'Start' }}
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <path d="M2 5.5h7M6 3l3 2.5L6 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>

        <button type="button" class="home-action home-action--myday" @click="openMyDayPage">
          <span class="home-action__eyebrow">{{ locale === 'uk' ? 'MY DAY' : 'MY DAY' }}</span>
          <span class="home-action__title">{{ locale === 'uk' ? 'Твій день' : 'Your day' }}</span>
          <span class="home-action__text">
            {{ locale === 'uk' ? 'Карта, фокус і ритуал дня.' : 'Card, focus, and daily ritual.' }}
          </span>
          <span class="home-action__cta">
            {{ locale === 'uk' ? 'Відкрити' : 'Open' }}
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <path d="M2 5.5h7M6 3l3 2.5L6 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>

        <button type="button" class="home-action home-action--menu" @click="openMenu">
          <span class="home-action__eyebrow">{{ locale === 'uk' ? 'МЕНЮ' : 'MENU' }}</span>
          <span class="home-action__title">{{ locale === 'uk' ? 'Усі розділи' : 'All sections' }}</span>
          <span class="home-action__text">
            {{ locale === 'uk' ? 'Карти, guide, rewards.' : 'Cards, guide, rewards.' }}
          </span>
          <span class="home-action__cta">
            {{ locale === 'uk' ? 'Перейти' : 'Open' }}
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
              <path d="M2 5.5h7M6 3l3 2.5L6 8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </button>

      </div>
    </div>
  </div>
</template>
<script>
import logo from 'src/assets/images/logo.svg'
import { useAuthStore } from 'src/stores/authStore.js'
import { t, currentLocale } from 'src/i18n/index.js';
import * as Astronomy from 'astronomy-engine';
import { readDailyStreak, DAILY_ACTIVITY_KEYS, hasDailyActivityToday, markDailyActivity } from 'src/helpers/dailyRitual.js';
import { loadDailyCardsSnapshot } from 'src/helpers/dailyCardCore.js';
import { loadTarotData } from 'src/helpers/tarotData';
import { loadHoroscopeRegistry } from 'src/helpers/horoscopeContentCore.js';
import { loadLocal, saveLocal } from 'src/helpers/localStorageSaver.js';
import { resolveUserSignSnapshot } from 'src/helpers/zodiacUserSignCore.js';
import { selectAppUser, selectHoroscopes } from 'src/services/supabaseNative';
import { localISODate } from 'src/helpers/date.ts';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export default {
  name: 'LandingScene',

  data() {
    return {
      logo,
      fullText: '',

      phrases: {
        en: [
          'A quiet sign is near',
          'The stars are aligning',
          'Today holds a hint',
          'Draw a card, feel the truth',
          'Listen to what resonates',

          'Your intuition knows',
          'Clarity is closer',
          'Trust the timing',
          'A sign in the smallest things',
          'The message is already here',
          'Let it unfold',
          'Follow what feels true',
          'A gentle nudge forward',
          'Your next step is simple',
          'Everything aligns quietly',
          'Your question has a direction',
          'A gentle truth emerges',
          'The answer is within reach',
          'Hold the question lightly',
          'Look closer',
          'A small shift changes everything',
          'Your energy speaks',
          'Read the moment',
          'Let the night guide you',
          'Trust what feels right',
        ],
        uk: [
          'Тихий знак вже близько',
          'Зорі складаються',
          'Сьогодні є підказка',
          'Витягни карту — відчуй правду',
          'Слухай, що відгукується',

          'Інтуїція вже знає',
          'Ясність ближче, ніж здається',
          'Довірся моменту',
          'Знак — у дрібницях',
          'Послання вже поруч',
          'Нехай це розгорнеться',
          'Йди за тим, що відчувається правдою',
          'Легкий поштовх уперед',
          'Твій наступний крок простий',
          'Все тихо стає на місце',
          'Твоє питання має напрямок',
          'М\u2019яка істина відкривається',
          'Відповідь поруч',
          'Тримай питання легко',
          'Подивись уважніше',
          'Малий зсув змінює все',
          'Твоя енергія говорить',
          'Читай момент',
          'Нехай ніч веде тебе',
          'Довірся тому, що відчувається правильним',
        ],
      },
      lastPhraseIndex: -1,
      revealedIndices: [],
      lettersTimer: null,
      hideTimer: null,
      revealTimeout: null,
      hideTimeout: null,
      isPreloaded: false,
      astroToday: null,
      dailyStreak: 0,
      authStore: null,
      cycleTimeout: null,
      phraseQueue: [],
      phraseCursor: 0,
      dailyCardData: null,
      hasDailyCardToday: false,
      horoscopeData: null,
      ritualDone: { morning: false, evening: false },
      isFirstVisitToday: false,
      showHomeActions: false,
      showAstroCards: false,
      introSequenceComplete: false,
    };
  },

  created() {
    this.authStore = useAuthStore()
    void this.initializeLandingAuthSafe()
  },

  computed: {
    fullTextTokens() {
      const tokens = []
      let cursor = 0
      const parts = this.fullText.split(/(\s+)/)
      for (const part of parts) {
        if (!part) continue
        if (/^\s+$/.test(part)) {
          tokens.push({ type: 'space', text: part.replace(/ /g, '\u00A0'), key: `sp-${cursor}` })
          cursor += part.length
          continue
        }
        tokens.push({ type: 'word', chars: Array.from(part), start: cursor, key: `w-${cursor}` })
        cursor += part.length
      }
      return tokens
    },

    tt() {
      return (key) => t(this.locale, key);
    },
    locale() {
      return currentLocale.value || 'en';
    },
    fullTextArray() {
      return this.fullText.split('')
    },
    revealedSet() {
      return new Set(this.revealedIndices)
    },

    landingCopy() {
      if (this.locale === 'uk') {
        return {
          primaryEyebrow: 'ЩО ЗАРАЗ',
          primaryTitle: 'Пройти свій день',
          primaryText: 'Карта дня, енергія гороскопу, місяць і вечірній check-in в одному маршруті.',
          secondaryEyebrow: 'ТАРО',
          secondaryTitle: 'Поставити питання таро',
          secondaryText: 'Енергія дня і одна чітка підказка.',
          tarotEyebrow: 'ТАРО',
          tarotTitle: 'Поставити питання',
          tarotText: 'Коли потрібен розклад, а не просто настрій дня.',
          menuEyebrow: 'МЕНЮ',
          menuTitle: 'Усі розділи',
          menuText: 'Бібліотека карт, zodiac guide, rewards, settings і решта фіч.',
        }
      }
      return {
        primaryEyebrow: 'WHAT NOW',
        primaryTitle: 'Go through your day',
        primaryText: 'Your daily card, horoscope energy, moon rhythm, and evening check-in in one route.',
        secondaryEyebrow: 'TAROT',
        secondaryTitle: 'Ask tarot a question',
        secondaryText: 'Today energy and one clear hint.',
        tarotEyebrow: 'TAROT',
        tarotTitle: 'Ask a question',
        tarotText: 'When you need a spread, not just the mood of the day.',
        menuEyebrow: 'MENU',
        menuTitle: 'All sections',
        menuText: 'Card library, zodiac guide, rewards, settings, and the rest of the app.',
      }
    },

    astroCards() {
      if (!this.astroToday) return []
      const d = this.astroToday
      const pd = d.planetaryDay
      const ev = d.nextLunarEvent
      const cards = []

      const phaseEmoji = { new:'🌑', waxingCrescent:'🌒', firstQuarter:'🌓', waxingGibbous:'🌔', full:'🌕', waningGibbous:'🌖', lastQuarter:'🌗', waningCrescent:'🌘' }

      // 1. Moon phase
      cards.push({
        id: 'moon',
        label: this.tt('astro.cards.moonPhase'),
        icon: phaseEmoji[d.moonPhaseKey] || '🌙',
        value: this.tt(`astro.phases.${d.moonPhaseKey}`),
        sub: `${this.tt('astro.moonIn')} ${this.tt(`zodiac.${d.moonSignKey}`)}`,
        bg: 'rgba(140, 170, 255, 0.14)',
        glow: 'rgba(140, 170, 255, 0.18)',
        border: 'rgba(140, 170, 255, 0.24)',
      })

      // 2. Next full moon
      if (ev) {
        let when
        if (ev.daysUntil <= 0) when = this.tt('astro.tonight')
        else if (ev.daysUntil === 1) when = this.tt('astro.tomorrow')
        else when = `${ev.daysUntil} ${this._astroDaysWord(ev.daysUntil)}`
        cards.push({
          id: 'lunar',
          label: this.tt('astro.phases.full'),
          icon: '🌕',
          value: when,
          sub: this.tt('astro.cards.remaining'),
          bg: 'rgba(255, 228, 130, 0.12)',
          glow: 'rgba(255, 228, 130, 0.16)',
          border: 'rgba(255, 228, 130, 0.22)',
        })
      }

      // 3. Planetary day
      if (pd) {
        const pBg = { sun:'rgba(255,220,100,0.13)', moon:'rgba(140,180,255,0.13)', mars:'rgba(255,100,80,0.14)', mercury:'rgba(150,220,160,0.13)', jupiter:'rgba(255,200,100,0.13)', venus:'rgba(255,155,200,0.14)', saturn:'rgba(180,160,140,0.13)' }
        const pGlow = { sun:'rgba(255,220,100,0.17)', moon:'rgba(140,180,255,0.17)', mars:'rgba(255,100,80,0.17)', mercury:'rgba(150,220,160,0.17)', jupiter:'rgba(255,200,100,0.17)', venus:'rgba(255,155,200,0.17)', saturn:'rgba(180,160,140,0.15)' }
        const pBd = { sun:'rgba(255,220,100,0.24)', moon:'rgba(140,180,255,0.24)', mars:'rgba(255,100,80,0.25)', mercury:'rgba(150,220,160,0.24)', jupiter:'rgba(255,200,100,0.24)', venus:'rgba(255,155,200,0.25)', saturn:'rgba(180,160,140,0.22)' }
        cards.push({
          id: 'planet',
          label: this.tt('astro.cards.dayRuler'),
          icon: pd.symbol,
          value: this.tt(`astro.planets.${pd.key}`),
          sub: this.tt(`astro.planetMeanings.${pd.key}`),
          bg: pBg[pd.key] || 'rgba(255,255,255,0.06)',
          glow: pGlow[pd.key] || 'rgba(255,255,255,0.08)',
          border: pBd[pd.key] || 'rgba(255,255,255,0.12)',
        })
      }

      // 4. Sun in sign
      cards.push({
        id: 'sun',
        label: this.tt('astro.cards.sunPath'),
        icon: '☀️',
        value: this.tt(`zodiac.${d.sunSignKey}`),
        sub: `${d.sunDegInSign}°`,
        bg: 'rgba(255, 218, 90, 0.12)',
        glow: 'rgba(255, 218, 90, 0.16)',
        border: 'rgba(255, 218, 90, 0.22)',
      })

      // 5. Moon element
      const eBg = { fire:'rgba(255,105,55,0.14)', water:'rgba(75,155,255,0.14)', air:'rgba(185,170,255,0.14)', earth:'rgba(105,195,105,0.14)' }
      const eGlow = { fire:'rgba(255,105,55,0.17)', water:'rgba(75,155,255,0.17)', air:'rgba(185,170,255,0.17)', earth:'rgba(105,195,105,0.17)' }
      const eBd = { fire:'rgba(255,105,55,0.26)', water:'rgba(75,155,255,0.26)', air:'rgba(185,170,255,0.26)', earth:'rgba(105,195,105,0.26)' }
      const eIco = { fire:'🔥', water:'🌊', air:'🌀', earth:'🌿' }
      cards.push({
        id: 'element',
        label: this.tt('astro.cards.moonEnergy'),
        icon: eIco[d.elementKey] || '◇',
        value: this.tt(`astro.elements.${d.elementKey}`),
        sub: this.tt(`astro.elementMeanings.${d.elementKey}`),
        bg: eBg[d.elementKey] || 'rgba(255,255,255,0.06)',
        glow: eGlow[d.elementKey] || 'rgba(255,255,255,0.08)',
        border: eBd[d.elementKey] || 'rgba(255,255,255,0.12)',
      })

      // 6. Numerology
      const numIco = { 1:'🌟', 2:'☯️', 3:'🎨', 4:'🏛️', 5:'🦋', 6:'🌸', 7:'🔮', 8:'💫', 9:'🌀' }
      cards.push({
        id: 'num',
        label: this.tt('astro.cards.dayNumber'),
        icon: numIco[d.numerologyDay] || '✦',
        value: String(d.numerologyDay),
        sub: this.tt(`astro.numerology.${d.numerologyDay}`),
        bg: 'rgba(255,255,255,0.09)',
        glow: 'rgba(255,255,255,0.12)',
        border: 'rgba(255,255,255,0.14)',
      })

      // 7. Streak
      if (this.dailyStreak > 0) {
        cards.push({
          id: 'streak',
          label: this.tt('astro.cards.yourStreak'),
          icon: '⚡',
          value: String(this.dailyStreak),
          sub: this.tt('astro.cards.streakSub'),
          bg: 'rgba(255, 205, 90, 0.14)',
          glow: 'rgba(255, 205, 90, 0.18)',
          border: 'rgba(255, 205, 90, 0.26)',
        })
      }

      // 8. Mercury retrograde (conditional)
      if (d.mercuryRetrograde) {
        cards.push({
          id: 'retro',
          label: this.tt('astro.cards.headsUp'),
          icon: '☿',
          value: this.tt('astro.mercuryRetrograde'),
          sub: '',
          bg: 'rgba(195, 155, 255, 0.15)',
          glow: 'rgba(195, 155, 255, 0.19)',
          border: 'rgba(195, 155, 255, 0.28)',
        })
      }

      return cards
    },
  },

  mounted() {
    this.isPreloaded = true
    this.computeAstro()
    this.dailyStreak = Math.max(
      readDailyStreak(DAILY_ACTIVITY_KEYS.dailyCard).current,
      readDailyStreak(DAILY_ACTIVITY_KEYS.horoscope).current,
      readDailyStreak(DAILY_ACTIVITY_KEYS.tarot).current,
    )

    // First-visit-of-day: play phrase → then reveal blocks
    const SEEN_KEY = 'arcana_landing_seen_v1'
    const today = (typeof window !== 'undefined') ? new Date().toISOString().slice(0, 10) : ''
    const lastSeen = (typeof window !== 'undefined') ? localStorage.getItem(SEEN_KEY) : ''

    if (lastSeen !== today) {
      // First visit today — phrase plays, then blocks appear via runIntroReveal
      this.isFirstVisitToday = true
      if (typeof window !== 'undefined') localStorage.setItem(SEEN_KEY, today)
      this.resetPhraseQueue()
      this.setNextPhrase()
      this.$nextTick(() => { this.startRandomLetterReveal() })
    } else {
      // Repeat visit — show everything immediately, no phrase
      this.showHomeActions = true
      this.showAstroCards = true
      this.introSequenceComplete = true
    }

    void this.loadLandingContent()
  },

  beforeUnmount() {
    clearInterval(this.lettersTimer)
    clearInterval(this.hideTimer)
    clearTimeout(this.revealTimeout)
    clearTimeout(this.hideTimeout)
    clearTimeout(this.cycleTimeout)
  },

  methods: {
    async initializeLandingAuthSafe() {
      try {
        await this.authStore.initAuth()
      } catch (error) {
        console.warn('[Landing] initAuth failed', error)
      }
    },

    async triggerImpact(style) {
      try {
        await Haptics.impact({ style })
      } catch (error) {
        console.warn('[Landing] haptics failed', error)
      }
    },

    openMyDay() {
      void this.$router.push({ name: 'daily', query: { source: 'landing', entry: 'hero_card' } })
    },

    async handleHeroCardClick() {
      if (!this.hasDailyCardToday) {
        await this.triggerImpact(ImpactStyle.Medium)
        markDailyActivity(DAILY_ACTIVITY_KEYS.dailyCard)
        this.hasDailyCardToday = true
        this.dailyStreak = Math.max(
          readDailyStreak(DAILY_ACTIVITY_KEYS.dailyCard).current,
          readDailyStreak(DAILY_ACTIVITY_KEYS.horoscope).current,
          readDailyStreak(DAILY_ACTIVITY_KEYS.tarot).current,
        )
        return
      }

      await this.triggerImpact(ImpactStyle.Light)
      this.openMyDay()
    },

    openTarot() {
      void this.$router.push({ name: 'tarot', query: { source: 'landing', entry: 'secondary_cta' } })
    },

    openMyDayPage() {
      void this.$router.push({ name: 'myDay', query: { source: 'landing', entry: 'my_day_card' } })
    },

    openHoroscope() {
      void this.$router.push({ name: 'horoscope' })
    },

    openMenu() {
      void this.$router.push({ name: 'menu' })
    },

    zodiacGlyph(signKey) {
      const map = {
        aries: '♈',
        taurus: '♉',
        gemini: '♊',
        cancer: '♋',
        leo: '♌',
        virgo: '♍',
        libra: '♎',
        scorpio: '♏',
        sagittarius: '♐',
        capricorn: '♑',
        aquarius: '♒',
        pisces: '♓',
      }
      return map[signKey] || '☉'
    },

    moonPhaseGlyph(phaseKey) {
      const map = {
        new: '🌑',
        waxingCrescent: '🌒',
        firstQuarter: '🌓',
        waxingGibbous: '🌔',
        full: '🌕',
        waningGibbous: '🌖',
        lastQuarter: '🌗',
        waningCrescent: '🌘',
      }
      return map[phaseKey] || '🌙'
    },

    astroCardStyle(card) {
      return {
        '--astro-card-base': card?.bg || 'rgba(30, 40, 62, 0.7)',
        '--astro-card-glow': card?.glow || 'rgba(255, 255, 255, 0.12)',
        '--astro-card-border': card?.border || 'rgba(255,255,255,0.16)',
      }
    },

    compactPreview(text, maxChars = 52) {
      const raw = String(text || '').replace(/\s+/g, ' ').trim()
      if (!raw) return ''
      if (raw.length <= maxChars) return raw
      return `${raw.slice(0, maxChars).replace(/[.,;:!?-]+$/u, '').trim()}…`
    },

    _hashStr(value) {
      let hash = 0
      const raw = String(value || '')
      for (let i = 0; i < raw.length; i++) {
        hash = (hash * 31 + raw.charCodeAt(i)) >>> 0
      }
      return hash
    },

    _getAnonSeed() {
      if (typeof window === 'undefined') return 'anon'
      const stored = localStorage.getItem('arcana_daily_seed_v1')
      if (stored) return stored
      const next = (window.crypto?.randomUUID?.()) ||
        `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem('arcana_daily_seed_v1', next)
      return next
    },

    _zodiacFromDate(rawDate) {
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
    },

    async loadLandingContent() {
      const locale = this.locale
      const today = localISODate()
      this.hasDailyCardToday = hasDailyActivityToday(DAILY_ACTIVITY_KEYS.dailyCard)

      // 1. Daily card
      try {
        const { cards } = await loadDailyCardsSnapshot({ loadTarotData })
        if (cards.length) {
          const userId = this.authStore?.state?.user?.id
          const seed = userId || this._getAnonSeed()
          const dailySeed = `${today}::${seed}`
          const idx = this._hashStr(`${dailySeed}::card`) % cards.length
          const ori = this._hashStr(`${dailySeed}::orientation`) % 2 === 0 ? 'upright' : 'reversed'
          const card = cards[idx]
          this.dailyCardData = {
            title: card?.name?.[locale] || card?.name?.en || '',
            image: card?.file ? `/images/cards/${card.file}` : '',
            orientation: ori,
            keywords: (card?.keywords?.[locale] || card?.keywords?.en || []).slice(0, 2),
          }
        }
      } catch (e) {
        console.warn('[Landing] daily card load failed', e)
      }

      // 2. Horoscope
      try {
        const snap = await resolveUserSignSnapshot({
          readProfileCacheValue: async () => {
            const { value } = await Preferences.get({ key: 'profile_cache_v1' })
            return value
          },
          getCurrentUserId: () => this.authStore?.state?.user?.id || '',
          fetchUserDateOfBirthById: async (userId) => {
            const { data } = await selectAppUser(userId, 6000, 'date_of_birth')
            return data?.[0]?.date_of_birth || ''
          },
          zodiacFromRawDate: (d) => this._zodiacFromDate(d),
        })
        if (snap.signKey) {
          const result = await loadHoroscopeRegistry({
            locale,
            today,
            loadLocal,
            saveLocal,
            selectHoroscopes,
          })
          const reg = result?.registry?.[snap.signKey] || {}
          const rawText = reg?.energy?.text || reg?.general?.text || reg?.love?.text || ''
          const preview = rawText.split(/[.!?]/)[0]
          this.horoscopeData = {
            signKey: snap.signKey,
            signLabel: this.tt(`zodiac.${snap.signKey}`),
            preview: preview ? preview.trim() + '.' : '',
          }
        }
      } catch (e) {
        console.warn('[Landing] horoscope load failed', e)
      }

      // 3. Ritual status
      try {
        const [m, e] = await Promise.all([
          Preferences.get({ key: `arcana_my_day_intention_v1:${today}` }),
          Preferences.get({ key: `arcana_my_day_checkin_v1:${today}` }),
        ])
        this.ritualDone = { morning: Boolean(m?.value), evening: Boolean(e?.value) }
      } catch (error) {
        console.warn('[Landing] ritual status load failed', error)
      }
    },

    computeAstro() {
      try {
        const now = new Date()
        const t1 = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const sunLon  = this._astroEclipticLon(Astronomy.Body.Sun, now)
        const moonLon = this._astroEclipticLon(Astronomy.Body.Moon, now)
        const merc0   = this._astroEclipticLon(Astronomy.Body.Mercury, now)
        const merc1   = this._astroEclipticLon(Astronomy.Body.Mercury, t1)
        const elong   = this._astroAbsDiff(moonLon, sunLon)
        const moonSignKey = this._astroSignKey(moonLon)
        const sunNorm = ((sunLon % 360) + 360) % 360
        this.astroToday = {
          moonPhaseKey:      this._astroPhaseKey(elong),
          moonSignKey,
          mercuryRetrograde: this._astroSignedDelta(merc1, merc0) < 0,
          nextLunarEvent:    this._astroNextLunarEvent(now),
          planetaryDay:      this._astroPlanetaryDay(),
          sunSignKey:        this._astroSignKey(sunLon),
          sunDegInSign:      Math.round(sunNorm % 30),
          elementKey:        this._astroElement(moonSignKey),
          numerologyDay:     this._astroNumerology(now),
        }
      } catch (e) {
        console.warn('[LandingScene] astro calc failed', e)
      }
    },

    _astroEclipticLon(body, date) {
      const time = typeof Astronomy.MakeTime === 'function'
        ? Astronomy.MakeTime(date)
        : new Astronomy.AstroTime(date)
      return Astronomy.Ecliptic(Astronomy.GeoVector(body, time, false)).elon
    },
    _astroPhaseKey(elong) {
      const x = ((elong % 360) + 360) % 360
      if (x < 22.5 || x >= 337.5) return 'new'
      if (x < 67.5)  return 'waxingCrescent'
      if (x < 112.5) return 'firstQuarter'
      if (x < 157.5) return 'waxingGibbous'
      if (x < 202.5) return 'full'
      if (x < 247.5) return 'waningGibbous'
      if (x < 292.5) return 'lastQuarter'
      return 'waningCrescent'
    },
    _astroSignKey(lon) {
      const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces']
      return signs[Math.floor(((lon % 360) + 360) % 360 / 30) % 12]
    },
    _astroAbsDiff(a, b) {
      let d = Math.abs(a - b) % 360
      return d > 180 ? 360 - d : d
    },
    _astroSignedDelta(next, prev) {
      let d = (next - prev) % 360
      if (d > 180) d -= 360
      if (d < -180) d += 360
      return d
    },
    _astroNextLunarEvent(now) {
      try {
        const fullMoonTime = Astronomy.SearchMoonPhase(180, now, 40)
        if (!fullMoonTime) return null
        const daysUntil = Math.max(0, Math.ceil((fullMoonTime.date.getTime() - now.getTime()) / 86400000))
        return { daysUntil }
      } catch {
        return null
      }
    },
    _astroPlanetaryDay() {
      const rulers  = ['sun','moon','mars','mercury','jupiter','venus','saturn']
      const symbols = { sun:'☀', moon:'🌙', mars:'♂', mercury:'☿', jupiter:'♃', venus:'♀', saturn:'♄' }
      const key = rulers[new Date().getDay()]
      return { key, symbol: symbols[key] }
    },
    _astroElement(moonSignKey) {
      const fire  = ['aries', 'leo', 'sagittarius']
      const earth = ['taurus', 'virgo', 'capricorn']
      const air   = ['gemini', 'libra', 'aquarius']
      if (fire.includes(moonSignKey))  return 'fire'
      if (earth.includes(moonSignKey)) return 'earth'
      if (air.includes(moonSignKey))   return 'air'
      return 'water'
    },
    _astroNumerology(date) {
      const digits = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`
      let n = digits.split('').reduce((s, d) => s + Number(d), 0)
      while (n > 9) n = String(n).split('').reduce((s, d) => s + Number(d), 0)
      return n
    },
    _astroDaysWord(n) {
      if (this.locale !== 'uk') return this.tt('astro.days')
      const mod10 = n % 10, mod100 = n % 100
      if (mod100 >= 11 && mod100 <= 19) return 'днів'
      if (mod10 === 1) return 'день'
      if (mod10 >= 2 && mod10 <= 4) return 'дні'
      return 'днів'
    },

    shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    },

    resetPhraseQueue() {
      const list = this.phrases?.[this.locale] || this.phrases.en
      if (!list?.length) return
      this.phraseQueue = this.shuffleArray([...Array(list.length).keys()])
      this.phraseCursor = 0
      if (list.length > 1 && this.phraseQueue[0] === this.lastPhraseIndex) {
        const swapIndex = 1
        ;[this.phraseQueue[0], this.phraseQueue[swapIndex]] = [this.phraseQueue[swapIndex], this.phraseQueue[0]]
      }
    },

    setNextPhrase() {
      const list = this.phrases?.[this.locale] || this.phrases.en
      if (!list?.length) return
      this.revealedIndices = []
      if (!this.phraseQueue.length || this.phraseCursor >= this.phraseQueue.length) {
        this.resetPhraseQueue()
      }
      const nextIndex = this.phraseQueue[this.phraseCursor]
      this.phraseCursor++
      this.lastPhraseIndex = nextIndex
      this.fullText = list[nextIndex]
    },

    clearAnimTimers() {
      clearInterval(this.lettersTimer)
      clearInterval(this.hideTimer)
      clearTimeout(this.revealTimeout)
      clearTimeout(this.hideTimeout)
      clearTimeout(this.cycleTimeout)
      this.lettersTimer = null
      this.hideTimer = null
      this.revealTimeout = null
      this.hideTimeout = null
      this.cycleTimeout = null
    },

    startRandomLetterReveal() {
      this.clearAnimTimers()
      const indices = []
      for (let i = 0; i < this.fullText.length; i++) {
        if (this.fullText[i] !== ' ') indices.push(i)
      }
      if (!indices.length) return
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[indices[i], indices[j]] = [indices[j], indices[i]]
      }
      this.revealedIndices = []
      this.revealTimeout = setTimeout(() => {
        let current = 0
        const totalDuration = 4000
        const minInterval = 90
        const step = Math.max(minInterval, Math.floor(totalDuration / indices.length))
        this.lettersTimer = setInterval(() => {
          if (current >= indices.length) {
            clearInterval(this.lettersTimer)
            this.lettersTimer = null
            this.startRandomLetterHide(indices)
            return
          }
          this.revealedIndices = [...this.revealedIndices, indices[current]]
          current++
        }, step)
      }, 800)
    },

    startRandomLetterHide(indices) {
      const shuffled = [...indices]
      let current = 0
      const totalDuration = 3500
      const minInterval = 90
      const step = Math.max(minInterval, Math.floor(totalDuration / shuffled.length))
      this.hideTimeout = setTimeout(() => {
        this.hideTimer = setInterval(() => {
          if (current >= shuffled.length) {
            clearInterval(this.hideTimer)
            this.hideTimer = null
            this.runIntroReveal()
            return
          }
          this.revealedIndices = this.revealedIndices.filter(i => i !== shuffled[current])
          current++
        }, step)
      }, 4000)
    },

    runIntroReveal() {
      if (this.introSequenceComplete) return
      this.introSequenceComplete = true
      this.cycleTimeout = setTimeout(() => {
        this.showHomeActions = true
        this.cycleTimeout = setTimeout(() => {
          this.showAstroCards = true
        }, 380)
      }, 260)
    },
  }
}
</script>

<style lang="scss" scoped>
/* ─── Scene fade ───────────────────────────────────────── */
.wrapper,
.container {
  opacity: 0;
  transition: opacity 1.4s cubic-bezier(0.215, 0.61, 0.355, 1);
}
.scene-ready { opacity: 1; }
.wrapper { height: 100dvh; }
.container { position: relative; height: 100dvh; overflow: hidden; }

.bg-container {
  background-image: url('assets/images/landing-stars-bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.mono-text { font-style: normal; font-weight: 400; }

/* ─── Logo ─────────────────────────────────────────────── */
.logo-wrap {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  padding-top: calc(env(safe-area-inset-top, 0px) + 90px);
}
.logo-img { max-width: 140px; width: 140px; height: auto; display: block; }

/* ─── Circle card hero ─────────────────────────────────── */
/* Positioned so the card image sits in the center of the large ring. */
.circle-card {
  position: absolute;
  top: 55.5%;
  left: 50%;
  width: min(264px, calc(100vw - 48px));
  min-height: 158px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 102px 0 0;

  opacity: 0;
  transition: opacity 0.9s ease 0.2s, transform 0.9s cubic-bezier(0.2,0.8,0.2,1) 0.2s;
  transform: translate(-50%, -50%) translateY(12px);
  will-change: opacity, transform;
}
.circle-card--visible {
  opacity: 1;
  transform: translate(-50%, -50%) translateY(0);
}

.circle-card__media {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 8px 24px rgba(0,0,0,0.55));
  perspective: 1200px;
}

.circle-card__img-wrap {
  position: relative;
  width: 104px;
  height: 168px;
  border-radius: 12px;
  transform-style: preserve-3d;
  transition: transform 760ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.circle-card__img-wrap--revealed {
  transform: rotateY(180deg);
}

.circle-card__face {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.15);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.circle-card__face--front {
  transform: rotateY(180deg);
  background: rgba(8, 14, 24, 0.96);
}

.circle-card__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.circle-card__img--reversed {
  transform: rotate(180deg);
}

.circle-card__back {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 0%, rgba(118, 162, 212, 0.12), rgba(118, 162, 212, 0) 42%),
    radial-gradient(circle at 82% 100%, rgba(68, 104, 150, 0.1), rgba(68, 104, 150, 0) 40%),
    linear-gradient(160deg, rgba(15, 29, 44, 0.99), rgba(9, 18, 31, 0.995) 58%, rgba(5, 11, 20, 1));
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-card__back::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.045), rgba(255,255,255,0) 36%),
    linear-gradient(180deg, rgba(98, 145, 198, 0.11), rgba(98, 145, 198, 0) 46%);
  pointer-events: none;
}

.circle-card__back-frame {
  position: absolute;
  inset: 7px;
  border-radius: 9px;
  border: 1px solid rgba(160, 194, 226, 0.24);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.03);
}

.circle-card__back-frame--inner {
  inset: 13px;
  border-radius: 7px;
  border-color: rgba(136, 173, 208, 0.16);
}

.circle-card__back-band {
  position: absolute;
  left: 50%;
  top: 18px;
  bottom: 18px;
  width: 1px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, rgba(255,255,255,0), rgba(182, 214, 244, 0.24), rgba(255,255,255,0));
}

.circle-card__back-center {
  position: relative;
  z-index: 1;
  width: 72px;
  height: 72px;
  display: grid;
  place-items: center;
}

.circle-card__back-core,
.circle-card__back-core-ring {
  position: absolute;
  inset: 0;
  border-radius: 999px;
}

.circle-card__back-core {
  border: 1px solid rgba(184, 214, 242, 0.24);
  background:
    radial-gradient(circle at 50% 35%, rgba(214, 231, 248, 0.14), rgba(214, 231, 248, 0) 58%),
    linear-gradient(180deg, rgba(24, 45, 68, 0.86), rgba(8, 17, 28, 0.62));
  box-shadow:
    0 0 14px rgba(96, 145, 198, 0.16),
    inset 0 0 0 1px rgba(255,255,255,0.045);
}

.circle-card__back-core-ring {
  inset: 10px;
  border: 1px solid rgba(183, 210, 238, 0.18);
}

.circle-card__back-logo {
  position: relative;
  z-index: 1;
  width: 42px;
  height: auto;
  opacity: 0.98;
  filter:
    brightness(1.24)
    drop-shadow(0 0 7px rgba(170, 212, 248, 0.18));
}

.circle-card__info {
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.circle-card-name-enter-active,
.circle-card-name-leave-active {
  transition: opacity 240ms ease, transform 240ms ease;
}

.circle-card-name-enter-from,
.circle-card-name-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.circle-card__eyebrow {
  position: absolute;
  top: -112px;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.44);
  white-space: nowrap;
}

.circle-card__name {
  width: 100%;
  font-size: 16px;
  font-weight: 700;
  color: rgba(255,255,255,0.95);
  letter-spacing: -0.01em;
  line-height: 1.2;
  text-shadow: 0 2px 12px rgba(0,0,0,0.6);
  text-wrap: balance;
}

.circle-card__cta {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ─── Action blocks ────────────────────────────────────── */
.home-actions {
  position: absolute;
  left: 16px;
  right: 16px;
  bottom: calc(35px + env(safe-area-inset-bottom, 0px));
  z-index: 4;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 9px;
  max-width: 420px;
  margin-left: auto;
  margin-right: auto;

  opacity: 0;
  transform: translateY(14px);
  transition: opacity 0.9s ease 0.4s, transform 0.9s cubic-bezier(0.2,0.8,0.2,1) 0.4s;
}
.home-actions--visible {
  opacity: 1;
  transform: translateY(0);
}

.home-action {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 12px 13px 11px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.10);
  background: linear-gradient(180deg, rgba(14,20,32,0.90), rgba(7,11,19,0.82));
  color: rgba(255,255,255,0.92);
  box-shadow: 0 8px 24px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.05);
  cursor: pointer;
  overflow: hidden;
}

.home-action--horoscope {
  border-color: rgba(251,191,36,0.16);
  background:
    radial-gradient(circle at top right, rgba(251,191,36,0.14), rgba(251,191,36,0) 55%),
    linear-gradient(180deg, rgba(20,17,8,0.92), rgba(10,8,4,0.84));
}

.home-action--tarot {
  border-color: rgba(167,139,250,0.16);
  background:
    radial-gradient(circle at top right, rgba(167,139,250,0.14), rgba(167,139,250,0) 55%),
    linear-gradient(180deg, rgba(14,12,22,0.92), rgba(7,6,12,0.84));
}

.home-action--myday {
  border-color: rgba(96,165,250,0.18);
  background:
    radial-gradient(circle at top right, rgba(96,165,250,0.16), rgba(96,165,250,0) 55%),
    linear-gradient(180deg, rgba(10,18,30,0.92), rgba(6,10,18,0.84));
}

.home-action--menu {
  border-color: rgba(94,234,212,0.16);
  background:
    radial-gradient(circle at top right, rgba(94,234,212,0.12), rgba(94,234,212,0) 55%),
    linear-gradient(180deg, rgba(9,18,20,0.92), rgba(5,10,12,0.84));
}

.home-action__eyebrow {
  font-size: 9px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.38);
  line-height: 1;
}

.home-action__title {
  font-size: 13px;
  font-weight: 700;
  line-height: 1.25;
  color: rgba(255,255,255,0.92);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.home-action__text {
  font-size: 11px;
  line-height: 1.45;
  color: rgba(255,255,255,0.50);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.home-action--myday .home-action__text,
.home-action--menu .home-action__text {
  font-size: 10px;
  line-height: 1.35;
}

.home-action__cta {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.38);
  letter-spacing: 0.04em;
  margin-top: 4px;
}

/* ─── Cycling phrase ───────────────────────────────────── */
.content-wrapper { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.appear-content {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 13px;
  opacity: 0.8;
  line-height: 18px;
  text-align: center;
  color: #ffffff;
  max-width: 192px;
  word-break: normal;
}
.appear-content span { display: inline-block; transition: opacity 0.5s ease; }
.char-hidden { opacity: 0; }

/* ─── Decor ────────────────────────────────────────────── */
.decor-layer { position: absolute; inset: 0; z-index: 2; pointer-events: none; overflow: hidden; }
.shooting-star {
  position: absolute;
  top: -40px; right: -80px;
  width: 2px; height: 2px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 6px rgba(255,255,255,0.9), 0 0 14px rgba(159,216,246,0.8);
  opacity: 0;
  animation: shooting 5.5s ease-in-out 3s 1 forwards;
  will-change: transform, opacity;
}
@keyframes shooting {
  0%   { opacity: 0; transform: translate3d(0, 0, 0); }
  10%  { opacity: 1; }
  40%  { opacity: 1; transform: translate3d(-60vw, 40vh, 0); }
  70%, 100% { opacity: 0; transform: translate3d(-75vw, 55vh, 0); }
}

/* ─── Astro Cards ──────────────────────────────────────── */
.astro-cards {
  --cards-pad: 20px;
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 130px);
  left: 0;
  right: 0;
  z-index: 4;
  display: flex;
  gap: 8px;
  padding: 4px 0;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-left: var(--cards-pad);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 1.0s ease 0.7s, transform 1.0s cubic-bezier(0.2,0.8,0.2,1) 0.7s;
}
.astro-cards::-webkit-scrollbar { display: none; }
.astro-cards::before,
.astro-cards::after {
  content: '';
  flex-shrink: 0;
  width: var(--cards-pad);
}
.astro-cards--visible {
  opacity: 1;
  transform: translateY(0);
}

.astro-card {
  scroll-snap-align: start;
  flex-shrink: 0;
  width: 106px;
  padding: 12px 12px 11px;
  border-radius: 20px;
  border: 1px solid var(--astro-card-border, rgba(255,255,255,0.12));
  background:
    radial-gradient(circle at top right, var(--astro-card-glow, rgba(255,255,255,0.12)), transparent 58%),
    linear-gradient(180deg, var(--astro-card-base, rgba(30, 40, 62, 0.7)), rgba(17, 24, 38, 0.56));
  display: flex;
  flex-direction: column;
}

.astro-card__label {
  font-size: 9px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.44);
  -webkit-font-smoothing: antialiased;
  line-height: 1;
  margin-bottom: 7px;
}
.astro-card__icon { font-size: 22px; line-height: 1; margin-bottom: 6px; }
.astro-card__value {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.93);
  letter-spacing: 0.01em;
  line-height: 1.25;
  -webkit-font-smoothing: antialiased;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.astro-card__sub {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  letter-spacing: 0.02em;
  line-height: 1.25;
  margin-top: 2px;
  -webkit-font-smoothing: antialiased;
}

.no-pointer-events { pointer-events: none; }

@media (max-width: 390px) {
  .circle-card { width: min(236px, calc(100vw - 40px)); }
  .circle-card { min-height: 146px; padding-top: 92px; }
  .circle-card__img-wrap { width: 92px; height: 148px; }
  .circle-card__back-logo { width: 50px; }
  .circle-card__eyebrow { top: -98px; }
  .circle-card__name { font-size: 14px; }
  .home-action { padding: 10px 11px 9px; }
}

@media (max-height: 700px) {
  .circle-card { top: 51.5%; min-height: 144px; padding-top: 88px; }
  .circle-card__img-wrap { width: 90px; height: 146px; }
  .circle-card__back-logo { width: 50px; }
  .circle-card__eyebrow { top: -96px; }
  .home-actions {
    bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  }
  .astro-cards { top: calc(env(safe-area-inset-top, 0px) + 104px); }
}
</style>
