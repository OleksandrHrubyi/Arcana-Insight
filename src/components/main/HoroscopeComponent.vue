<template>
  <div ref="container" class="container" :class="{ dragging: isDragging }">
    <!-- DATE -->
    <div class="date-info">
      <div class="date-info-label date-top">{{ tt('dailyHoroscope') }}</div>
      <div class="date-info-label date-bottom">{{ monthDayLabel }}</div>
    </div>

    <!-- ✅ HERO DISC: 3D + авто обертання + круті частинки -->
    <div class="hero-disc" aria-hidden="true">
      <div class="hero-disc__tilt">
        <!-- крутиться повільно -->
        <div class="hero-disc__spin">
          <img
            class="hero-disc__img"
            src="/images/horoscope-disc.jpg"
            alt=""
            loading="eager"
            decoding="async"
            fetchpriority="high"
          />

          <!-- “зерно/зорі” всередині диска -->
          <div class="hero-disc__stars"></div>
          <div class="hero-disc__stars hero-disc__stars--2"></div>

          <!-- світлова хвиля -->
          <div class="hero-disc__sweep"></div>
        </div>

        <!-- ✅ реальні летючі частинки (не крутяться разом з фоном) -->
        <div class="hero-disc__particles" aria-hidden="true">
          <span v-for="p in particles" :key="p.id" class="particle" :style="p.style" />
        </div>
      </div>
    </div>

    <!-- ✅ ховаємо боки -->
    <div ref="sideCoverLeft" class="side-cover side-cover--left"></div>
    <div ref="sideCoverRight" class="side-cover side-cover--right"></div>

    <!-- ✅ перемальована дуга -->
    <div class="arc-overlay"></div>

    <!-- ЛІНІЇ -->
    <div ref="lineLeft" class="line"></div>
    <div ref="lineRight" class="line"></div>

    <div class="top-round"></div>
    <div ref="topBg" class="top-bg"></div>

    <!-- WHEEL -->
    <div ref="stage" class="wheel-stage">
      <div ref="wheel" class="wheel" :class="{ gpu: gpuOn }"></div>

      <div
        ref="dragLayer"
        class="drag-layer"
        :class="{ dragging: isDragging }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @lostpointercapture="onPointerUp"
      />
    </div>

    <!-- CENTER -->
    <div ref="centerRound" class="center-round">
      <div class="bottom-wrapper">
        <div class="q-px-sm q-pt-md horoscope-info">
          <div class="active-zodiac" aria-hidden="false">
            <div class="active-zodiac-name">{{ tt(`zodiac.${activeZodiac.key}`) }}</div>
            <div class="active-zodiac-dates">{{ activeZodiac.dates }}</div>
          </div>
          <q-tab-panels
            v-model="themeTab"
            animated
            transition-prev="theme-slide-right"
            transition-next="theme-slide-left"
            :transition-duration="220"
            v-touch-swipe:[themeSwipeSensitivity].horizontal="handleThemeSwipe"
            class="bg-transparent horoscope-panels"
          >
            <q-tab-panel name="energy" class="q-pa-none">
              <div class="panel-inner">
                <div class="horoscope-info-title">{{ tt('energy') }}</div>
                <div class="horoscope-divider"></div>

                <div
                  class="horoscope-info-style"
                  :class="{ 'horoscope-info-style--loading': !hasThemeText('energy') }"
                >
                  <template v-if="hasThemeText('energy')">
                    {{ getThemeText('energy') }}
                  </template>
                  <div v-else class="horoscope-text-skeleton" aria-hidden="true">
                    <span
                      v-for="index in 6"
                      :key="`energy-skeleton-${index}`"
                      class="horoscope-text-skeleton__line"
                    ></span>
                  </div>
                </div>
              </div>
            </q-tab-panel>

            <q-tab-panel name="love" class="q-pa-none">
              <div class="panel-inner">
                <div class="horoscope-info-title">{{ tt('love') }}</div>
                <div class="horoscope-divider"></div>

                <div class="horoscope-text-wrap">
                  <div
                    class="horoscope-info-style"
                    :class="{
                      'horoscope-info-style--blurred': isThemeLocked('love'),
                      'horoscope-info-style--loading': !hasThemeText('love'),
                    }"
                  >
                    <template v-if="hasThemeText('love')">
                      {{ getThemeText('love') }}
                    </template>
                    <div v-else class="horoscope-text-skeleton" aria-hidden="true">
                      <span
                        v-for="index in 6"
                        :key="`love-skeleton-${index}`"
                        class="horoscope-text-skeleton__line"
                      ></span>
                    </div>
                  </div>
                  <button
                    v-if="isThemeLocked('love')"
                    type="button"
                    class="horoscope-lock-overlay"
                    @click="openPremiumPaywall"
                  >
                    <span class="horoscope-lock-overlay__title">{{
                      getThemeLockTitle('love')
                    }}</span>
                    <span class="horoscope-lock-overlay__text">{{ getThemeLockText('love') }}</span>
                    <span class="horoscope-lock-overlay__cta">
                      <span>{{ tt('premiumAccess.cta') }}</span>
                    </span>
                  </button>
                </div>
              </div>
            </q-tab-panel>

            <q-tab-panel name="career" class="q-pa-none">
              <div class="panel-inner">
                <div class="horoscope-info-title">{{ tt('career') }}</div>
                <div class="horoscope-divider"></div>

                <div class="horoscope-text-wrap">
                  <div
                    class="horoscope-info-style"
                    :class="{
                      'horoscope-info-style--blurred': isThemeLocked('career'),
                      'horoscope-info-style--loading': !hasThemeText('career'),
                    }"
                  >
                    <template v-if="hasThemeText('career')">
                      {{ getThemeText('career') }}
                    </template>
                    <div v-else class="horoscope-text-skeleton" aria-hidden="true">
                      <span
                        v-for="index in 6"
                        :key="`career-skeleton-${index}`"
                        class="horoscope-text-skeleton__line"
                      ></span>
                    </div>
                  </div>
                  <button
                    v-if="isThemeLocked('career')"
                    type="button"
                    class="horoscope-lock-overlay"
                    @click="openPremiumPaywall"
                  >
                    <span class="horoscope-lock-overlay__title">{{
                      getThemeLockTitle('career')
                    }}</span>
                    <span class="horoscope-lock-overlay__text">{{
                      getThemeLockText('career')
                    }}</span>
                    <span class="horoscope-lock-overlay__cta">
                      <span>{{ tt('premiumAccess.cta') }}</span>
                    </span>
                  </button>
                </div>
              </div>
            </q-tab-panel>
          </q-tab-panels>

          <div class="horoscope-controls">
            <div class="dots">
              <button
                class="dot"
                :class="{ active: themeTab === 'energy', 'dot--locked': isThemeLocked('energy') }"
                @click="setTheme('energy')"
              ></button>
              <button
                class="dot"
                :class="{ active: themeTab === 'love', 'dot--locked': isThemeLocked('love') }"
                @click="setTheme('love')"
              ></button>
              <button
                class="dot"
                :class="{ active: themeTab === 'career', 'dot--locked': isThemeLocked('career') }"
                @click="setTheme('career')"
              ></button>
            </div>
          </div>

        </div>
      </div>
    </div>
    <div class="bottom-bg-wrap"></div>
  </div>
</template>

<script>
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Preferences } from '@capacitor/preferences'
import { localISODate } from 'src/helpers/date.js'
import {
  loadHoroscopeRegistry,
  normalizeHoroscopeThemeKey,
} from 'src/helpers/horoscopeContentCore.js'
import { saveLocal, loadLocal } from 'src/helpers/localStorageSaver.js'
import { t, currentLocale } from 'src/i18n'
import { Share } from '@capacitor/share'
import { selectAppUser, selectHoroscopes } from 'src/services/supabaseNative'
import { usePremiumAccess } from 'src/stores/premiumAccess'
import { useAuthStore } from 'stores/authStore.js'
import { DAILY_ACTIVITY_KEYS, markDailyActivity } from 'src/helpers/dailyRitual'
import { resolveUserSignSnapshot } from 'src/helpers/zodiacUserSignCore.js'
import * as Astronomy from 'astronomy-engine'
import {
  ensureRitualRewardInventory,
  trackRitualActivityWithGuestFallback,
} from 'src/helpers/ritualRewardsBackend.js'
import { isRitualRewardActive, RITUAL_REWARD_KEYS } from 'src/helpers/ritualRewardInventory'

const DESIGN_W = 440
const DESIGN_TOP_INSET = 30
const DESIGN_GAP = 136
const JOIN_OFFSET = 10
const ACTIVE_OFFSET = 0

const FLING_THRESHOLD_DEG_PER_SEC = 80
const INERTIA_FRICTION_PER_SEC = 15.2
const SNAP_STIFFNESS = 90
const SNAP_DAMPING = 18

const ZODIAC_EMOJI = {
  capricorn: '♑️',
  aquarius: '♒️',
  pisces: '♓️',
  aries: '♈️',
  taurus: '♉️',
  gemini: '♊️',
  cancer: '♋️',
  leo: '♌️',
  virgo: '♍️',
  libra: '♎️',
  scorpio: '♏️',
  sagittarius: '♐️',
}

const THEME_META = {
  love: { emoji: '💖', label: 'Кохання' },
  career: { emoji: '💼', label: 'Кар\u2019єра' },
  energy: { emoji: '⚡', label: 'Енергія' },
}
const FREE_HOROSCOPE_THEME = 'energy'
const THEME_TABS = ['energy', 'love', 'career']
const ZODIAC_SIGN_CACHE_KEY = 'horoscope_sign_key_v1'
const PROFILE_CACHE_KEY = 'profile_cache_v1'
const premiumAccessStore = usePremiumAccess()
const authStore = useAuthStore()

export default {
  name: 'HoroscopeComponent',

  data() {
    return {
      rotation: 0,
      desiredRotation: 0,
      omega: 0,

      mode: 'idle',
      snapTarget: 0,
      lastFrameTs: 0,

      isDragging: false,
      activePointerId: null,
      center: { x: 0, y: 0 },
      startAngle: 0,
      startRotation: 0,

      lastMoveTs: 0,
      lastMoveAngle: 0,

      dragGain: 1,
      velocityGain: 1,

      rafId: null,
      isAnimating: false,

      sectorCount: 12,
      currentSector: 0,
      lastSnapIndex: 0,

      hapticCooldownMs: 70,
      lastHapticTs: 0,
      lastHapticSnapIndex: null,

      gpuOn: false,

      // ✅ нове: частинки
      particles: [],

      zodiacMeta: [
        { key: 'capricorn', name: 'CAPRICORN', dates: '(22.12 – 19.01)' },
        { key: 'aquarius', name: 'AQUARIUS', dates: '(20.01 – 18.02)' },
        { key: 'pisces', name: 'PISCES', dates: '(19.02 – 20.03)' },
        { key: 'aries', name: 'ARIES', dates: '(21.03 – 19.04)' },
        { key: 'taurus', name: 'TAURUS', dates: '(20.04 – 20.05)' },
        { key: 'gemini', name: 'GEMINI', dates: '(21.05 – 20.06)' },
        { key: 'cancer', name: 'CANCER', dates: '(21.06 – 22.07)' },
        { key: 'leo', name: 'LEO', dates: '(23.07 – 22.08)' },
        { key: 'virgo', name: 'VIRGO', dates: '(23.08 – 22.09)' },
        { key: 'libra', name: 'LIBRA', dates: '(23.09 – 22.10)' },
        { key: 'scorpio', name: 'SCORPIO', dates: '(23.10 – 21.11)' },
        { key: 'sagittarius', name: 'SAGITTARIUS', dates: '(22.11 – 21.12)' },
      ],

      horoscope: {},
      authStore,
      userSignApplied: false,
      userDob: '',
      moonSign: '',

      midnightTimer: null,
      themeTab: FREE_HOROSCOPE_THEME,
      themeSwipeSensitivity: '0.03:1:30',
      rewardAccessTick: 0,
    }
  },

  computed: {
    hasPremiumAccess() {
      return premiumAccessStore.hasPremiumAccess.value
    },

    locale() {
      return currentLocale.value || 'en'
    },

    stepDeg() {
      return 360 / this.sectorCount
    },

    activeZodiac() {
      const idx = this.mod(this.currentSector + ACTIVE_OFFSET, 12)
      return this.zodiacMeta[idx]
    },

    monthDayLabel() {
      const now = new Date()
      const locale = this.locale === 'uk' ? 'uk-UA' : 'en-US'

      const label = new Intl.DateTimeFormat(locale, {
        day: 'numeric',
        month: 'long',
      }).format(now)

      return label.toLocaleUpperCase(locale)
    },

    isCurrentThemeLocked() {
      return this.isThemeLocked(this.themeTab)
    },

    tt() {
      return (key) => t(this.locale, key)
    },
  },

  mounted() {
    markDailyActivity(DAILY_ACTIVITY_KEYS.horoscope)
    void trackRitualActivityWithGuestFallback(DAILY_ACTIVITY_KEYS.horoscope, {
      source: 'horoscope_screen',
      userId: authStore.state.user?.id || '',
    })
    this.themeTab = FREE_HOROSCOPE_THEME
    this.applyThemeFromRoute(this.$route?.query?.theme)
    this.setVh()
    this.applyScale()
    void this.refreshHoroscopesForDay()

    // ✅ частинки
    this.buildParticles()
    this.hydrateZodiacFromCache()

    this.rotation = Math.round(this.rotation / this.stepDeg) * this.stepDeg
    this.desiredRotation = this.rotation
    this.lastSnapIndex = Math.floor(this.rotation / this.stepDeg + 0.5)
    this.currentSector = this.mod(this.lastSnapIndex, this.sectorCount)

    this.$nextTick(() => {
      this.recalcCenter()
      this.layoutAll()
      this.applyRotationToView(this.rotation, false)
      void this.applyUserZodiacPreference()

      window.addEventListener('resize', this.onResize, { passive: true })
      window.addEventListener('orientationchange', this.onResize, { passive: true })
    })

    this.scheduleMidnightRefresh()
    void this.refreshRitualRewardAccess()
  },

  beforeUnmount() {
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('orientationchange', this.onResize)
    this.stopLoop()
    clearTimeout(this.midnightTimer)

    const drag = this.$refs.dragLayer
    if (this.activePointerId != null && drag?.releasePointerCapture) {
      try {
        drag.releasePointerCapture(this.activePointerId)
      } catch (e) {
        console.error(e)
      }
    }
  },

  watch: {
    hasPremiumAccess(next) {
      if (!next && this.themeTab !== FREE_HOROSCOPE_THEME) {
        this.themeTab = FREE_HOROSCOPE_THEME
      }
    },
    '$route.query.theme': {
      immediate: true,
      handler(nextTheme) {
        this.applyThemeFromRoute(nextTheme)
      },
    },
    'authStore.state.user.id': {
      immediate: false,
      handler() {
        void this.refreshRitualRewardAccess(true)
      },
    },
  },

  methods: {
    rewardAccessUserId() {
      return String(this.authStore?.state?.user?.id || '').trim()
    },

    async refreshRitualRewardAccess(force = false) {
      const userId = this.rewardAccessUserId()
      await ensureRitualRewardInventory({
        userId,
        force,
      })
      this.rewardAccessTick = Date.now()
    },

    isThemeUnlockedByReward(tab) {
      const now = this.rewardAccessTick ? new Date() : new Date()
      const userId = this.rewardAccessUserId()
      if (tab === 'love') {
        return isRitualRewardActive({
          rewardKey: RITUAL_REWARD_KEYS.horoscopeLoveUnlock24h,
          userId,
          now,
        })
      }
      if (tab === 'career') {
        return isRitualRewardActive({
          rewardKey: RITUAL_REWARD_KEYS.horoscopeCareerUnlock24h,
          userId,
          now,
        })
      }
      return false
    },

    normalizeRouteTheme(value) {
      return normalizeHoroscopeThemeKey(value)
    },

    applyThemeFromRoute(value) {
      const nextTheme = this.normalizeRouteTheme(value)
      if (!nextTheme) return
      this.themeTab = nextTheme
    },

    isThemeLocked(tab) {
      if (this.hasPremiumAccess) return false
      if (tab === FREE_HOROSCOPE_THEME) return false
      return !this.isThemeUnlockedByReward(tab)
    },

    getThemeLockTitle(tab) {
      const themeKey = tab === 'career' ? 'career' : 'love'
      return this.tt(`premiumAccess.horoscope.${themeKey}.title`)
    },

    getThemeLockText(tab) {
      const themeKey = tab === 'career' ? 'career' : 'love'
      return this.tt(`premiumAccess.horoscope.${themeKey}.text`)
    },

    async openPremiumPaywall() {
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.error(e)
      }
      this.$router
        .push({ name: 'premium', query: { source: 'horoscope_lock', entry: 'secondary' } })
        .catch(() => {})
    },

    normalizeZodiacKey(value) {
      const normalized = String(value || '')
        .trim()
        .toLowerCase()
      if (!normalized) return ''
      return this.zodiacMeta.some((item) => item.key === normalized) ? normalized : ''
    },

    readCachedZodiacKey() {
      if (typeof window === 'undefined') return ''
      try {
        const raw = localStorage.getItem(ZODIAC_SIGN_CACHE_KEY) || ''
        return this.normalizeZodiacKey(raw)
      } catch {
        return ''
      }
    },

    writeCachedZodiacKey(zodiacKey) {
      if (typeof window === 'undefined') return
      const normalized = this.normalizeZodiacKey(zodiacKey)
      if (!normalized) return
      try {
        localStorage.setItem(ZODIAC_SIGN_CACHE_KEY, normalized)
      } catch {
        // ignore cache write errors
      }
    },

    hydrateZodiacFromCache() {
      const cachedKey = this.readCachedZodiacKey()
      if (!cachedKey) return
      this.focusZodiacByKey(cachedKey)
    },

    // ✅ генерація “реальних” летючих частинок
    buildParticles() {
      const count = 36 // 20–40
      const colors = ['rgba(255,255,255,0.95)', 'rgba(159,216,246,0.85)', 'rgba(255,220,180,0.70)']

      const out = []
      for (let i = 0; i < count; i++) {
        const x = Math.random() * 100
        const y = Math.random() * 100

        const s = 1.2 + Math.random() * 2.8 // size px
        const blur = Math.random() * 1.2 // blur px
        const dur = 7 + Math.random() * 14 // seconds
        const delay = -Math.random() * dur // negative start
        const dx = -22 + Math.random() * 44 // drift X px
        const dy = -(90 + Math.random() * 150) // drift up px
        const o = 0.25 + Math.random() * 0.7 // opacity
        const c = colors[Math.floor(Math.random() * colors.length)]

        out.push({
          id: i,
          style: {
            '--x': `${x.toFixed(2)}`,
            '--y': `${y.toFixed(2)}`,
            '--s': `${s.toFixed(2)}`,
            '--blur': `${blur.toFixed(2)}`,
            '--dur': `${dur.toFixed(2)}`,
            '--delay': `${delay.toFixed(2)}`,
            '--dx': `${dx.toFixed(2)}`,
            '--dy': `${dy.toFixed(2)}`,
            '--o': `${o.toFixed(2)}`,
            '--c': c,
          },
        })
      }

      this.particles = out
    },

    async refreshHoroscopesForDay(options = {}) {
      try {
        await this.loadHoroscopesForDay(options)
      } catch (e) {
        console.warn('[Horoscope] loadHoroscopesForDay failed', e)
      }
    },

    parseBirthDate(value) {
      const raw = String(value || '').trim()
      if (!raw) return { day: null, month: null }

      if (raw.includes('.')) {
        const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(raw)
        if (!match) return { day: null, month: null }
        return {
          day: Number.parseInt(match[1], 10),
          month: Number.parseInt(match[2], 10),
        }
      }

      if (raw.includes('-')) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
        if (!match) return { day: null, month: null }
        return {
          day: Number.parseInt(match[3], 10),
          month: Number.parseInt(match[2], 10),
        }
      }

      return { day: null, month: null }
    },

    birthDateToISO(raw) {
      const s = String(raw || '').trim()
      if (!s) return ''
      // DD.MM.YYYY → YYYY-MM-DD
      const dotMatch = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s)
      if (dotMatch) return `${dotMatch[3]}-${dotMatch[2]}-${dotMatch[1]}`
      // YYYY-MM-DD — вже ISO
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
      return ''
    },

    moonSignFromBirthDate(raw) {
      try {
        const iso = this.birthDateToISO(raw)
        if (!iso) return ''
        const date = new Date(iso + 'T12:00:00Z')
        const time = Astronomy.MakeTime(date)
        const vec = Astronomy.GeoVector(Astronomy.Body.Moon, time, false)
        const ecl = Astronomy.Ecliptic(vec)
        const lon = ((ecl.elon % 360) + 360) % 360
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
        return signs[Math.floor(lon / 30) % 12] || ''
      } catch {
        return ''
      }
    },

    zodiacKeyFromBirthDate(value) {
      const { day, month } = this.parseBirthDate(value)
      if (!day || !month) return ''

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

    focusZodiacByKey(zodiacKey, { animate = false } = {}) {
      const idx = this.zodiacMeta.findIndex((item) => item.key === zodiacKey)
      if (idx < 0) return false

      const targetRotation = this.wrapRotation(-idx * this.stepDeg)
      if (animate && this.$refs.wheel) {
        const atTarget = Math.abs(this.deltaAngle(targetRotation, this.rotation)) < 0.08
        if (atTarget) {
          this.rotation = targetRotation
          this.desiredRotation = targetRotation
          this.omega = 0
          this.snapTarget = targetRotation
          this.lastSnapIndex = idx
          this.currentSector = this.mod(idx, this.sectorCount)
          this.applyRotationToView(this.rotation, false)
          return true
        }

        this.omega = 0
        this.snapTarget = targetRotation
        this.startLoop('snap')
        return true
      }

      this.rotation = targetRotation
      this.desiredRotation = targetRotation
      this.omega = 0
      this.snapTarget = targetRotation
      this.lastSnapIndex = idx
      this.currentSector = this.mod(idx, this.sectorCount)
      this.applyRotationToView(this.rotation, false)
      return true
    },

    async applyUserZodiacPreference() {
      if (this.userSignApplied) return

      try {
        await this.authStore.syncSession({ refresh: false })

        const snapshot = await resolveUserSignSnapshot({
          readProfileCacheValue: async () => {
            const { value } = await Preferences.get({ key: PROFILE_CACHE_KEY })
            return value || ''
          },
          getCurrentUserId: () => this.authStore.state.user?.id || '',
          fetchUserDateOfBirthById: async (userId) => {
            const { data, error } = await selectAppUser(userId, 6000, 'date_of_birth')
            if (error) throw error
            return data?.date_of_birth || ''
          },
          zodiacFromRawDate: (rawDate) => this.zodiacKeyFromBirthDate(rawDate),
        })

        if (snapshot.errors.length) {
          console.warn('[Horoscope] applyUserZodiacPreference degraded:', snapshot.errors.join(','))
        }

        if (snapshot.dob) {
          this.userDob = snapshot.dob
          const ms = this.moonSignFromBirthDate(snapshot.dob)
          this.moonSign = ms
        }

        const zodiacKey = this.normalizeZodiacKey(snapshot.signKey)
        if (!zodiacKey) {
          this.userSignApplied = true
          return
        }

        if (this.focusZodiacByKey(zodiacKey, { animate: true })) {
          this.writeCachedZodiacKey(zodiacKey)
        }
        this.userSignApplied = true
      } catch (e) {
        console.warn('[Horoscope] applyUserZodiacPreference failed', e)
      }
    },

    async loadHoroscopesForDay({ forceNetwork = false } = {}) {
      const locale = this.locale
      const today = localISODate()
      const { registry } = await loadHoroscopeRegistry({
        locale,
        today,
        forceNetwork,
        loadLocal,
        saveLocal,
        selectHoroscopes,
      })
      this.horoscope = registry
    },

    scheduleMidnightRefresh() {
      const now = new Date()
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      const ms = nextMidnight - now + 200

      this.midnightTimer = setTimeout(async () => {
        await this.refreshHoroscopesForDay({ forceNetwork: true })
        this.scheduleMidnightRefresh()
      }, ms)
    },

    setVh() {
      const vh = window.innerHeight * 0.01
      const el = this.$refs.container
      if (el) el.style.setProperty('--vh', `${vh}px`)
    },

    onResize() {
      this.setVh()
      this.applyScale()
      this.$nextTick(() => {
        this.recalcCenter()
        this.layoutAll()
        this.applyRotationToView(this.rotation, false)
      })
    },

    applyScale() {
      const el = this.$refs.container
      if (!el) return
      const W = el.getBoundingClientRect().width
      el.style.setProperty('--s', W / DESIGN_W)
    },

    setLine(el, x1, y1, x2, y2) {
      const dx = x2 - x1
      const dy = y2 - y1
      const len = Math.hypot(dx, dy)
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI

      el.style.left = `${x1}px`
      el.style.top = `${y1}px`
      el.style.width = `${len}px`
      el.style.transform = `rotate(${ang}deg)`
    },

    layoutAll() {
      this.layoutLines()
    },

    layoutLines() {
      const container = this.$refs.container
      const leftEl = this.$refs.lineLeft
      const rightEl = this.$refs.lineRight
      const centerRound = this.$refs.centerRound
      const sideCoverLeft = this.$refs.sideCoverLeft
      const sideCoverRight = this.$refs.sideCoverRight

      if (!container || !leftEl || !rightEl || !centerRound) return

      const rect = container.getBoundingClientRect()
      const W = rect.width
      const s = W / DESIGN_W

      const cx = W / 2
      const halfGap = (DESIGN_GAP / 2) * s
      const inset = DESIGN_TOP_INSET * s

      const c = centerRound.getBoundingClientRect()
      const yJoin = c.top - rect.top + JOIN_OFFSET * s

      container.style.setProperty('--yJoin', `${yJoin}px`)
      container.style.setProperty('--halfGap', `${halfGap}px`)
      container.style.setProperty('--inset', `${inset}px`)

      const leftTop = { x: inset, y: 0 }
      const rightTop = { x: W - inset, y: 0 }
      const leftBottom = { x: cx - halfGap, y: yJoin }
      const rightBottom = { x: cx + halfGap, y: yJoin }

      this.setLine(leftEl, leftTop.x, leftTop.y, leftBottom.x, leftBottom.y)
      this.setLine(rightEl, rightTop.x, rightTop.y, rightBottom.x, rightBottom.y)

      if (sideCoverLeft) {
        sideCoverLeft.style.clipPath =
          'polygon(0 0, calc(var(--inset) + var(--coverBleed)) 0, calc(50% - var(--halfGap)) var(--yJoin), 0 calc(var(--yJoin) + var(--coverSlope)))'
      }
      if (sideCoverRight) {
        sideCoverRight.style.clipPath =
          'polygon(calc(100% - (var(--inset) + var(--coverBleed))) 0, 100% 0, 100% calc(var(--yJoin) + var(--coverSlope)), calc(50% + var(--halfGap)) var(--yJoin))'
      }
    },

    mod(n, m) {
      return ((n % m) + m) % m
    },

    deltaAngle(a, b) {
      let d = a - b
      while (d > 180) d -= 360
      while (d < -180) d += 360
      return d
    },

    wrapRotation(rot) {
      rot = ((rot % 360) + 360) % 360
      if (rot >= 180) rot -= 360
      return rot
    },

    getSnapTarget(rotation, omegaDegPerSec) {
      const step = this.stepDeg
      const idx = rotation / step

      const fling = Math.abs(omegaDegPerSec) > FLING_THRESHOLD_DEG_PER_SEC
      let targetIdx

      if (fling) targetIdx = omegaDegPerSec > 0 ? Math.ceil(idx) : Math.floor(idx)
      else targetIdx = Math.round(idx)

      return targetIdx * step
    },

    applyRotationToView(rot, withHaptic) {
      const wheel = this.$refs.wheel
      if (wheel) wheel.style.transform = `translate3d(-50%, -50%, 0) rotate(${rot}deg)`
      this.updateSnapState(withHaptic)
    },

    async playHapticForIndex(snapIndex) {
      if (this.lastHapticSnapIndex === snapIndex) return
      const now = performance.now()
      if (now - this.lastHapticTs < this.hapticCooldownMs) return

      this.lastHapticTs = now
      this.lastHapticSnapIndex = snapIndex

      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.error(e)
      }
    },

    updateSnapState(withHaptic = false) {
      const step = this.stepDeg
      const snapIndex = Math.floor(-this.rotation / step + 0.5)

      if (snapIndex !== this.lastSnapIndex) {
        this.lastSnapIndex = snapIndex
        this.currentSector = this.mod(snapIndex, this.sectorCount)
        if (withHaptic) this.playHapticForIndex(snapIndex)
      }
    },

    recalcCenter() {
      const wheel = this.$refs.wheel
      if (!wheel) return
      const rect = wheel.getBoundingClientRect()
      this.center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    },

    getPointerAngle(event) {
      const e = event.touches ? event.touches[0] : event
      const x = e.clientX - this.center.x
      const y = e.clientY - this.center.y
      return (Math.atan2(y, x) * 180) / Math.PI
    },

    startLoop(mode) {
      if (this.isAnimating) {
        this.mode = mode
        return
      }
      this.mode = mode
      this.isAnimating = true
      this.gpuOn = true
      this.lastFrameTs = performance.now()
      this.rafId = requestAnimationFrame(this.tick)
    },

    stopLoop() {
      if (this.rafId != null) cancelAnimationFrame(this.rafId)
      this.rafId = null
      this.isAnimating = false
      this.mode = 'idle'
      window.setTimeout(() => {
        this.gpuOn = false
      }, 220)
    },

    tick(now) {
      const dtMsRaw = now - this.lastFrameTs
      this.lastFrameTs = now

      const dtMs = Math.min(32, Math.max(1, dtMsRaw))
      const dt = dtMs / 1000

      if (this.mode === 'drag') {
        this.rotation = this.desiredRotation
        this.rotation = this.wrapRotation(this.rotation)
        this.applyRotationToView(this.rotation, true)
        this.rafId = requestAnimationFrame(this.tick)
        return
      }

      if (this.mode === 'inertia') {
        this.rotation += this.omega * dt
        this.omega *= Math.exp(-INERTIA_FRICTION_PER_SEC * dt)
        this.rotation = this.wrapRotation(this.rotation)
        this.applyRotationToView(this.rotation, false)

        if (Math.abs(this.omega) < 8) {
          this.snapTarget = this.getSnapTarget(this.rotation, this.omega)
          this.mode = 'snap'
        }

        this.rafId = requestAnimationFrame(this.tick)
        return
      }

      if (this.mode === 'snap') {
        const diff = this.snapTarget - this.rotation
        const accel = diff * SNAP_STIFFNESS - this.omega * SNAP_DAMPING
        this.omega += accel * dt
        this.rotation += this.omega * dt

        this.rotation = this.wrapRotation(this.rotation)
        this.applyRotationToView(this.rotation, true)

        if (Math.abs(diff) < 0.08 && Math.abs(this.omega) < 6) {
          this.rotation = this.snapTarget
          this.rotation = this.wrapRotation(this.rotation)
          this.applyRotationToView(this.rotation, true)
          this.stopLoop()
          return
        }

        this.rafId = requestAnimationFrame(this.tick)
        return
      }

      this.stopLoop()
    },

    onPointerDown(event) {
      const drag = this.$refs.dragLayer
      if (!drag || this.isDragging) return

      this.stopLoop()
      this.recalcCenter()

      this.isDragging = true
      this.activePointerId = event.pointerId ?? null

      this.startAngle = this.getPointerAngle(event)
      this.startRotation = this.rotation

      this.desiredRotation = this.rotation
      this.omega = 0

      this.lastMoveTs = performance.now()
      this.lastMoveAngle = this.startAngle

      if (this.activePointerId != null && drag.setPointerCapture) {
        try {
          drag.setPointerCapture(this.activePointerId)
        } catch (e) {
          console.error(e)
        }
      }

      this.startLoop('drag')
    },

    onPointerMove(event) {
      if (!this.isDragging) return
      if (
        this.activePointerId != null &&
        event.pointerId != null &&
        event.pointerId !== this.activePointerId
      )
        return

      const now = performance.now()
      const angle = this.getPointerAngle(event)

      const d = this.deltaAngle(angle, this.startAngle)
      this.desiredRotation = this.startRotation + d * this.dragGain

      const dtMs = Math.max(1, now - this.lastMoveTs)
      const da = this.deltaAngle(angle, this.lastMoveAngle)

      const instantOmega = (da / dtMs) * 1000 * this.dragGain * this.velocityGain
      this.omega = this.omega * 0.82 + instantOmega * 0.18

      this.lastMoveTs = now
      this.lastMoveAngle = angle
    },

    onPointerUp(event) {
      if (!this.isDragging) return
      if (
        this.activePointerId != null &&
        event?.pointerId != null &&
        event.pointerId !== this.activePointerId
      )
        return

      this.isDragging = false

      const drag = this.$refs.dragLayer
      if (this.activePointerId != null && drag?.releasePointerCapture) {
        try {
          drag.releasePointerCapture(this.activePointerId)
        } catch (e) {
          console.error(e)
        }
      }
      this.activePointerId = null

      if (Math.abs(this.omega) < 30) {
        this.snapTarget = this.getSnapTarget(this.rotation, 0)
        this.mode = 'snap'
        return
      }

      this.mode = 'inertia'
    },

    getThemeText(tab) {
      const themeKey = normalizeHoroscopeThemeKey(tab)
      if (!themeKey) return ''
      return this.horoscope?.[this.activeZodiac.key]?.[themeKey]?.detailed || ''
    },

    hasThemeText(tab) {
      return this.getThemeText(tab).trim().length > 0
    },

    normalizeText(s = '') {
      return String(s)
        .replace(/\r/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
    },

    buildShareTextCard({
      title,
      date,
      zodiacEmoji,
      zodiacName,
      datesRange,
      themeEmoji,
      themeLabel,
      text,
    }) {
      const clean = this.normalizeText(text)
      return [
        `✨ ${title}`,
        `🗓️ ${date}`,
        `${zodiacEmoji} ${zodiacName} ${datesRange}`.trim(),
        `${themeEmoji} ${this.tt('theme')}: ${themeLabel}`,
        '━━━━━━━━━━━━',
        clean,
        '',
        `💛 ${this.tt('shareSubInfo')}`,
      ].join('\n')
    },

    async handleShare() {
      const rawText = this.horoscope?.[this.activeZodiac.key]?.[this.themeTab]?.detailed || ''
      if (!rawText) {
        this.$q.notify({ type: 'negative', message: this.tt('errors.noShareText') })
        return
      }

      const title = this.tt('dailyHoroscope')
      const date = this.monthDayLabel

      const zodiacKey = this.activeZodiac.key
      const zodiacName = this.tt(`zodiac.${zodiacKey}`)
      const zodiacEmoji = ZODIAC_EMOJI[zodiacKey] || '✨'
      const datesRange = this.activeZodiac?.dates || ''

      const themeMeta = THEME_META[this.themeTab] || { emoji: '✨', label: this.themeTab }
      const themeLabel = this.tt(this.themeTab)
      const themeEmoji = themeMeta.emoji

      const payload = {
        title,
        date,
        zodiacEmoji,
        zodiacName,
        datesRange,
        themeEmoji,
        themeLabel,
        text: rawText,
      }

      requestAnimationFrame(() => {
        document.activeElement?.blur?.()
      })

      try {
        await Share.share({ text: this.buildShareTextCard(payload) })
      } catch (e) {
        console.warn('Share cancelled/failed', e)
      }
    },

    async setTheme(tab) {
      if (!tab || this.themeTab === tab) return
      this.themeTab = tab
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.error(e)
      }
    },

    shiftThemeBy(offset) {
      const currentIdx = THEME_TABS.indexOf(this.themeTab)
      if (currentIdx === -1) return

      const nextIdx = currentIdx + offset
      if (nextIdx < 0 || nextIdx >= THEME_TABS.length) return

      void this.setTheme(THEME_TABS[nextIdx])
    },

    handleThemeSwipe(details) {
      if (details?.direction === 'left') {
        this.shiftThemeBy(1)
      } else if (details?.direction === 'right') {
        this.shiftThemeBy(-1)
      }
    },
  },
}
</script>

<style scoped lang="scss">
/*noinspection CssInvalidPropertyValue*/
.container {
  --s: 1;
  --vh: 1vh;

  --inset: 30px;
  --halfGap: 98px;
  --yJoin: 380px;

  --arcBand: 18px;
  --arcStroke: 1.2px;
  --coverSlope: 42px;
  --coverBleed: 3px;

  background: #031018;
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  height: calc(var(--vh) * 100);

  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  position: relative;
  flex-direction: column;

  isolation: isolate;
  contain: layout paint;
}

.hero-disc {
  position: absolute;
  left: 50%;
  top: calc(160px * var(--s));
  transform: translate(-50%, -50%);
  width: calc(870px * var(--s));
  height: calc(870px * var(--s));
  border-radius: 50%;
  overflow: hidden;
  z-index: 145;
  pointer-events: none;

  box-shadow:
    0 26px 44px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(159, 216, 246, 0.1);

  -webkit-mask-image: radial-gradient(circle, #fff 72%, transparent 100%);
  mask-image: radial-gradient(circle, #fff 72%, transparent 100%);
}

.hero-disc__tilt {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  will-change: transform;
}

@media (prefers-reduced-motion: no-preference) {
  .hero-disc__tilt {
    animation: discTilt 10.5s ease-in-out infinite;
  }
  @keyframes discTilt {
    0% {
      transform: perspective(900px) rotateX(10deg) rotateY(-9deg) scale(1);
    }
    50% {
      transform: perspective(900px) rotateX(6deg) rotateY(10deg) scale(1.01);
    }
    100% {
      transform: perspective(900px) rotateX(10deg) rotateY(-9deg) scale(1);
    }
  }
}

.hero-disc__spin {
  position: absolute;
  inset: 0;
  transform-origin: 50% 50%;
  will-change: transform;
}

@media (prefers-reduced-motion: no-preference) {
  .hero-disc__spin {
    animation: discSpin 320s linear infinite;
  }
  @keyframes discSpin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
}

.hero-disc__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.08);
  backface-visibility: hidden;
}

.hero-disc__stars {
  position: absolute;
  inset: -10%;
  opacity: 0.22;
  mix-blend-mode: screen;
  filter: blur(0.2px);

  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.85) 0 1px, transparent 1.8px),
    radial-gradient(circle, rgba(159, 216, 246, 0.55) 0 1px, transparent 2.2px),
    radial-gradient(circle, rgba(255, 220, 180, 0.35) 0 1.1px, transparent 2.6px);

  background-size:
    90px 90px,
    150px 150px,
    240px 240px;
  background-position:
    10px 20px,
    60px 90px,
    140px 40px;
}

.hero-disc__stars--2 {
  opacity: 0.14;
  filter: blur(0.7px);

  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.6) 0 1px, transparent 2.2px),
    radial-gradient(circle, rgba(255, 255, 255, 0.35) 0 1px, transparent 2.8px);

  background-size:
    120px 120px,
    260px 260px;
  background-position:
    30px 70px,
    180px 20px;
}

@media (prefers-reduced-motion: no-preference) {
  .hero-disc__stars {
    animation: starsTwinkle 4.8s ease-in-out infinite;
  }
  .hero-disc__stars--2 {
    animation: starsTwinkle2 6.2s ease-in-out infinite;
  }

  @keyframes starsTwinkle {
    0%,
    100% {
      opacity: 0.2;
      transform: scale(1);
    }
    50% {
      opacity: 0.32;
      transform: scale(1.012);
    }
  }
  @keyframes starsTwinkle2 {
    0%,
    100% {
      opacity: 0.12;
      transform: scale(1);
    }
    50% {
      opacity: 0.2;
      transform: scale(1.016);
    }
  }
}

.hero-disc__sweep {
  position: absolute;
  inset: -35%;
  opacity: 0;
  mix-blend-mode: screen;
  filter: blur(7px);

  background: linear-gradient(
    115deg,
    transparent 0%,
    transparent 40%,
    rgba(255, 255, 255, 0.06) 47%,
    rgba(159, 216, 246, 0.2) 50%,
    rgba(255, 220, 180, 0.08) 53%,
    transparent 60%,
    transparent 100%
  );

  transform: translateX(-60%) rotate(18deg);
}

@media (prefers-reduced-motion: no-preference) {
  .hero-disc__sweep {
    animation: sweepPass 12s ease-in-out infinite;
  }
  @keyframes sweepPass {
    0% {
      opacity: 0;
      transform: translateX(-70%) rotate(18deg);
    }
    18% {
      opacity: 0;
    }
    30% {
      opacity: 0.45;
    }
    48% {
      opacity: 0.16;
      transform: translateX(62%) rotate(18deg);
    }
    58% {
      opacity: 0;
    }
    100% {
      opacity: 0;
      transform: translateX(62%) rotate(18deg);
    }
  }
}

.hero-disc__particles {
  position: absolute;
  inset: -8%;
  z-index: 4;
  pointer-events: none;
  transform: translateZ(60px);
  contain: paint;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.25));
}

.hero-disc__particles::before {
  content: '';
  position: absolute;
  left: -35%;
  top: 20%;
  width: 220px;
  height: 2px;
  opacity: 0;
  transform: rotate(22deg);
  filter: blur(0.4px);
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.7) 45%,
    rgba(159, 216, 246, 0.5) 55%,
    transparent 100%
  );
}

@media (prefers-reduced-motion: no-preference) {
  .hero-disc__particles::before {
    animation: shoot 11s linear infinite;
  }
  @keyframes shoot {
    0% {
      opacity: 0;
      transform: translate(-80%, -80%) rotate(22deg);
    }
    6% {
      opacity: 0.9;
    }
    10% {
      opacity: 0;
      transform: translate(200%, 200%) rotate(22deg);
    }
    100% {
      opacity: 0;
      transform: translate(200%, 200%) rotate(22deg);
    }
  }
}

.particle {
  position: absolute;
  left: calc(var(--x) * 1%);
  top: calc(var(--y) * 1%);
  width: calc(var(--s) * 1px);
  height: calc(var(--s) * 1px);
  border-radius: 999px;

  background: radial-gradient(circle, var(--c) 0%, rgba(255, 255, 255, 0) 72%);
  mix-blend-mode: screen;

  filter: blur(calc(var(--blur) * 1px));
  will-change: transform, opacity;
  transform: translate3d(0, 0, 0);
  opacity: 0;
}

@media (prefers-reduced-motion: no-preference) {
  .particle {
    animation:
      particleMove calc(var(--dur) * 1s) linear infinite,
      particleFade calc(var(--dur) * 1s) ease-in-out infinite;
    animation-delay: calc(var(--delay) * 1s), calc(var(--delay) * 1s);
  }

  @keyframes particleMove {
    from {
      transform: translate3d(0, 0, 0);
    }
    to {
      transform: translate3d(calc(var(--dx) * 1px), calc(var(--dy) * 1px), 0);
    }
  }

  @keyframes particleFade {
    0% {
      opacity: 0;
    }
    15% {
      opacity: var(--o);
    }
    85% {
      opacity: var(--o);
    }
    100% {
      opacity: 0;
    }
  }
}

.hero-disc::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 10;
  pointer-events: none;
  background: radial-gradient(
    circle at 50% 45%,
    rgba(0, 0, 0, 0) 0%,
    rgba(0, 0, 0, 0.12) 62%,
    rgba(0, 0, 0, 0.5) 100%
  );
}

.hero-disc::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 11;
  pointer-events: none;
  border-radius: 50%;
  border: 1px solid rgba(159, 216, 246, 0.1);
  box-shadow: 0 0 22px rgba(159, 216, 246, 0.07);
}

.side-cover {
  position: absolute;
  top: 0;
  left: calc(-1 * var(--coverBleed));
  width: calc(100% + (2 * var(--coverBleed)));
  height: calc(var(--yJoin) + var(--coverSlope));
  background: #031018;
  z-index: 140;
  pointer-events: none;
}

.side-cover--left {
}

.side-cover--right {
}

.arc-overlay {
  position: absolute;
  inset: 0;
  z-index: 150;
  pointer-events: none;
  /*noinspection CssInvalidPropertyValue*/
  clip-path: inset(
    calc(var(--yJoin) - var(--arcBand)) 0 calc(100% - (var(--yJoin) + var(--arcBand))) 0
  );
}

.arc-overlay::before,
.arc-overlay::after {
  content: '';
  position: absolute;
  left: 50%;
  top: calc(740px * var(--s));
  width: calc(1800px * var(--s));
  height: calc(1800px * var(--s));
  transform: translate(-50%, -50%);
  border-radius: 50%;
  border: var(--arcStroke) solid rgba(159, 216, 246, 0.85);
  box-sizing: border-box;
}

.arc-overlay::after {
  border-color: rgba(159, 216, 246, 0.35);
  transform: translate(-50%, -50%) scale(1.006);
}

.line {
  position: absolute;
  height: 1px;
  background: #9fd8f6;
  transform-origin: 0 0;
  z-index: 160;
  pointer-events: none;
  opacity: 0.7;
}

.wheel-stage {
  position: relative;
  width: 100%;
  height: calc(var(--vh) * 100);
  overflow: hidden;
  z-index: 150;
}

.wheel {
  position: absolute;
  left: 50%;
  top: calc(740px * var(--s));
  width: calc(1800px * var(--s));
  height: calc(1800px * var(--s));
  border-radius: 50%;
  background: url('/images/horoscope-disc-symbol.svg') center/contain no-repeat;
  transform-origin: 50% 50%;
  z-index: 80;
  transform: translate3d(-50%, -50%, 0) rotate(0deg);

  @media screen and (max-height: 670px) {
    top: calc(640px * var(--s));
  }
}

.wheel.gpu {
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.drag-layer {
  position: absolute;
  inset: 0;
  user-select: none;
  z-index: 200;
  touch-action: none;
}

.top-bg {
  background-image: url('/images/horoscope-top-gradient.png');
  background-size: contain;
  background-repeat: no-repeat;
  position: absolute;
  top: calc(-10px * var(--s));
  left: 0;
  right: 0;
  height: calc(143px * var(--s));
  z-index: 90;
}

.top-round {
  width: calc(1378px * var(--s));
  height: calc(1378px * var(--s));
  position: absolute;
  top: calc(54px * var(--s));
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  border: 1px solid rgba(159, 216, 246, 0.25);
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.5;
}

.center-round {
  width: calc(530px * var(--s));
  height: calc(530px * var(--s));
  border-radius: 50%;
  border: 1px solid rgba(159, 216, 246, 0.25);
  position: absolute;
  top: calc(480px * var(--s));
  z-index: 250;
  overflow: hidden;
  padding: calc(4px * var(--s));
  display: flex;
  justify-content: center;
  align-items: center;

  @media screen and (max-height: 670px) {
    top: calc(380px * var(--s));
  }
}

.bottom-wrapper {
  width: 100%;
  height: 100%;
  border: 1px solid rgba(159, 216, 246, 0.25);
  border-radius: 50%;
  position: relative;
  display: flex;
  justify-content: center;
  padding-bottom: calc(18px + env(safe-area-inset-bottom));
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  box-shadow:
    inset 0 0 0 1px rgba(159, 216, 246, 0.1),
    inset 0 30px 60px rgba(159, 216, 246, 0.05);
}

.horoscope-info {
  width: 100%;
  height: 100%;
  max-width: calc(100vw - 10px);
  text-align: center;

  display: flex;
  flex-direction: column;
  min-height: 0;
}

.active-zodiac {
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  color: white;
  margin-bottom: 16px;
}

.active-zodiac-name {
  font-size: calc(18px * var(--s));
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.92);
}

.active-zodiac-dates {
  font-size: calc(14px * var(--s));
  color: rgba(159, 216, 246, 0.75);
}

.horoscope-info-title {
  font-weight: 500;
  font-size: calc(18px * var(--s));
  line-height: 22px;
  margin-bottom: 10px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.92);
}

.horoscope-divider {
  width: 46px;
  height: 1px;
  margin: 0 auto 6px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(159, 216, 246, 0.75) 40%,
    rgba(255, 255, 255, 0.35) 60%,
    transparent 100%
  );
  opacity: 0.8;
}

:deep(.horoscope-panels) {
  flex: 1;
  min-height: 0;
  max-height: calc(100% - 220px);
}

:deep(.q-tab-panel) {
  height: 100%;
  min-height: 0;
}

:deep(.q-transition--theme-slide-left-enter-active),
:deep(.q-transition--theme-slide-left-leave-active),
:deep(.q-transition--theme-slide-right-enter-active),
:deep(.q-transition--theme-slide-right-leave-active) {
  transition:
    transform var(--q-transition-duration) cubic-bezier(0.22, 0.61, 0.36, 1),
    opacity var(--q-transition-duration) ease;
  will-change: transform, opacity;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

:deep(.q-transition--theme-slide-left-leave-active),
:deep(.q-transition--theme-slide-right-leave-active) {
  position: absolute;
}

:deep(.q-transition--theme-slide-left-enter-from) {
  opacity: 0;
  transform: translateX(18%);
}

:deep(.q-transition--theme-slide-left-leave-to) {
  opacity: 0;
  transform: translateX(-12%);
}

:deep(.q-transition--theme-slide-right-enter-from) {
  opacity: 0;
  transform: translateX(-18%);
}

:deep(.q-transition--theme-slide-right-leave-to) {
  opacity: 0;
  transform: translateX(12%);
}

.panel-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.horoscope-text-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.horoscope-info-style {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;

  text-align: center;
  font-weight: 450;
  font-size: max(16px, calc(16px * var(--s)));
  line-height: 1.62;
  letter-spacing: 0;
  text-transform: none;
  color: rgba(235, 244, 255, 0.92);

  padding: 6px clamp(16px, 5vw, 24px);

  scrollbar-width: none;
  text-wrap: pretty;
  hyphens: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;

  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0px,
    #000 8px,
    #000 calc(100% - 10px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0px,
    #000 8px,
    #000 calc(100% - 10px),
    transparent 100%
  );
}

.horoscope-info-style--blurred {
  filter: blur(3.5px);
  opacity: 0.75;
  pointer-events: none;
  user-select: none;
}

.horoscope-info-style--loading {
  overflow: hidden;
}

.horoscope-text-skeleton {
  display: grid;
  gap: 8px;
  padding: 6px clamp(14px, 4vw, 22px);
}

.horoscope-text-skeleton__line {
  display: block;
  height: 10px;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(159, 216, 246, 0.3) 50%,
    rgba(255, 255, 255, 0.08) 100%
  );
  background-size: 220% 100%;
  animation: horoscopeSkeletonPulse 1.25s ease-in-out infinite;
}

.horoscope-text-skeleton__line:nth-child(1) {
  width: 96%;
}

.horoscope-text-skeleton__line:nth-child(2) {
  width: 88%;
}

.horoscope-text-skeleton__line:nth-child(3) {
  width: 93%;
}

.horoscope-text-skeleton__line:nth-child(4) {
  width: 82%;
}

.horoscope-text-skeleton__line:nth-child(5) {
  width: 90%;
}

.horoscope-text-skeleton__line:nth-child(6) {
  width: 78%;
}

@keyframes horoscopeSkeletonPulse {
  0% {
    background-position: 100% 0;
    opacity: 0.75;
  }
  50% {
    opacity: 1;
  }
  100% {
    background-position: 0 0;
    opacity: 0.75;
  }
}

.horoscope-lock-overlay {
  position: absolute;
  inset: 3px;
  transform: none;
  overflow: hidden;
  border-radius: 20px;
  border: 1px solid rgba(159, 216, 246, 0.24);
  background: linear-gradient(180deg, rgba(10, 16, 26, 0.9) 0%, rgba(7, 13, 21, 0.84) 100%);
  color: rgba(244, 236, 216, 0.95);
  line-height: 1.4;
  text-align: center;
  padding: clamp(10px, 2.6vw, 14px);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  justify-items: center;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.horoscope-lock-overlay__title {
  font-size: max(15px, calc(15px * var(--s)));
  font-weight: 640;
  letter-spacing: 0.02em;
  color: rgba(236, 247, 255, 0.96);
}

.horoscope-lock-overlay__text {
  width: 100%;
  min-height: 0;
  overflow-y: auto;
  font-size: max(15px, calc(15px * var(--s)));
  line-height: 1.42;
  font-weight: 500;
  text-wrap: pretty;
  color: rgba(222, 235, 247, 0.9);
  scrollbar-width: none;
}

.horoscope-lock-overlay__text::-webkit-scrollbar {
  display: none;
}

.horoscope-lock-overlay__cta {
  position: relative;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 2px;
  flex-shrink: 0;
  width: 100%;
  min-height: 46px;
  border-radius: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(156, 206, 255, 0.56);
  background: linear-gradient(
    160deg,
    rgba(58, 90, 145, 0.98),
    rgba(25, 43, 74, 0.98) 56%,
    rgba(16, 29, 51, 0.98)
  );
  color: #f6fbff;
  font-size: max(13px, calc(13px * var(--s)));
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow:
    0 14px 28px rgba(17, 38, 72, 0.58),
    0 0 0 1px rgba(173, 224, 255, 0.14) inset;
  transition:
    transform 170ms ease,
    box-shadow 220ms ease,
    filter 220ms ease;
  will-change: transform, box-shadow, filter;
  animation: horoscopeLockCtaBreath 1.9s ease-in-out infinite;
}

.horoscope-lock-overlay__cta::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, rgba(236, 247, 255, 0.26), rgba(236, 247, 255, 0) 58%);
  opacity: 0.54;
  pointer-events: none;
  animation: horoscopeLockCtaInnerGlow 1.9s ease-in-out infinite;
}

.horoscope-lock-overlay__cta::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 14px;
  border: 1px solid rgba(174, 221, 255, 0.5);
  opacity: 0;
  transform: scale(0.96);
  pointer-events: none;
  animation: horoscopeLockCtaRing 1.9s ease-in-out infinite;
}

.horoscope-lock-overlay__cta > span {
  position: relative;
  z-index: 1;
}

.horoscope-lock-overlay:active .horoscope-lock-overlay__cta,
.horoscope-lock-overlay__cta:active {
  transform: translateY(-1px) scale(1.01);
  filter: saturate(1.04);
  box-shadow:
    0 18px 36px rgba(22, 51, 95, 0.68),
    0 0 0 1px rgba(188, 230, 255, 0.2) inset,
    0 0 22px rgba(141, 203, 255, 0.34),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.horoscope-lock-overlay:focus-visible .horoscope-lock-overlay__cta {
  outline: 2px solid rgba(159, 216, 246, 0.7);
  outline-offset: 2px;
}

@keyframes horoscopeLockCtaBreath {
  0%,
  100% {
    transform: translateY(0);
    filter: saturate(1);
  }
  50% {
    transform: translateY(-1px);
    filter: saturate(1.04);
  }
}

@keyframes horoscopeLockCtaInnerGlow {
  0%,
  100% {
    opacity: 0.44;
  }
  50% {
    opacity: 0.62;
  }
}

@keyframes horoscopeLockCtaRing {
  0% {
    opacity: 0;
    transform: scale(0.96);
  }
  42% {
    opacity: 0.48;
  }
  100% {
    opacity: 0;
    transform: scale(1.03);
  }
}

.horoscope-info-style::-webkit-scrollbar {
  display: none;
}

.horoscope-controls {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
}

.horoscope-controls-actions {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.dots {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: 12px;
  overflow: hidden;

  pointer-events: auto;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  border: none;
  background: transparent;
  display: grid;
  place-items: center;
  padding: 0;
}

.dot::after {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 999px;

  background: rgba(255, 255, 255, 0.22);
  box-shadow: 0 0 0 rgba(159, 216, 246, 0);

  transition:
    transform 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

.dot--locked::after {
  background: rgba(255, 219, 148, 0.35);
}

.dot.active::after {
  background: rgba(255, 255, 255, 0.72);
  transform: scale(1.15);
  box-shadow: 0 0 14px rgba(159, 216, 246, 0.35);
}

.share-controls-btn {
  width: 34px;
  height: 34px;
  min-height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(159, 216, 246, 0.16);
  background: rgba(7, 14, 22, 0.38);
  color: rgba(202, 224, 241, 0.72);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.share-controls-btn:active {
  transform: translateY(1px);
}

.share-controls-btn.q-btn--disable {
  opacity: 0.45;
}

.date-info {
  position: absolute;
  top: 100px;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2000;
  pointer-events: none;
}

.date-info-label {
  text-align: center;
  white-space: nowrap;
  font-weight: 400;
  font-size: 16px;
  line-height: 24px;
  letter-spacing: 0.04em;
  color: #fff;
  margin-bottom: 8px;
}

.date-bottom {
  font-size: 14px;
  line-height: 18px;
}

.bottom-bg-wrap {
  position: fixed;
  bottom: 0;
  z-index: 250;
  background-color: #031018 !important;
  height: 90px;
  width: 100%;
  padding-bottom: env(safe-area-inset-bottom);
}

@media screen and (max-height: 670px) {
  .date-info {
    top: 50px;
  }
  .date-info-label {
    font-size: 12px;
  }

  .horoscope-info-title {
    font-size: 14px;
    margin-bottom: 6px;
  }

  .horoscope-info-style {
    font-size: 15px;
  }

  .bottom-wrapper {
    padding-top: 40px;
  }
}

.personal-reading-btn {
  position: fixed;
  bottom: calc(86px + env(safe-area-inset-bottom, 0px) + 10px);
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;

  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: calc(100% - 48px);
  max-width: 360px;
  padding: 13px 20px;
  border-radius: 16px;
  border: 1px solid rgba(147, 197, 253, 0.2);
  background: linear-gradient(155deg, rgba(37, 99, 235, 0.18), rgba(29, 78, 216, 0.10));
  color: rgba(147, 197, 253, 0.85);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;

  &__icon {
    font-size: 13px;
    opacity: 0.7;
  }
}

</style>
