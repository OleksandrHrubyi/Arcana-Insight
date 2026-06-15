<template>
  <main class="wrapper" :class="{ 'scene-ready': isPreloaded }">
    <div class="container bg-container" :class="{ 'scene-ready': isPreloaded }">
      <!-- Phrase: shown only on first visit of day -->
      <section
        v-if="isFirstVisitToday"
        class="content-wrapper"
        :class="{ 'content-wrapper--fade-out': isPhraseFadingOut }"
      >
        <div class="appear-content mono-text">
          <template v-for="token in fullTextTokens" :key="token.key">
            <span v-if="token.type === 'space'">{{ token.text }}</span>
            <span v-else style="display: inline-block; white-space: nowrap">
              <span
                v-for="(ch, i) in token.chars"
                :key="token.start + i"
                :class="{ 'char-hidden': !revealedSet.has(token.start + i) }"
                >{{ ch }}</span
              >
            </span>
          </template>
        </div>
      </section>

      <div class="decor-layer">
        <div class="shooting-star"></div>
      </div>

      <!-- Home hero text -->
      <header class="logo-wrap no-pointer-events">
        <div class="myday-hero__text">
          <h1 class="myday-title">{{ homeHeroTitle }}</h1>
          <p v-if="homeHeroKicker" class="myday-kicker">{{ homeHeroKicker }}</p>
        </div>
        <div class="status-stack">
          <p v-if="dailyStreak > 0" class="streak-badge">
            {{ streakBadgeLabel }}
          </p>
          <button
            type="button"
            class="daily-track"
            :aria-label="dailyProgressAriaLabel"
            @click="openNextRitual"
          >
            <span class="daily-track__dots" aria-hidden="true">
              <span
                v-for="item in dailyProgressItems"
                :key="item.key"
                class="daily-track__dot"
                :class="{ 'daily-track__dot--done': item.done }"
              ></span>
            </span>
            <span class="daily-track__label">{{ dailyProgressSummary }}</span>
          </button>
        </div>
      </header>

      <!-- Astro strip -->
      <section
        v-if="astroCards.length"
        class="astro-cards"
        :class="{ 'astro-cards--visible': showAstroCards }"
        :aria-label="tt('landing.astroStripLabel')"
      >
        <button
          v-for="card in astroCards"
          :key="card.id"
          type="button"
          class="astro-card"
          :style="astroCardStyle(card)"
          @click="openAstroSheet(card)"
        >
          <span class="astro-card__label">{{ card.label }}</span>
          <span class="astro-card__icon">{{ card.icon }}</span>
          <span class="astro-card__value">{{ card.value }}</span>
          <span v-if="card.sub" class="astro-card__sub">{{ card.sub }}</span>
        </button>
      </section>

      <!-- Card in circle: main hero -->
      <button
        type="button"
        class="circle-card"
        :class="{ 'circle-card--visible': showHomeActions }"
        @click="handleHeroCardClick"
        :aria-label="heroCardAriaLabel"
      >
        <span class="circle-card__eyebrow">{{ tt('landing.hero.eyebrow') }}</span>

        <div class="circle-card__media">
          <div
            class="circle-card__img-wrap"
            :class="{
              'circle-card__img-wrap--revealed': isHeroCardRevealed,
            }"
          >
            <div class="circle-card__face circle-card__face--front">
              <img
                v-if="dailyCardData && dailyCardData.image"
                class="circle-card__img"
                :class="{
                  'circle-card__img--reversed':
                    dailyCardData && dailyCardData.orientation === 'reversed',
                }"
                :src="dailyCardData.image"
                :alt="dailyCardData ? dailyCardData.title : tt('dailyPage.title')"
              />
              <div v-else class="circle-card__img-skeleton" aria-hidden="true"></div>
            </div>

            <div class="circle-card__face circle-card__face--back">
              <div class="circle-card__back">
                <span class="circle-card__back-frame" aria-hidden="true"></span>
                <span
                  class="circle-card__back-frame circle-card__back-frame--inner"
                  aria-hidden="true"
                ></span>
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

        <div class="circle-card__content" :class="{ 'circle-card__content--revealed': isHeroCardRevealed }">
          <transition name="circle-card-name">
            <div v-if="isHeroCardRevealed" class="circle-card__info">
              <div class="circle-card__name">
                {{ dailyCardData ? dailyCardData.title : '' }}
              </div>
              <div v-if="dailyCardData?.teaser" class="circle-card__theme-pill">
                {{ dailyCardData.teaser }}
              </div>
            </div>
          </transition>
          <span class="circle-card__cta">
            <span class="circle-card__cta-label">{{ heroCardCtaLabel }}</span>
            <span class="circle-card__cta-icon" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2 6h8M7 3.5l3 2.5-3 2.5"
                  stroke="currentColor"
                  stroke-width="1.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </span>
          </span>
        </div>
      </button>

      <section
        class="focus-today"
        :class="{
          'focus-today--visible': showHomeActions,
          'focus-today--compact': isFocusTodayCompact,
        }"
      >
        <button
          type="button"
          class="focus-today__card"
          :class="{ 'focus-today__card--compact': isFocusTodayCompact }"
          :aria-label="focusTodayAriaLabel"
          @click="openFocusToday"
        >
          <div v-if="isFocusTodayCompact" class="focus-today__compact-row">
            <div class="focus-today__compact-copy">
              <span class="focus-today__eyebrow">{{ focusTodayTitle }}</span>
              <p class="focus-today__body focus-today__body--compact">
                {{ focusTodayLine }}
              </p>
            </div>
            <span class="focus-today__cta">
              {{ focusTodayCtaLabel }}
            </span>
          </div>
          <template v-else>
            <div class="focus-today__top">
              <span class="focus-today__eyebrow">{{ focusTodayTitle }}</span>
            </div>
            <div v-if="focusTodaySignLabel" class="focus-today__meta">
              <span class="focus-today__sign-chip">{{ focusTodaySignLabel }}</span>
            </div>
            <p class="focus-today__body">
              {{ focusTodayLine }}
            </p>
            <div class="focus-today__footer">
              <span class="focus-today__cta">
                {{ focusTodayCtaLabel }}
              </span>
            </div>
          </template>
        </button>
      </section>

      <q-dialog v-model="astroSheetOpen" position="bottom" class="astro-sheet-dialog">
        <section v-if="astroSheetContent" class="astro-sheet" :style="astroSheetStyle()">
          <div class="astro-sheet__grabber"></div>
          <p class="astro-sheet__eyebrow">{{ astroSheetContent.label }}</p>
          <header class="astro-sheet__header">
            <div class="astro-sheet__icon">{{ astroSheetContent.icon }}</div>
            <div class="astro-sheet__title-wrap">
              <h2 class="astro-sheet__title">{{ astroSheetContent.title }}</h2>
              <p v-if="astroSheetContent.subtitle" class="astro-sheet__subtitle">
                {{ astroSheetContent.subtitle }}
              </p>
            </div>
          </header>

          <section class="astro-sheet__section">
            <h3 class="astro-sheet__section-title">{{ tt('landing.sheet.factsTitle') }}</h3>
            <ul class="astro-sheet__facts">
              <li v-for="fact in astroSheetContent.facts" :key="fact" class="astro-sheet__fact">
                {{ fact }}
              </li>
            </ul>
          </section>

          <section v-if="astroSheetContent.summary" class="astro-sheet__section astro-sheet__section--summary">
            <div class="astro-sheet__summary-card">
              <h3 class="astro-sheet__section-title astro-sheet__section-title--summary">
                {{ tt('landing.sheet.todayTitle') }}
              </h3>
              <p class="astro-sheet__summary-lead">
                {{ astroSheetContent.summaryLead || astroSheetContent.summary }}
              </p>
              <p v-if="astroSheetContent.summaryBody" class="astro-sheet__summary-body">
                {{ astroSheetContent.summaryBody }}
              </p>
            </div>
          </section>

          <footer class="oracle-actions__footer">
            <button type="button" class="oracle-actions__ok" @click.stop.prevent="closeAstroSheet">
              {{ tt('common.close') }}
            </button>
          </footer>
        </section>
      </q-dialog>
    </div>
  </main>
</template>
<script>
import logo from 'src/assets/images/logo.svg'
import { useAuthStore } from 'src/stores/authStore.js'
import { t, currentLocale } from 'src/i18n/index.js'
import {
  readDailyStreak,
  DAILY_ACTIVITY_KEYS,
  hasDailyActivityToday,
} from 'src/helpers/dailyRitual.js'
import {
  getDeterministicDailyCardSelection,
  loadDailyCardsSnapshot,
} from 'src/helpers/dailyCardCore.js'
import { loadTarotData } from 'src/helpers/tarotData'
import { loadHoroscopeRegistry } from 'src/helpers/horoscopeContentCore.js'
import { loadLocal, saveLocal } from 'src/helpers/localStorageSaver.js'
import { resolveUserSignSnapshot } from 'src/helpers/zodiacUserSignCore.js'
import { selectAppUser, selectHoroscopes } from 'src/services/supabaseNative'
import { localISODate } from 'src/helpers/date.ts'
import { Preferences } from '@capacitor/preferences'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const HOME_DAILY_CARD_REVEAL_PREFIX = 'arcana_home_daily_card_revealed_v1:'
const HOME_QA_QUERY_VALUE = 'home'
const HOROSCOPE_SIGN_CACHE_KEY = 'horoscope_sign_key_v1'
let astronomyEnginePromise = null

const loadAstronomyEngine = async () => {
  if (!astronomyEnginePromise) {
    astronomyEnginePromise = import('astronomy-engine')
  }
  const mod = await astronomyEnginePromise
  return mod?.default || mod
}

const scheduleNonCriticalTask = (task, { timeout = 1500, fallbackDelay = 280 } = {}) => {
  if (typeof window === 'undefined') {
    task()
    return null
  }

  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => task(), { timeout })
    return { type: 'idle', id }
  }

  const id = window.setTimeout(task, fallbackDelay)
  return { type: 'timeout', id }
}

const cancelScheduledTask = (handle) => {
  if (!handle || typeof window === 'undefined') return
  if (handle.type === 'idle' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(handle.id)
    return
  }
  if (handle.type === 'timeout') {
    window.clearTimeout(handle.id)
  }
}

export default {
  name: 'LandingScene',

  data() {
    return {
      logo,
      fullText: '',
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
      hasRevealedDailyCardOnHomeToday: false,
      hasHoroscopeToday: false,
      hasTarotToday: false,
      horoscopeData: null,
      homeSignKey: '',
      isFirstVisitToday: false,
      isPhraseFadingOut: false,
      showHomeActions: false,
      showAstroCards: false,
      introSequenceComplete: false,
      astroSheetOpen: false,
      astroSheetCardId: '',
      astroSheetActionLockUntil: 0,
      astroSheetNavRestoreTimer: null,
      qaHomeConfig: null,
      qaNow: null,
      astroTaskHandle: null,
      landingContentFrameId: null,
      introFallbackTimer: null,
    }
  },

  created() {
    this.authStore = useAuthStore()
    this.qaHomeConfig = this.readHomeQaConfig()
    if (!this.qaHomeConfig) {
      void this.initializeLandingAuthSafe()
    }
  },

  watch: {
    astroSheetOpen(isOpen) {
      if (isOpen) {
        clearTimeout(this.astroSheetNavRestoreTimer)
        this.syncAstroSheetNavState(true)
        return
      }
      this.scheduleAstroSheetNavRestore()
    },
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
      return (key) => t(this.locale, key)
    },
    locale() {
      return currentLocale.value || 'en'
    },
    fullTextArray() {
      return this.fullText.split('')
    },
    revealedSet() {
      return new Set(this.revealedIndices)
    },

    landingPhrases() {
      const phrases = this.tt('landing.phrases')
      return Array.isArray(phrases) ? phrases : []
    },

    astroSheetContent() {
      if (!this.astroSheetCardId || !this.astroToday) return null
      return this.buildAstroSheetContent(this.astroSheetCardId)
    },

    todayDateLabel() {
      try {
        const d = this.qaNow || new Date()
        const fmt = new Intl.DateTimeFormat(this.locale === 'uk' ? 'uk-UA' : 'en-US', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
        })
        return fmt.format(d)
      } catch {
        return ''
      }
    },

    greetingLabel() {
      const hour = (this.qaNow || new Date()).getHours()
      if (hour < 5) return this.tt('landing.greetings.night')
      if (hour < 12) return this.tt('landing.greetings.morning')
      if (hour < 18) return this.tt('landing.greetings.day')
      return this.tt('landing.greetings.evening')
    },

    firstName() {
      const raw = String(
        this.authStore?.state?.user?.user_metadata?.name ||
          this.authStore?.state?.user?.user_metadata?.full_name ||
          '',
      ).trim()
      if (!raw) return ''
      return raw.split(/\s+/)[0] || ''
    },

    homeHeroTitle() {
      return this.firstName ? `${this.greetingLabel}, ${this.firstName}` : this.greetingLabel
    },

    homeHeroKicker() {
      return this.todayDateLabel || ''
    },

    streakBadgeLabel() {
      if (this.dailyStreak <= 0) return ''
      return `🔥 ${this.dailyStreak} ${this.landingDayWord(this.dailyStreak)} ${this.tt('landing.streak.suffix')}`.trim()
    },

    isHeroCardRevealed() {
      return this.hasDailyCardToday || this.hasRevealedDailyCardOnHomeToday
    },

    heroCardAriaLabel() {
      return this.isHeroCardRevealed
        ? this.tt('landing.hero.ariaOpen')
        : this.tt('landing.hero.ariaReveal')
    },

    heroCardCtaLabel() {
      return this.isHeroCardRevealed
        ? this.tt('landing.hero.readInterpretation')
        : this.tt('landing.hero.revealCard')
    },

    focusTodayResolvedSignKey() {
      return (
        this.normalizeZodiacKey(this.homeSignKey) ||
        this.normalizeZodiacKey(this.horoscopeData?.signKey) ||
        ''
      )
    },

    isFocusTodayCompact() {
      return !this.focusTodayResolvedSignKey
    },

    focusTodayTitle() {
      return this.tt('landing.focusToday.title')
    },

    focusTodaySignLabel() {
      if (!this.focusTodayResolvedSignKey) return ''
      return `${this.zodiacGlyph(this.focusTodayResolvedSignKey)} ${this.tt(`zodiac.${this.focusTodayResolvedSignKey}`)}`
    },

    focusTodayLine() {
      const preview = String(this.horoscopeData?.preview || '').trim()
      if (preview && this.focusTodayResolvedSignKey) {
        return this.compactPreview(this.firstSentence(preview), 72)
      }

      if (!this.focusTodayResolvedSignKey) {
        return this.tt('landing.focusToday.fallbackMissingSign')
      }

      return this.tt('landing.focusToday.fallbackKnownSign')
    },

    focusTodayCtaLabel() {
      return this.tt('landing.sheet.actions.openHoroscope')
    },

    focusTodayAriaLabel() {
      const title = this.tt('landing.focusToday.title')
      const sign = this.focusTodaySignLabel
      const body = this.focusTodayLine
      const action = this.tt('landing.sheet.actions.openHoroscope')
      return [title, sign, body, action].filter(Boolean).join('. ')
    },

    dailyProgressItems() {
      return [
        {
          key: DAILY_ACTIVITY_KEYS.dailyCard,
          label: this.tt('landing.progress.card'),
          done: this.hasDailyCardToday,
        },
        {
          key: DAILY_ACTIVITY_KEYS.horoscope,
          label: this.tt('landing.progress.horoscope'),
          done: this.hasHoroscopeToday,
        },
        {
          key: DAILY_ACTIVITY_KEYS.tarot,
          label: this.tt('landing.progress.tarot'),
          done: this.hasTarotToday,
        },
      ]
    },

    dailyProgressAriaLabel() {
      return this.dailyProgressItems
        .map((item) => `${item.label}: ${item.done ? this.tt('landing.progress.done') : this.tt('landing.progress.next')}`)
        .join('. ')
    },

    dailyProgressDoneCount() {
      return this.dailyProgressItems.filter((item) => item.done).length
    },

    dailyProgressSummary() {
      const done = this.dailyProgressDoneCount
      const total = this.dailyProgressItems.length
      if (done <= 0) return this.tt('landing.progress.summaryStart')
      if (done >= total) return this.tt('landing.progress.summaryComplete')
      if (done === 1) return this.tt('landing.progress.summaryOneDone')
      if (total - done === 1) return this.tt('landing.progress.summaryOneLeft')
      return this.tt('landing.progress.summaryInProgress')
    },

    astroCards() {
      if (!this.astroToday) return []
      const d = this.astroToday
      const pd = d.planetaryDay
      const ev = d.nextLunarEvent
      const cards = []

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

      // 1. Moon phase (+ moon sign element, merged from the old separate card)
      cards.push({
        id: 'moon',
        label: this.tt('astro.cards.moonPhase'),
        icon: phaseEmoji[d.moonPhaseKey] || '🌙',
        value: this.tt(`astro.phases.${d.moonPhaseKey}`),
        sub: `${this.tt('astro.moonIn')} ${this.tt(`zodiacLocative.${d.moonSignKey}`)} · ${this.tt(`astro.elements.${d.elementKey}`)}`,
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
        const pBg = {
          sun: 'rgba(255,220,100,0.13)',
          moon: 'rgba(140,180,255,0.13)',
          mars: 'rgba(255,100,80,0.14)',
          mercury: 'rgba(150,220,160,0.13)',
          jupiter: 'rgba(255,200,100,0.13)',
          venus: 'rgba(255,155,200,0.14)',
          saturn: 'rgba(180,160,140,0.13)',
        }
        const pGlow = {
          sun: 'rgba(255,220,100,0.17)',
          moon: 'rgba(140,180,255,0.17)',
          mars: 'rgba(255,100,80,0.17)',
          mercury: 'rgba(150,220,160,0.17)',
          jupiter: 'rgba(255,200,100,0.17)',
          venus: 'rgba(255,155,200,0.17)',
          saturn: 'rgba(180,160,140,0.15)',
        }
        const pBd = {
          sun: 'rgba(255,220,100,0.24)',
          moon: 'rgba(140,180,255,0.24)',
          mars: 'rgba(255,100,80,0.25)',
          mercury: 'rgba(150,220,160,0.24)',
          jupiter: 'rgba(255,200,100,0.24)',
          venus: 'rgba(255,155,200,0.25)',
          saturn: 'rgba(180,160,140,0.22)',
        }
        cards.push({
          id: 'planet',
          label: this.tt('astro.cards.dayRuler'),
          icon: this.planetaryGlyph(pd.key),
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
        icon: '☉',
        value: this.tt(`zodiac.${d.sunSignKey}`),
        sub: `${d.sunDegInSign}°`,
        bg: 'rgba(255, 218, 90, 0.12)',
        glow: 'rgba(255, 218, 90, 0.16)',
        border: 'rgba(255, 218, 90, 0.22)',
      })

      // 5. Numerology — the day number itself is the value; use one calm
      // monochrome glyph instead of a different decorative emoji per number.
      cards.push({
        id: 'num',
        label: this.tt('astro.cards.dayNumber'),
        icon: '✦',
        value: String(d.numerologyDay),
        sub: this.tt(`astro.numerology.${d.numerologyDay}`),
        bg: 'rgba(255,255,255,0.09)',
        glow: 'rgba(255,255,255,0.12)',
        border: 'rgba(255,255,255,0.14)',
      })

      // 7. Mercury retrograde (conditional)
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
    if (this.qaHomeConfig) {
      this.applyHomeQaState()
      return
    }
    this.dailyStreak = Math.max(
      readDailyStreak(DAILY_ACTIVITY_KEYS.dailyCard).current,
      readDailyStreak(DAILY_ACTIVITY_KEYS.horoscope).current,
      readDailyStreak(DAILY_ACTIVITY_KEYS.tarot).current,
    )

    // First-visit-of-day: play phrase → then reveal blocks
    const SEEN_KEY = 'arcana_landing_seen_v1'
    // Use the LOCAL date (matches all content/day-boundary logic) instead of
    // UTC, so "first visit today" is consistent around midnight.
    const today = typeof window !== 'undefined' ? localISODate() : ''
    const lastSeen = typeof window !== 'undefined' ? localStorage.getItem(SEEN_KEY) : ''

    if (lastSeen !== today) {
      // First visit today — phrase plays, then blocks appear via runIntroReveal
      this.isFirstVisitToday = true
      if (typeof window !== 'undefined') localStorage.setItem(SEEN_KEY, today)
      this.resetPhraseQueue()
      this.setNextPhrase()
      this.$nextTick(() => {
        this.startRandomLetterReveal()
      })
      // Safety net: if the phrase/reveal chain stalls for any reason, force the
      // home blocks visible so they can never get stuck hidden on cold start.
      this.introFallbackTimer = setTimeout(() => {
        this.runIntroReveal()
      }, 4000)
    } else {
      // Repeat visit — show everything immediately, no phrase
      this.showHomeActions = true
      this.showAstroCards = true
      this.introSequenceComplete = true
    }

    const scheduleStartupWork = () => {
      this.landingContentFrameId = null
      void this.loadLandingContent()
      this.astroTaskHandle = scheduleNonCriticalTask(
        () => {
          this.astroTaskHandle = null
          void this.computeAstro()
        },
        { timeout: 1800, fallbackDelay: 280 },
      )
    }

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      this.landingContentFrameId = window.requestAnimationFrame(scheduleStartupWork)
      return
    }
    scheduleStartupWork()
  },

  beforeUnmount() {
    clearInterval(this.lettersTimer)
    clearInterval(this.hideTimer)
    clearTimeout(this.revealTimeout)
    clearTimeout(this.hideTimeout)
    clearTimeout(this.cycleTimeout)
    clearTimeout(this.introFallbackTimer)
    clearTimeout(this.astroSheetNavRestoreTimer)
    cancelScheduledTask(this.astroTaskHandle)
    if (this.landingContentFrameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.landingContentFrameId)
      this.landingContentFrameId = null
    }
    this.syncAstroSheetNavState(false)
  },

  methods: {
    readHomeQaConfig() {
      if (!import.meta.env.DEV || typeof window === 'undefined') return null
      const params = new URLSearchParams(window.location.search || '')
      if (params.get('qa') !== HOME_QA_QUERY_VALUE) return null

      const rawView = String(params.get('view') || '').trim()
      const view =
        rawView === 'revealed' || rawView === 'generic' ? rawView : 'fresh'
      const locale = params.get('locale') === 'uk' ? 'uk' : 'en'
      return { view, locale }
    },

    applyHomeQaState() {
      const qaConfig = this.qaHomeConfig
      if (!qaConfig) return

      currentLocale.value = qaConfig.locale
      this.qaNow = new Date('2026-04-29T09:18:00')
      this.isFirstVisitToday = false
      this.isPhraseFadingOut = false
      this.introSequenceComplete = true
      this.showHomeActions = true
      this.showAstroCards = true
      this.astroSheetOpen = false
      this.astroSheetCardId = ''
      this.fullText = ''
      this.revealedIndices = []
      this.dailyStreak = qaConfig.view === 'revealed' ? 5 : 2
      this.astroToday = {
        moonPhaseKey: 'waxingGibbous',
        moonSignKey: 'virgo',
        moonDegInSign: 14,
        moonIlluminationPct: 72,
        mercuryRetrograde: false,
        nextLunarEvent: {
          daysUntil: 2,
          date: new Date('2026-05-01T21:30:00'),
        },
        planetaryDay: { key: 'mercury' },
        sunSignKey: 'taurus',
        sunDegInSign: 9,
        elementKey: 'earth',
        numerologyDay: 6,
      }

      const copy = {
        en: {
          dailyCardTitle: 'The Hermit',
          dailyCardTeaser: 'Quiet focus',
          horoscopePreview:
            'A steady pace will help you sort priorities and protect your energy today.',
        },
        uk: {
          dailyCardTitle: 'Відлюдник',
          dailyCardTeaser: 'Тиха ясність',
          horoscopePreview:
            'Спокійний темп допоможе розставити пріоритети й не розтратити енергію сьогодні.',
        },
      }[qaConfig.locale]

      this.dailyCardData = {
        title: copy.dailyCardTitle,
        image: '/images/cards/majorArcana/TheHermit.png',
        orientation: 'upright',
        keywords: [],
        teaser: copy.dailyCardTeaser,
      }

      this.horoscopeData =
        qaConfig.view === 'generic'
          ? null
          : {
              signKey: 'virgo',
              signLabel: this.tt('zodiac.virgo'),
              themeKey: 'energy',
              preview: copy.horoscopePreview,
            }
      this.homeSignKey = qaConfig.view === 'generic' ? '' : 'virgo'

      if (qaConfig.view === 'revealed') {
        this.hasDailyCardToday = true
        this.hasRevealedDailyCardOnHomeToday = true
        this.hasHoroscopeToday = true
        this.hasTarotToday = false
        return
      }

      this.hasDailyCardToday = false
      this.hasRevealedDailyCardOnHomeToday = false
      this.hasHoroscopeToday = false
      this.hasTarotToday = false
    },

    syncAstroSheetNavState(isOpen) {
      if (typeof document === 'undefined') return
      document.body.classList.toggle('astro-sheet-open', Boolean(isOpen))
    },

    scheduleAstroSheetNavRestore(delayMs = 320) {
      clearTimeout(this.astroSheetNavRestoreTimer)
      this.astroSheetNavRestoreTimer = setTimeout(() => {
        this.syncAstroSheetNavState(false)
        this.astroSheetNavRestoreTimer = null
      }, delayMs)
    },

    armAstroSheetActionLock(durationMs = 600) {
      const lockUntil = Date.now() + durationMs
      this.astroSheetActionLockUntil = lockUntil
      if (typeof document !== 'undefined') {
        document.body.dataset.navTapLockUntil = String(lockUntil)
      }
    },

    isAstroSheetActionLocked() {
      return Date.now() < this.astroSheetActionLockUntil
    },

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

    refreshHomeProgressState() {
      this.hasDailyCardToday = hasDailyActivityToday(DAILY_ACTIVITY_KEYS.dailyCard)
      this.hasRevealedDailyCardOnHomeToday =
        this.hasDailyCardToday || this.readHomeDailyCardRevealState()
      this.hasHoroscopeToday = hasDailyActivityToday(DAILY_ACTIVITY_KEYS.horoscope)
      this.hasTarotToday = hasDailyActivityToday(DAILY_ACTIVITY_KEYS.tarot)
    },

    getHomeDailyCardRevealStorageKey(dateKey = localISODate()) {
      return `${HOME_DAILY_CARD_REVEAL_PREFIX}${dateKey}`
    },

    normalizeZodiacKey(value) {
      const normalized = String(value || '')
        .trim()
        .toLowerCase()
      const valid = [
        'aries',
        'taurus',
        'gemini',
        'cancer',
        'leo',
        'virgo',
        'libra',
        'scorpio',
        'sagittarius',
        'capricorn',
        'aquarius',
        'pisces',
      ]
      return valid.includes(normalized) ? normalized : ''
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

    readCachedHoroscopeSignKey() {
      if (typeof window === 'undefined') return ''
      try {
        const raw = localStorage.getItem(HOROSCOPE_SIGN_CACHE_KEY) || ''
        return this.normalizeZodiacKey(raw)
      } catch {
        return ''
      }
    },

    readHomeDailyCardRevealState(dateKey = localISODate()) {
      if (typeof window === 'undefined') return false
      try {
        return localStorage.getItem(this.getHomeDailyCardRevealStorageKey(dateKey)) === '1'
      } catch {
        return false
      }
    },

    persistHomeDailyCardRevealState(value, dateKey = localISODate()) {
      if (typeof window === 'undefined') return
      try {
        const key = this.getHomeDailyCardRevealStorageKey(dateKey)
        if (value) {
          localStorage.setItem(key, '1')
          return
        }
        localStorage.removeItem(key)
      } catch {
        // ignore storage errors
      }
    },

    openMyDay() {
      if (this.isAstroSheetActionLocked()) return
      void this.$router.push({ name: 'daily', query: { source: 'landing', entry: 'hero_card' } })
    },

    async handleHeroCardClick() {
      if (this.isAstroSheetActionLocked()) return
      if (!this.isHeroCardRevealed) {
        await this.triggerImpact(ImpactStyle.Medium)
        this.persistHomeDailyCardRevealState(true)
        this.hasRevealedDailyCardOnHomeToday = true
        return
      }

      await this.triggerImpact(ImpactStyle.Light)
      this.openMyDay()
    },

    openHoroscope() {
      if (this.isAstroSheetActionLocked()) return
      void this.$router.push({ name: 'horoscope' })
    },

    async openFocusToday() {
      await this.triggerImpact(ImpactStyle.Light)
      this.openHoroscope()
    },

    async openNextRitual() {
      if (this.isAstroSheetActionLocked()) return
      await this.triggerImpact(ImpactStyle.Light)
      const next = this.dailyProgressItems.find((item) => !item.done)
      const routeByKey = {
        [DAILY_ACTIVITY_KEYS.dailyCard]: 'daily',
        [DAILY_ACTIVITY_KEYS.horoscope]: 'horoscope',
        [DAILY_ACTIVITY_KEYS.tarot]: 'tarot',
      }
      const name = next ? routeByKey[next.key] : 'readings'
      void this.$router.push({
        name,
        query: { source: 'landing', entry: 'daily_track' },
      })
    },

    async openAstroSheet(card) {
      if (this.isAstroSheetActionLocked()) return
      if (!card?.id) return
      await this.triggerImpact(ImpactStyle.Light)
      this.astroSheetCardId = card.id
      this.astroSheetOpen = true
    },

    handleAstroSheetAction() {
      if (this.isAstroSheetActionLocked()) return
      const action = this.astroSheetContent?.action
      this.astroSheetOpen = false
      if (!action?.type) return
      if (action.type === 'daily') this.openMyDay()
      if (action.type === 'horoscope') this.openHoroscope()
    },

    async closeAstroSheet() {
      if (!this.astroSheetOpen) return
      await this.triggerImpact(ImpactStyle.Light)
      this.armAstroSheetActionLock()
      clearTimeout(this.astroSheetNavRestoreTimer)
      this.astroSheetOpen = false
    },

    async onAstroSheetActionClick() {
      if (this.isAstroSheetActionLocked()) return
      await this.triggerImpact(ImpactStyle.Light)
      this.handleAstroSheetAction()
    },

    buildAstroSheetContent(cardId) {
      const d = this.astroToday
      if (!d) return null

      const sheet = this.tt('landing.sheet') || {}
      const sheetTitles = sheet.titles || {}
      const sheetSubtitles = sheet.subtitles || {}
      const sheetSummaries = sheet.summaries || {}
      const sheetFacts = sheet.facts || {}
      const sheetLabels = sheet.labels || {}
      const sheetActions = sheet.actions || {}
      const planetDomains = sheet.planetDomains || {}
      const modalityMap = sheet.modalities || {}
      const numerologySummary = sheet.numerologySummary || {}
      const weekday = new Intl.DateTimeFormat(this.locale === 'uk' ? 'uk-UA' : 'en-US', {
        weekday: 'long',
      }).format(new Date())
      const lunarDateLabel = d.nextLunarEvent?.date
        ? new Intl.DateTimeFormat(this.locale === 'uk' ? 'uk-UA' : 'en-US', {
            day: 'numeric',
            month: 'long',
          }).format(d.nextLunarEvent.date)
        : ''
      const lunarTimeLabel = d.nextLunarEvent?.date
        ? new Intl.DateTimeFormat(this.locale === 'uk' ? 'uk-UA' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }).format(d.nextLunarEvent.date)
        : ''
      const lunarHoursUntil = d.nextLunarEvent?.date
        ? Math.max(0, Math.round((d.nextLunarEvent.date.getTime() - Date.now()) / 3600000))
        : null
      const signElement = this._astroElement(d.sunSignKey)
      const todayDate = new Date()
      const dateDigits =
        `${todayDate.getFullYear()}${todayDate.getMonth() + 1}${todayDate.getDate()}`
          .split('')
          .map(Number)
      const firstNumerologySum = dateDigits.reduce((sum, digit) => sum + digit, 0)
      const finalNumerologyDigits = String(firstNumerologySum).split('').map(Number)
      const factsFor = (...items) => items.filter(Boolean)
      const summaryFor = (text) => this.buildSummaryParts(text)

      switch (cardId) {
        case 'moon': {
          const phase = d.moonPhaseKey
          const moonSign = this.tt(`zodiac.${d.moonSignKey}`)
          return {
            label: this.tt('astro.cards.moonPhase'),
            icon: this.moonPhaseGlyph(phase),
            title: sheetTitles.moon,
            subtitle: sheetSubtitles.moon,
            facts: factsFor(
              `${sheetFacts.moonIllumination}: ${d.moonIlluminationPct}%.`,
              `${sheetFacts.moonMoved}: ${d.moonDegInSign}° ${sheetFacts.moonMovedConnector} ${moonSign}.`,
              `${sheetFacts.signModality}: ${modalityMap[d.moonSignKey]}.`,
            ),
            ...summaryFor(sheetSummaries.moon),
          }
        }
        case 'lunar': {
          const days = d.nextLunarEvent?.daysUntil ?? -1
          const subtitle =
            days <= 0
              ? this.tt('astro.tonight')
              : days === 1
                ? this.tt('astro.tomorrow')
                : `${days} ${this._astroDaysWord(days)}`
          return {
            label: sheetLabels.lunar,
            icon: '🌕',
            title: sheetTitles.lunar,
            subtitle: lunarDateLabel || subtitle,
            facts: factsFor(
              lunarDateLabel
                ? `${sheetFacts.nextFullMoon}: ${lunarDateLabel}${lunarTimeLabel ? ` ${sheetFacts.atTime} ${lunarTimeLabel}` : ''}.`
                : '',
              `${sheetFacts.timeLeft}: ${subtitle}.`,
              lunarHoursUntil !== null ? `${sheetFacts.hoursFromNow}: ${lunarHoursUntil}.` : '',
            ),
            ...summaryFor(sheetSummaries.lunar),
          }
        }
        case 'planet': {
          const key = d.planetaryDay?.key || 'moon'
          return {
            label: this.tt('astro.cards.dayRuler'),
            icon: this.planetaryGlyph(key),
            title: sheetTitles.planet,
            subtitle: weekday,
            facts: factsFor(
              `${sheetFacts.dayRuler}: ${this.tt(`astro.planets.${key}`)}.`,
              `${sheetFacts.classicalLink}: ${planetDomains[key]}.`,
              `${sheetFacts.weekday}: ${weekday}.`,
            ),
            ...summaryFor(sheetSummaries.planet),
          }
        }
        case 'sun':
          return {
            label: this.tt('astro.cards.sunPath'),
            icon: '☉',
            title: sheetTitles.sun,
            subtitle: sheetSubtitles.sun,
            facts: factsFor(
              `${this.tt(`zodiac.${d.sunSignKey}`)} ${sheetFacts.sunElementConnector} ${this.tt(`astro.elements.${signElement}`).toLowerCase()} ${sheetFacts.sunElementSuffix}.`,
              `${sheetFacts.signModality}: ${modalityMap[d.sunSignKey]}.`,
              `${sheetFacts.daysUntilNextSign}: ${Math.max(0, 30 - d.sunDegInSign)} ${this.landingDayWord(Math.max(0, 30 - d.sunDegInSign))}.`,
            ),
            ...summaryFor(sheetSummaries.sun),
          }
        case 'num': {
          return {
            label: this.tt('astro.cards.dayNumber'),
            icon:
              { 1: '🌟', 2: '☯️', 3: '🎨', 4: '🏛️', 5: '🦋', 6: '🌸', 7: '🔮', 8: '💫', 9: '🌀' }[
                d.numerologyDay
              ] || '✦',
            title: sheetTitles.number,
            subtitle: localISODate(todayDate),
            facts: factsFor(
              `${sheetFacts.formula}: ${dateDigits.join('+')} = ${firstNumerologySum}.`,
              firstNumerologySum > 9
                ? `${finalNumerologyDigits.join('+')} = ${d.numerologyDay}.`
                : '',
              `${sheetFacts.numberKey}: ${this.tt(`astro.numerology.${d.numerologyDay}`)}.`,
            ),
            ...summaryFor(numerologySummary[d.numerologyDay] || numerologySummary[7]),
          }
        }
        case 'retro':
          return {
            label: this.tt('astro.cards.headsUp'),
            icon: this.planetaryGlyph('mercury'),
            title: sheetTitles.retro,
            subtitle: sheetSubtitles.retro,
            facts: factsFor(
              sheetFacts.retrogradeMeaning,
              sheetFacts.mercuryTradition,
              sheetFacts.currentRetroStatus,
            ),
            ...summaryFor(sheetSummaries.retro),
            action: { type: 'horoscope', label: sheetActions.openHoroscope },
          }
        default:
          return null
      }
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

    planetaryGlyph(planetKey) {
      // Monochrome astrological glyphs only — keep the planetary set visually
      // consistent (no color emoji for sun/moon).
      const map = {
        sun: '☉',
        moon: '☽',
        mars: '♂',
        mercury: '☿',
        jupiter: '♃',
        venus: '♀',
        saturn: '♄',
      }
      return map[planetKey] || '☿'
    },

    astroCardStyle(card) {
      return {
        '--astro-card-base': card?.bg || 'rgba(30, 40, 62, 0.7)',
        '--astro-card-glow': card?.glow || 'rgba(255, 255, 255, 0.12)',
        '--astro-card-border': card?.border || 'rgba(255,255,255,0.16)',
      }
    },

    astroSheetStyle() {
      const selectedCard = this.astroCards.find((card) => card.id === this.astroSheetCardId)
      const selected = {
        accent: selectedCard?.glow || 'rgba(138, 176, 255, 0.22)',
        accentSoft: selectedCard?.bg || 'rgba(138, 176, 255, 0.1)',
        border: selectedCard?.border || 'rgba(148, 184, 244, 0.18)',
      }
      return {
        '--astro-sheet-accent': selected.accent,
        '--astro-sheet-accent-soft': selected.accentSoft,
        '--astro-sheet-border': selected.border,
      }
    },

    compactPreview(text, maxChars = 52) {
      const raw = String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
      if (!raw) return ''
      if (raw.length <= maxChars) return raw
      return `${raw
        .slice(0, maxChars)
        .replace(/[.,;:!?-]+$/u, '')
        .trim()}…`
    },

    firstSentence(text) {
      const raw = String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
      if (!raw) return ''
      const match = raw.match(/.*?[.!?](\s|$)/u)
      return match ? match[0].trim() : raw
    },

    buildCardTeaser(text) {
      const first = this.firstSentence(text)
        .replace(/[.!?]+$/u, '')
        .trim()
      if (!first) return ''

      let teaser = first.split(/[,:;]\s+/u)[0]?.trim() || first
      if (teaser.length > 28) {
        teaser = this.compactPreview(teaser, 28)
      }
      return teaser ? `${teaser.charAt(0).toUpperCase()}${teaser.slice(1)}` : ''
    },

    buildSummaryParts(text) {
      const summary = String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
      if (!summary) return { summary: '', summaryLead: '', summaryBody: '' }

      const summaryLead = this.firstSentence(summary)
      const summaryBody = summary
        .slice(summaryLead.length)
        .replace(/^[-–—,:;]\s*/u, '')
        .trim()

      return { summary, summaryLead, summaryBody }
    },

    _getAnonSeed() {
      if (typeof window === 'undefined') return 'anon'
      const stored = localStorage.getItem('arcana_daily_seed_v1')
      if (stored) return stored
      const next =
        window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`
      localStorage.setItem('arcana_daily_seed_v1', next)
      return next
    },

    _zodiacFromDate(rawDate) {
      const raw = String(rawDate || '').trim()
      if (!raw) return ''
      let day = 0,
        month = 0
      if (raw.includes('.')) {
        const p = raw.split('.').map((v) => parseInt(v, 10))
        day = p[0] || 0
        month = p[1] || 0
      } else if (raw.includes('-')) {
        const p = raw.split('-').map((v) => parseInt(v, 10))
        month = p[1] || 0
        day = p[2] || 0
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
      this.horoscopeData = null
      this.homeSignKey = ''
      this.refreshHomeProgressState()

      const results = await Promise.allSettled([
        this.loadHomeDailyCardContent({ locale, today }),
        this.loadHomeHoroscopePreview({ locale, today }),
      ])

      const warnings = [
        '[Landing] daily card load failed',
        '[Landing] horoscope load failed',
      ]

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(warnings[index], result.reason)
        }
      })
    },

    async loadHomeDailyCardContent({ locale, today }) {
      const { cards } = await loadDailyCardsSnapshot({ loadTarotData })
      if (!cards.length) return

      const userId = this.authStore?.state?.user?.id
      const seed = userId || this._getAnonSeed()
      const { index, orientation } = getDeterministicDailyCardSelection({
        dateKey: today,
        identity: seed,
        cardsLength: cards.length,
      })
      const card = cards[index]
      const rawMeaning =
        card?.meaning?.[orientation]?.[locale] ||
        card?.meaning?.[orientation]?.en ||
        card?.description?.[orientation]?.[locale] ||
        card?.description?.[orientation]?.en ||
        ''
      this.dailyCardData = {
        title: card?.name?.[locale] || card?.name?.en || '',
        image: card?.file ? `/images/cards/${card.file}` : '',
        orientation,
        keywords: (card?.keywords?.[locale] || card?.keywords?.en || []).slice(0, 2),
        teaser: this.buildCardTeaser(rawMeaning),
      }
    },

    async loadHomeHoroscopePreview({ locale, today }) {
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

      const signKey = this.normalizeZodiacKey(snap.signKey) || this.readCachedHoroscopeSignKey()
      this.homeSignKey = signKey
      if (!signKey) return

      const result = await loadHoroscopeRegistry({
        locale,
        today,
        loadLocal,
        saveLocal,
        selectHoroscopes,
      })
      const reg = result?.registry?.[signKey] || {}
      const themeKey =
        ['energy', 'career', 'love'].find((key) => reg?.[key]?.summary || reg?.[key]?.detailed) ||
        ''
      const rawText = themeKey ? reg?.[themeKey]?.summary || reg?.[themeKey]?.detailed || '' : ''
      const preview = this.firstSentence(rawText)
      this.horoscopeData = {
        signKey,
        signLabel: this.tt(`zodiac.${signKey}`),
        themeKey,
        preview: preview ? preview.trim() : '',
      }
    },

    async computeAstro() {
      try {
        const Astronomy = await loadAstronomyEngine()
        const now = new Date()
        const t1 = new Date(now.getTime() + 24 * 60 * 60 * 1000)
        const sunLon = this._astroEclipticLon(Astronomy, Astronomy.Body.Sun, now)
        const moonLon = this._astroEclipticLon(Astronomy, Astronomy.Body.Moon, now)
        const merc0 = this._astroEclipticLon(Astronomy, Astronomy.Body.Mercury, now)
        const merc1 = this._astroEclipticLon(Astronomy, Astronomy.Body.Mercury, t1)
        const elong = this._astroAbsDiff(moonLon, sunLon)
        const moonSignKey = this._astroSignKey(moonLon)
        const moonNorm = ((moonLon % 360) + 360) % 360
        const sunNorm = ((sunLon % 360) + 360) % 360
        this.astroToday = {
          moonPhaseKey: this._astroPhaseKey(elong),
          moonSignKey,
          moonDegInSign: Math.round(moonNorm % 30),
          moonIlluminationPct: Math.round(((1 - Math.cos((elong * Math.PI) / 180)) / 2) * 100),
          mercuryRetrograde: this._astroSignedDelta(merc1, merc0) < 0,
          nextLunarEvent: this._astroNextLunarEvent(Astronomy, now),
          planetaryDay: this._astroPlanetaryDay(),
          sunSignKey: this._astroSignKey(sunLon),
          sunDegInSign: Math.round(sunNorm % 30),
          elementKey: this._astroElement(moonSignKey),
          numerologyDay: this._astroNumerology(now),
        }
      } catch (e) {
        console.warn('[LandingScene] astro calc failed', e)
      }
    },

    _astroEclipticLon(Astronomy, body, date) {
      const time =
        typeof Astronomy.MakeTime === 'function'
          ? Astronomy.MakeTime(date)
          : new Astronomy.AstroTime(date)
      return Astronomy.Ecliptic(Astronomy.GeoVector(body, time, false)).elon
    },
    _astroPhaseKey(elong) {
      const x = ((elong % 360) + 360) % 360
      if (x < 22.5 || x >= 337.5) return 'new'
      if (x < 67.5) return 'waxingCrescent'
      if (x < 112.5) return 'firstQuarter'
      if (x < 157.5) return 'waxingGibbous'
      if (x < 202.5) return 'full'
      if (x < 247.5) return 'waningGibbous'
      if (x < 292.5) return 'lastQuarter'
      return 'waningCrescent'
    },
    _astroSignKey(lon) {
      const signs = [
        'aries',
        'taurus',
        'gemini',
        'cancer',
        'leo',
        'virgo',
        'libra',
        'scorpio',
        'sagittarius',
        'capricorn',
        'aquarius',
        'pisces',
      ]
      return signs[Math.floor((((lon % 360) + 360) % 360) / 30) % 12]
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
    _astroNextLunarEvent(Astronomy, now) {
      try {
        const fullMoonTime = Astronomy.SearchMoonPhase(180, now, 40)
        if (!fullMoonTime) return null
        const eventDate = fullMoonTime.date
        const daysUntil = Math.max(0, Math.ceil((eventDate.getTime() - now.getTime()) / 86400000))
        return { daysUntil, date: eventDate }
      } catch {
        return null
      }
    },
    _astroPlanetaryDay() {
      const rulers = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']
      const symbols = {
        sun: '☀',
        moon: '🌙',
        mars: '♂',
        mercury: '☿',
        jupiter: '♃',
        venus: '♀',
        saturn: '♄',
      }
      const key = rulers[new Date().getDay()]
      return { key, symbol: symbols[key] }
    },
    _astroElement(moonSignKey) {
      const fire = ['aries', 'leo', 'sagittarius']
      const earth = ['taurus', 'virgo', 'capricorn']
      const air = ['gemini', 'libra', 'aquarius']
      if (fire.includes(moonSignKey)) return 'fire'
      if (earth.includes(moonSignKey)) return 'earth'
      if (air.includes(moonSignKey)) return 'air'
      return 'water'
    },
    _astroNumerology(date) {
      const digits = `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`
      let n = digits.split('').reduce((s, d) => s + Number(d), 0)
      while (n > 9)
        n = String(n)
          .split('')
          .reduce((s, d) => s + Number(d), 0)
      return n
    },
    _astroDaysWord(n) {
      if (this.locale !== 'uk') return this.landingDayWord(n)
      const mod10 = n % 10,
        mod100 = n % 100
      const dayForms = this.tt('landing.dayForms') || {}
      if (mod100 >= 11 && mod100 <= 19) return dayForms.many || ''
      if (mod10 === 1) return dayForms.one || ''
      if (mod10 >= 2 && mod10 <= 4) return dayForms.few || ''
      return dayForms.many || ''
    },

    landingDayWord(n) {
      const dayForms = this.tt('landing.dayForms') || {}
      if (this.locale !== 'uk') {
        return n === 1 ? dayForms.one || '' : dayForms.other || dayForms.many || ''
      }
      const mod10 = n % 10
      const mod100 = n % 100
      if (mod100 >= 11 && mod100 <= 19) return dayForms.many || ''
      if (mod10 === 1) return dayForms.one || ''
      if (mod10 >= 2 && mod10 <= 4) return dayForms.few || ''
      return dayForms.many || ''
    },

    shuffleArray(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    },

    resetPhraseQueue() {
      const list = this.landingPhrases
      if (!list?.length) return
      this.phraseQueue = this.shuffleArray([...Array(list.length).keys()])
      this.phraseCursor = 0
      if (list.length > 1 && this.phraseQueue[0] === this.lastPhraseIndex) {
        const swapIndex = 1
        ;[this.phraseQueue[0], this.phraseQueue[swapIndex]] = [
          this.phraseQueue[swapIndex],
          this.phraseQueue[0],
        ]
      }
    },

    setNextPhrase() {
      const list = this.landingPhrases
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
      this.isPhraseFadingOut = false
      const indices = []
      for (let i = 0; i < this.fullText.length; i++) {
        if (this.fullText[i] !== ' ') indices.push(i)
      }
      // If phrases are not ready yet (e.g. i18n bundle still loading on cold
      // start), do NOT dead-end here — reveal the home blocks immediately so
      // they never get stuck invisible at opacity:0.
      if (!indices.length) {
        this.isFirstVisitToday = false
        this.runIntroReveal()
        return
      }
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[indices[i], indices[j]] = [indices[j], indices[i]]
      }
      this.revealedIndices = []
      this.revealTimeout = setTimeout(() => {
        let current = 0
        const totalDuration = 2600
        const minInterval = 58
        const step = Math.max(minInterval, Math.floor(totalDuration / indices.length))
        this.lettersTimer = setInterval(() => {
          if (current >= indices.length) {
            clearInterval(this.lettersTimer)
            this.lettersTimer = null
            this.startPhraseFadeOut()
            return
          }
          this.revealedIndices = [...this.revealedIndices, indices[current]]
          current++
        }, step)
      }, 380)
    },

    startPhraseFadeOut() {
      this.hideTimeout = setTimeout(() => {
        this.isPhraseFadingOut = true
        this.hideTimer = setTimeout(() => {
          this.isFirstVisitToday = false
          this.isPhraseFadingOut = false
          this.runIntroReveal()
          this.hideTimer = null
        }, 420)
        // Tightened from 2600ms so the hero/value is reachable sooner on the
        // first-visit-of-day intro (better first impression / screenshot).
      }, 1200)
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
  },
}
</script>

<style lang="scss" scoped>
/* ─── Scene fade ───────────────────────────────────────── */
.wrapper,
.container {
  opacity: 1;
  transition: none;
}
.scene-ready {
  opacity: 1;
}
.wrapper {
  height: 100dvh;
}
.container {
  position: relative;
  height: 100dvh;
  overflow: hidden;
}

.bg-container {
  background-image: url('assets/images/landing-stars-bg.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.mono-text {
  font-style: normal;
  font-weight: 400;
}

.streak-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-height: 32px;
  padding: 0 10px;
  margin: 0;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(8, 13, 22, 0.62);
  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.02em;
  color: rgba(226, 232, 241, 0.72);
}

.daily-track {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
  min-height: 40px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  color: rgba(226, 232, 241, 0.6);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: 0.01em;
}

.daily-track__dots {
  display: inline-flex;
  gap: 4px;
}

.daily-track__dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  transition: background 0.3s ease;
}

.daily-track__dot--done {
  background: rgba(141, 190, 240, 0.9);
}

.daily-track__label {
  white-space: nowrap;
}

.status-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
  flex-shrink: 0;
}

/* ─── Logo ─────────────────────────────────────────────── */
.logo-wrap {
  position: relative;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: max(52px, calc(env(safe-area-inset-top, 0px) + 12px))
    max(16px, calc(env(safe-area-inset-right, 0px) + 16px)) 0
    max(16px, calc(env(safe-area-inset-left, 0px) + 16px));
}

.myday-hero__text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1 1 auto;
  min-width: 0;
  gap: 4px;
  padding: 0;
  text-align: left;
}

.myday-title {
  font-family: var(--font-accent), serif;
  font-size: 22px;
  font-weight: 400;
  letter-spacing: 0.04em;
  color: rgba(235, 242, 255, 0.96);
  line-height: 1.2;
}

.myday-kicker {
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: capitalize;
  color: rgba(214, 225, 242, 0.68);
  margin: 0;
  max-width: 100%;
  text-wrap: pretty;
}

/* ─── Circle card hero ─────────────────────────────────── */
/* Positioned so the card image sits in the center of the large ring. */
.circle-card {
  position: absolute;
  top: 55.5%;
  left: 50%;
  width: min(272px, calc(100vw - 44px));
  min-height: 160px;
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 100px 0 0;

  opacity: 0;
  transition:
    opacity 0.9s ease 0.2s,
    transform 0s linear 0s;
  transform: translate(-50%, -50%);
  will-change: opacity;
}
.circle-card--visible {
  opacity: 1;
  transform: translate(-50%, -50%);
}

.focus-today {
  position: absolute;
  left: 50%;
  bottom: calc(env(safe-area-inset-bottom, 0px) + 132px);
  width: min(348px, calc(100vw - 28px));
  z-index: 4;
  transform: translateX(-50%);
  opacity: 0;
  transition:
    opacity 0.7s ease 0.24s,
    transform 0.7s ease 0.24s;
  pointer-events: none;
}

.focus-today--visible {
  opacity: 1;
}

.focus-today--compact {
  width: min(344px, calc(100vw - 28px));
}

.focus-today__card {
  width: 100%;
  min-height: 104px;
  padding: 11px 14px 11px;
  border-radius: 17px;
  border: 1px solid rgba(132, 159, 194, 0.12);
  background:
    linear-gradient(180deg, rgba(17, 28, 46, 0.54), rgba(10, 17, 29, 0.72)),
    radial-gradient(circle at top right, rgba(124, 166, 226, 0.1), rgba(124, 166, 226, 0) 44%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 10px 22px rgba(2, 7, 15, 0.09);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  outline: none;
  pointer-events: auto;
}

.focus-today__card--compact {
  min-height: 70px;
  padding: 10px 14px 10px;
  gap: 0;
  border-color: rgba(132, 159, 194, 0.1);
  background:
    linear-gradient(180deg, rgba(17, 28, 46, 0.34), rgba(10, 17, 29, 0.76)),
    radial-gradient(circle at top right, rgba(124, 166, 226, 0.06), rgba(124, 166, 226, 0) 44%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.025),
    0 8px 18px rgba(2, 7, 15, 0.07);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.focus-today__top {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 12px;
}

.focus-today__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.focus-today__compact-row {
  width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

.focus-today__compact-copy {
  min-width: 0;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.focus-today__sign-chip {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  background: rgba(109, 141, 189, 0.12);
  border: 1px solid rgba(159, 193, 231, 0.12);
  font-size: 12px;
  line-height: 1;
  font-weight: 600;
  color: rgba(228, 236, 247, 0.88);
}

.focus-today__eyebrow {
  font-size: 10px;
  line-height: 1;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(228, 236, 247, 0.5);
}

.focus-today__body {
  margin: 0;
  font-size: 14px;
  line-height: 1.32;
  color: rgba(240, 245, 252, 0.9);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  text-wrap: pretty;
}

.focus-today__body--compact {
  font-size: 14px;
  line-height: 1.3;
  -webkit-line-clamp: 2;
  color: rgba(235, 241, 249, 0.78);
}

.focus-today__footer {
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.focus-today__card--compact .focus-today__footer {
  display: none;
}

.focus-today__card--compact .focus-today__cta {
  white-space: nowrap;
  align-self: center;
}

.focus-today__cta {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1;
  font-weight: 700;
  color: rgba(167, 205, 245, 0.92);
}

.focus-today__card:focus-visible {
  outline: none;
  border-color: rgba(169, 208, 245, 0.32);
  box-shadow:
    0 0 0 3px rgba(113, 168, 232, 0.12),
    0 10px 24px rgba(2, 7, 15, 0.14);
}

.focus-today__card:active {
  transform: translateY(1px);
}


.circle-card__media {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
}

.circle-card__img-wrap {
  position: relative;
  width: 108px;
  height: 174px;
  border-radius: 12px;
  transform-style: preserve-3d;
  transition: transform 760ms cubic-bezier(0.2, 0.8, 0.2, 1);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.38);
}

.circle-card__img-wrap--revealed {
  transform: rotateY(180deg);
}

.circle-card__face {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  box-shadow:
    0 10px 22px rgba(1, 6, 14, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
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

.circle-card__img-skeleton {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    115deg,
    rgba(255, 255, 255, 0.04) 30%,
    rgba(255, 255, 255, 0.09) 50%,
    rgba(255, 255, 255, 0.04) 70%
  );
  background-size: 220% 100%;
  animation: circle-card-skeleton 1.4s ease-in-out infinite;
}

@keyframes circle-card-skeleton {
  0% {
    background-position: 130% 0;
  }
  100% {
    background-position: -30% 0;
  }
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
    radial-gradient(circle at 16% 8%, rgba(130, 178, 232, 0.18), rgba(130, 178, 232, 0) 34%),
    radial-gradient(circle at 84% 92%, rgba(88, 126, 182, 0.15), rgba(88, 126, 182, 0) 36%),
    radial-gradient(circle at 50% 40%, rgba(165, 205, 247, 0.06), rgba(165, 205, 247, 0) 28%),
    linear-gradient(160deg, rgba(16, 32, 49, 0.995), rgba(8, 17, 30, 0.995) 56%, rgba(4, 10, 18, 1));
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-card__back::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 50% 0%, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0) 30%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0) 34%),
    linear-gradient(180deg, rgba(98, 145, 198, 0.12), rgba(98, 145, 198, 0) 46%);
  pointer-events: none;
}

.circle-card__back::after {
  content: '';
  position: absolute;
  inset: 9px;
  border-radius: 9px;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(181, 214, 244, 0.12), rgba(255, 255, 255, 0)) center/100% 1px no-repeat,
    linear-gradient(180deg, rgba(255, 255, 255, 0), rgba(181, 214, 244, 0.1), rgba(255, 255, 255, 0)) center/1px 100% no-repeat;
  opacity: 0.75;
  pointer-events: none;
}

.circle-card__back-frame {
  position: absolute;
  inset: 7px;
  border-radius: 9px;
  border: 1px solid rgba(166, 200, 233, 0.28);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.03),
    0 0 0 1px rgba(78, 118, 176, 0.05);
}

.circle-card__back-frame--inner {
  inset: 13px;
  border-radius: 7px;
  border-color: rgba(144, 179, 214, 0.18);
}

.circle-card__back-band {
  position: absolute;
  left: 50%;
  top: 16px;
  bottom: 16px;
  width: 1.5px;
  transform: translateX(-50%);
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0),
    rgba(182, 214, 244, 0.3),
    rgba(255, 255, 255, 0)
  );
  box-shadow: 0 0 10px rgba(113, 160, 214, 0.14);
}

.circle-card__back-center {
  position: relative;
  z-index: 1;
  width: calc(100% - 18px);
  height: calc(100% - 18px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-card__back-center::before,
.circle-card__back-center::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.circle-card__back-center::before {
  width: 96px;
  height: 96px;
  border: 1px solid rgba(182, 214, 244, 0.08);
  opacity: 0.52;
}

.circle-card__back-center::after {
  width: 62px;
  height: 62px;
  border: 1px solid rgba(182, 214, 244, 0.05);
  opacity: 0.48;
}

.circle-card__back-core,
.circle-card__back-core-ring {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 999px;
  transform: translate(-50%, -50%);
}

.circle-card__back-core {
  width: 78px;
  height: 78px;
  border: 1px solid rgba(184, 214, 242, 0.16);
  background:
    radial-gradient(circle at 50% 30%, rgba(223, 236, 250, 0.12), rgba(223, 236, 250, 0) 46%),
    conic-gradient(from 180deg at 50% 50%, rgba(28, 56, 84, 0.96), rgba(12, 22, 35, 0.92), rgba(28, 56, 84, 0.96)),
    linear-gradient(180deg, rgba(24, 45, 68, 0.88), rgba(8, 17, 28, 0.68));
  box-shadow:
    0 0 12px rgba(96, 145, 198, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.035),
    inset 0 -8px 18px rgba(0, 0, 0, 0.18);
}

.circle-card__back-core-ring {
  width: 56px;
  height: 56px;
  border: 1px solid rgba(183, 210, 238, 0.12);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.012);
}

.circle-card__back-logo {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 100%;
  height: auto;
  opacity: 0.96;
  filter: none;
}

.circle-card__info {
  width: 100%;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 0 18px;
}

.circle-card__content {
  position: relative;
  width: min(100%, 236px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 2px 0 2px;
}

.circle-card__content::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -6px;
  transform: translateX(-50%);
  width: 100%;
  height: 72px;
  border-radius: 999px;
  background: radial-gradient(
    ellipse at center,
    rgba(6, 10, 18, 0.82) 0%,
    rgba(6, 10, 18, 0.62) 52%,
    rgba(6, 10, 18, 0.16) 76%,
    rgba(6, 10, 18, 0) 100%
  );
  filter: blur(10px);
  opacity: 0;
  transition: opacity 240ms ease;
  pointer-events: none;
}

.circle-card__content--revealed::before {
  opacity: 1;
}

.circle-card-name-enter-active,
.circle-card-name-leave-active {
  transition:
    opacity 240ms ease,
    transform 240ms ease;
}

.circle-card-name-enter-from,
.circle-card-name-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

.circle-card__eyebrow {
  position: absolute;
  top: -114px;
  left: 50%;
  transform: translateX(-50%);
  width: max-content;
  font-size: 10px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(233, 241, 252, 0.6);
  white-space: nowrap;
  text-shadow:
    0 1px 8px rgba(3, 7, 14, 0.62),
    0 0 18px rgba(3, 7, 14, 0.28);
}

.circle-card__name {
  position: relative;
  z-index: 1;
  width: 100%;
  font-size: 17px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: -0.01em;
  line-height: 1.16;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.6);
  text-wrap: balance;
}

.circle-card__theme-pill {
  position: relative;
  z-index: 1;
  max-width: 100%;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.25;
  color: rgba(224, 234, 248, 0.72);
  text-wrap: balance;
}

.circle-card__cta {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  max-width: 100%;
  min-height: 34px;
  margin-top: 2px;
  padding: 4px 5px 4px 14px;
  border-radius: 999px;
  border: 1px solid rgba(184, 214, 244, 0.24);
  background:
    linear-gradient(180deg, rgba(22, 35, 54, 0.98), rgba(10, 18, 31, 0.98));
  box-shadow:
    0 8px 18px rgba(4, 10, 22, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  color: rgba(248, 251, 255, 0.98);
  letter-spacing: 0;
  text-transform: none;
  text-shadow: none;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease,
    background 180ms ease;
}

.circle-card__cta::before {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0));
  pointer-events: none;
}

.circle-card__cta-label,
.circle-card__cta-icon {
  position: relative;
  z-index: 1;
}

.circle-card__cta-label {
  white-space: nowrap;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}

.circle-card__cta-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(122, 181, 245, 0.94), rgba(68, 108, 182, 0.96));
  color: rgba(249, 251, 255, 0.98);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    0 3px 8px rgba(35, 67, 120, 0.22);
}

.circle-card__cta-icon svg {
  display: block;
}

.circle-card:focus-visible {
  outline: none;
}

.circle-card:focus-visible .circle-card__cta {
  border-color: rgba(206, 229, 252, 0.38);
  box-shadow:
    0 0 0 3px rgba(113, 168, 232, 0.14),
    0 10px 22px rgba(4, 10, 22, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
}

.circle-card:active .circle-card__cta {
  transform: translateY(1px) scale(0.992);
  box-shadow:
    0 6px 14px rgba(4, 10, 22, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* ─── Cycling phrase ───────────────────────────────────── */
.content-wrapper {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  opacity: 1;
  transition: opacity 420ms ease;
}

.content-wrapper--fade-out {
  opacity: 0;
}

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
.appear-content span {
  display: inline-block;
  transition: opacity 0.5s ease;
}
.char-hidden {
  opacity: 0;
}

/* ─── Decor ────────────────────────────────────────────── */
.decor-layer {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  overflow: hidden;
}
.shooting-star {
  position: absolute;
  top: -40px;
  right: -80px;
  width: 2px;
  height: 2px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow:
    0 0 6px rgba(255, 255, 255, 0.9),
    0 0 14px rgba(159, 216, 246, 0.8);
  opacity: 0;
  animation: shooting 5.5s ease-in-out 3s 1 forwards;
  will-change: transform, opacity;
}
@keyframes shooting {
  0% {
    opacity: 0;
    transform: translate3d(0, 0, 0);
  }
  10% {
    opacity: 1;
  }
  40% {
    opacity: 1;
    transform: translate3d(-60vw, 40vh, 0);
  }
  70%,
  100% {
    opacity: 0;
    transform: translate3d(-75vw, 55vh, 0);
  }
}

/* ─── Astro Cards ──────────────────────────────────────── */
.astro-cards {
  --cards-pad: 20px;
  position: absolute;
  top: calc(env(safe-area-inset-top, 0px) + 146px);
  left: 0;
  right: 0;
  z-index: 3;
  display: flex;
  gap: 7px;
  padding: 4px 0;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scroll-padding-left: var(--cards-pad);
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  opacity: 0;
  transform: translateY(12px);
  transition:
    opacity 1s ease 0.7s,
    transform 1s cubic-bezier(0.2, 0.8, 0.2, 1) 0.7s;
}
.astro-cards::-webkit-scrollbar {
  display: none;
}
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
  width: 112px;
  padding: 8px 10px 8px;
  border-radius: 18px;
  border: 1px solid var(--astro-card-border, rgba(255, 255, 255, 0.1));
  background:
    radial-gradient(
      circle at top right,
      var(--astro-card-glow, rgba(255, 255, 255, 0.12)),
      transparent 58%
    ),
    linear-gradient(180deg, var(--astro-card-base, rgba(30, 40, 62, 0.42)), rgba(17, 24, 38, 0.3));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.025),
    0 6px 16px rgba(2, 7, 15, 0.05);
  display: flex;
  flex-direction: column;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  outline: none;
  backdrop-filter: blur(12px);
}

.astro-card__label {
  font-size: 10px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  -webkit-font-smoothing: antialiased;
  line-height: 1;
  margin-bottom: 4px;
}
.astro-card__icon {
  font-size: 18px;
  line-height: 1;
  margin-bottom: 4px;
}
.astro-card__value {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: 0.01em;
  line-height: 1.2;
  -webkit-font-smoothing: antialiased;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.astro-card__sub {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.46);
  letter-spacing: 0.02em;
  line-height: 1.2;
  margin-top: 1px;
  -webkit-font-smoothing: antialiased;
}

.astro-sheet-dialog :deep(.q-dialog__inner--bottom) {
  z-index: 10020 !important;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
}

.astro-sheet-dialog :deep(.q-dialog__backdrop) {
  z-index: 10019 !important;
}

.astro-sheet {
  position: relative;
  overflow: hidden;
  /* Quasar's .q-dialog__inner is pointer-events:none and only re-enables it on
     its content card; this custom section must opt back in, otherwise every
     click falls through to the backdrop and dismisses the sheet (the close
     button never receives the tap). */
  pointer-events: auto;
  width: min(100vw - 20px, 440px);
  margin: 0 auto;
  padding: 12px 16px calc(16px + env(safe-area-inset-bottom, 0px));
  border-radius: 28px 28px 22px 22px;
  border: 1px solid var(--astro-sheet-border, rgba(255, 255, 255, 0.08));
  background:
    radial-gradient(circle at top right, var(--astro-sheet-accent), rgba(255, 255, 255, 0) 42%),
    radial-gradient(circle at 18% 0%, var(--astro-sheet-accent-soft), rgba(255, 255, 255, 0) 36%),
    linear-gradient(180deg, rgba(16, 22, 34, 0.98), rgba(7, 11, 18, 0.995));
  box-shadow:
    0 24px 60px rgba(1, 5, 10, 0.48),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.92);
}

.astro-sheet::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 50% -10%, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0) 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0) 26%);
}

.astro-sheet__grabber {
  position: relative;
  z-index: 1;
  width: 42px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  margin: 0 auto 10px;
}

/* Canonical sheet-close action (matches the Daily Card page close button). */
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
  box-shadow: none;
}

.oracle-actions__ok:active {
  transform: translateY(1px);
  border-color: rgba(156, 184, 235, 0.28);
  filter: saturate(0.92);
}

.astro-sheet__eyebrow {
  position: relative;
  z-index: 1;
  font-size: 10px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.38);
  margin-bottom: 8px;
}

.astro-sheet__header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.astro-sheet__icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background:
    radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.14), rgba(255, 255, 255, 0.02) 48%),
    linear-gradient(180deg, rgba(24, 32, 48, 0.92), rgba(10, 16, 28, 0.96));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.07);
  font-size: 28px;
  flex-shrink: 0;
}

.astro-sheet__title-wrap {
  min-width: 0;
  padding-top: 2px;
}

.astro-sheet__title {
  font-size: 20px;
  line-height: 1.16;
  font-weight: 650;
  color: rgba(255, 255, 255, 0.96);
  letter-spacing: -0.02em;
}

.astro-sheet__subtitle {
  margin-top: 4px;
  font-size: 13px;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.54);
}

.astro-sheet__section + .astro-sheet__section {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.astro-sheet__section-title {
  position: relative;
  z-index: 1;
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.42);
  margin-bottom: 8px;
}

.astro-sheet__facts {
  position: relative;
  z-index: 1;
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.astro-sheet__fact {
  position: relative;
  padding: 10px 12px 10px 28px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(180deg, rgba(22, 29, 43, 0.8), rgba(9, 14, 24, 0.88)),
    radial-gradient(circle at top right, var(--astro-sheet-accent-soft), rgba(255, 255, 255, 0) 48%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    0 8px 18px rgba(0, 0, 0, 0.14);
  font-size: 14px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.84);
}

.astro-sheet__fact::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 50%;
  width: 6px;
  height: 6px;
  border-radius: 999px;
  transform: translateY(-50%);
  background: rgba(177, 208, 240, 0.78);
  box-shadow: 0 0 12px rgba(177, 208, 240, 0.28);
}

.astro-sheet__summary-card {
  position: relative;
  z-index: 1;
  border-radius: 18px;
  padding: 12px 14px;
  border: 1px solid rgba(160, 187, 236, 0.14);
  background:
    linear-gradient(180deg, rgba(20, 27, 40, 0.78), rgba(8, 12, 20, 0.9)),
    radial-gradient(circle at top right, var(--astro-sheet-accent), rgba(255, 255, 255, 0) 62%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 10px 24px rgba(1, 5, 10, 0.14);
}

.astro-sheet__section-title--summary {
  margin-bottom: 6px;
  color: rgba(220, 231, 250, 0.58);
}

.astro-sheet__summary-lead {
  position: relative;
  z-index: 1;
  font-size: 15px;
  line-height: 1.5;
  font-weight: 600;
  color: rgba(247, 249, 254, 0.96);
}

.astro-sheet__summary-body {
  position: relative;
  z-index: 1;
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.58;
  color: rgba(232, 238, 247, 0.76);
}

.astro-sheet__cta {
  position: relative;
  z-index: 3;
  margin-top: 18px;
  width: 100%;
  border: 0;
  border-radius: 16px;
  padding: 13px 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0.07));
  color: rgba(255, 255, 255, 0.94);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.astro-sheet__cta--myday {
  background:
    radial-gradient(circle at top right, rgba(132, 194, 255, 0.26), rgba(132, 194, 255, 0) 54%),
    linear-gradient(180deg, rgba(58, 101, 176, 0.96), rgba(22, 48, 94, 0.98));
  color: rgba(247, 251, 255, 0.98);
  box-shadow:
    0 14px 28px rgba(7, 15, 32, 0.32),
    inset 0 1px 0 rgba(233, 243, 255, 0.18);
}

.no-pointer-events {
  pointer-events: none;
}

@media (max-width: 390px) {
  .circle-card {
    width: min(246px, calc(100vw - 36px));
  }
  .circle-card {
    min-height: 148px;
    padding-top: 92px;
  }
  .circle-card__img-wrap {
    width: 96px;
    height: 154px;
  }
  .circle-card__eyebrow {
    top: -98px;
  }
  .circle-card__name {
    font-size: 14px;
  }
  .circle-card__content {
    width: min(100%, 212px);
    gap: 5px;
    padding: 2px 0 2px;
  }
  .circle-card__theme-pill {
    font-size: 12px;
  }
  .circle-card__cta {
    gap: 7px;
    min-height: 32px;
    padding: 4px 4px 4px 12px;
    font-size: 12px;
  }
  .circle-card__cta-icon {
    width: 22px;
    height: 22px;
  }
  .logo-wrap {
    gap: 10px;
  }
  .myday-title {
    font-size: 20px;
  }
  .myday-kicker {
    font-size: 11px;
  }
  .focus-today {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 134px);
    width: min(336px, calc(100vw - 24px));
  }
  .focus-today--compact {
    width: min(332px, calc(100vw - 24px));
  }
  .focus-today__card {
    min-height: 98px;
    padding: 10px 12px 10px;
  }
  .focus-today__card--compact {
    min-height: 66px;
    padding: 9px 12px 9px;
  }
  .focus-today__body {
    font-size: 13px;
  }
  .focus-today__body--compact {
    font-size: 14px;
  }
  .focus-today__sign-chip {
    font-size: 11px;
  }
  .streak-badge {
    padding: 0 9px;
  }
}

@media (max-height: 700px) {
  .circle-card {
    top: 51.5%;
    min-height: 146px;
    padding-top: 88px;
  }
  .circle-card__img-wrap {
    width: 94px;
    height: 152px;
  }
  .circle-card__eyebrow {
    top: -94px;
  }
  .focus-today {
    bottom: calc(env(safe-area-inset-bottom, 0px) + 112px);
    width: min(332px, calc(100vw - 24px));
  }
  .focus-today--compact {
    width: min(324px, calc(100vw - 24px));
  }
  .focus-today__card {
    min-height: 76px;
    gap: 4px;
    padding: 8px 11px 9px;
  }
  .focus-today__card--compact {
    min-height: 58px;
    padding: 8px 11px;
  }
  .focus-today__body {
    -webkit-line-clamp: 1;
    font-size: 12px;
  }
  .focus-today__body--compact {
    -webkit-line-clamp: 2;
    font-size: 14px;
  }
  .focus-today__footer {
    padding-top: 4px;
    border-top: 0;
  }
  .focus-today__cta {
    font-size: 11px;
  }
  .astro-cards {
    top: calc(env(safe-area-inset-top, 0px) + 120px);
  }
  .logo-wrap {
    padding-top: max(44px, calc(env(safe-area-inset-top, 0px) + 10px));
  }
}

@media (max-width: 390px) and (max-height: 700px) {
  .astro-cards {
    --cards-pad: 16px;
    top: calc(env(safe-area-inset-top, 0px) + 104px);
    gap: 6px;
  }
  .astro-card {
    width: 104px;
    padding: 7px 9px 7px;
    border-radius: 16px;
  }
  .astro-card__label {
    font-size: 9px;
    margin-bottom: 3px;
  }
  .astro-card__icon {
    font-size: 17px;
    margin-bottom: 3px;
  }
  .astro-card__value {
    font-size: 11px;
  }
  .astro-card__sub {
    font-size: 10px;
  }
  .circle-card {
    top: 48.9%;
    width: min(206px, calc(100vw - 60px));
    min-height: 116px;
    padding-top: 52px;
  }
  .circle-card__img-wrap {
    width: 70px;
    height: 108px;
  }
  .circle-card__back-core {
    width: 64px;
    height: 64px;
  }
  .circle-card__back-core-ring {
    width: 46px;
    height: 46px;
  }
  .circle-card__eyebrow {
    display: none;
  }
  .circle-card__info {
    gap: 1px;
    padding: 0 12px;
  }
  .circle-card__content {
    width: min(100%, 180px);
    gap: 2px;
  }
  .circle-card__name {
    font-size: 12px;
    line-height: 1.12;
  }
  .circle-card__theme-pill {
    display: none;
  }
  .circle-card__cta {
    min-height: 27px;
    padding: 3px 4px 3px 10px;
    font-size: 10px;
  }
  .circle-card__cta-icon {
    width: 19px;
    height: 19px;
  }
}
</style>
