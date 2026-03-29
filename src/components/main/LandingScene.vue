<template>
  <div class="wrapper" :class="{ 'scene-ready': isPreloaded }">
    <div class="container bg-container" :class="{ 'scene-ready': isPreloaded }">
      <div class="content-wrapper">
        <div class="appear-content mono-text">
          <template v-for="token in fullTextTokens" :key="token.key">
            <span v-if="token.type === 'space'">{{ token.text }}</span>
            <span v-else style="display: inline-block; white-space: nowrap;">
              <span
                v-for="(ch, i) in token.chars"
                :key="token.start + i"
                :class="{ 'char-hidden': !revealedSet.has(token.start + i) }"
              >
                {{ ch }}
              </span>
            </span>
          </template>
        </div>
      </div>

      <div class="decor-layer">
        <div class="shooting-star"></div>
      </div>

      <div class="logo-wrap no-pointer-events">
        <img :src="logo" :alt="tt('appName')" class="logo-img" />
      </div>

      <div v-if="astroToday" class="astro-strip" :class="{ 'astro-strip--visible': isPreloaded }">
        <section class="astro-text" :class="{ 'astro-text--expanded': astroExpanded }">
          <button
            type="button"
            class="astro-text__summary"
            :aria-expanded="astroExpanded"
            :aria-label="astroToggleLabel"
            @click="toggleAstroExpanded"
          >
            <span class="astro-text__icon astro-text__icon--summary" aria-hidden="true">
              <q-icon :name="astroSummaryItem.icon" class="astro-text__icon-glyph astro-text__icon-glyph--summary" />
            </span>
            <span class="astro-text__body astro-text__body--summary astro-text__kv">
              <span class="astro-text__label astro-text__label--summary">{{ astroSummaryItem.label }}</span>
              <span class="astro-text__value astro-text__value--summary">{{ astroSummaryItem.value }}</span>
            </span>
            <span
              class="astro-text__toggle"
              :class="{ 'astro-text__toggle--expanded': astroExpanded }"
              aria-hidden="true"
            >
              <q-icon name="expand_more" class="astro-text__toggle-icon" />
            </span>
          </button>

          <transition
            @before-enter="onAstroListBeforeEnter"
            @enter="onAstroListEnter"
            @after-enter="onAstroListAfterEnter"
            @before-leave="onAstroListBeforeLeave"
            @leave="onAstroListLeave"
            @after-leave="onAstroListAfterLeave"
          >
            <div v-show="astroExpanded" class="astro-text__list">
              <div v-for="(item, index) in astroExtraItems" :key="`astro-item-${index}`" class="astro-text__row">
                <span class="astro-text__icon" aria-hidden="true">
                  <q-icon :name="item.icon" class="astro-text__icon-glyph" />
                </span>
                <div class="astro-text__body astro-text__kv">
                  <div class="astro-text__label">{{ item.label }}</div>
                  <div class="astro-text__value">{{ item.value }}</div>
                </div>
              </div>
            </div>
          </transition>
        </section>
      </div>

      <div class="main-title mono-text no-pointer-events">
        {{tt('betweenStars')}}
        <div> {{tt('answerAppear')}}</div>
      </div>

    </div>
  </div>
</template>

<script>
import logo from 'src/assets/images/logo.svg'
import { useAuthStore } from 'src/stores/authStore.js'
import { t, currentLocale } from 'src/i18n/index.js';
import * as Astronomy from 'astronomy-engine';
import { readDailyStreak, DAILY_ACTIVITY_KEYS } from 'src/helpers/dailyRitual.js';
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
          'М’яка істина відкривається',
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
      astroExpanded: true,
      authStore: null,
      cycleTimeout: null,
      phraseQueue: [],
      phraseCursor: 0,
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

      // split зі збереженням пробілів
      const parts = this.fullText.split(/(\s+)/)

      for (const part of parts) {
        if (!part) continue

        // spaces
        if (/^\s+$/.test(part)) {
          tokens.push({
            type: 'space',
            text: part.replace(/ /g, '\u00A0'),
            key: `sp-${cursor}`,
          })
          cursor += part.length
          continue
        }

        // word
        tokens.push({
          type: 'word',
          chars: Array.from(part),
          start: cursor,
          key: `w-${cursor}`,
        })
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

    astroMoonPhase() {
      if (!this.astroToday) return ''
      return this.tt(`astro.phases.${this.astroToday.moonPhaseKey}`)
    },
    astroMoonSign() {
      if (!this.astroToday) return ''
      return this.tt(`zodiac.${this.astroToday.moonSignKey}`)
    },
    astroNextLunarLine() {
      const ev = this.astroToday?.nextLunarEvent
      if (!ev) return ''
      if (this.locale === 'uk') {
        if (ev.daysUntil <= 0) return 'сьогодні вночі'
        if (ev.daysUntil === 1) return 'завтра'
        return `через ${ev.daysUntil} ${this._astroDaysWord(ev.daysUntil)}`
      }

      if (ev.daysUntil <= 0) return 'tonight'
      if (ev.daysUntil === 1) return 'tomorrow'
      return `in ${ev.daysUntil} ${this._astroDaysWord(ev.daysUntil)}`
    },
    astroPlanetaryDayLine() {
      const pd = this.astroToday?.planetaryDay
      if (!pd) return ''
      return this.tt(`astro.planets.${pd.key}`)
    },
    astroSunLine() {
      if (!this.astroToday) return ''
      const sign = this.tt(`zodiac.${this.astroToday.sunSignKey}`)
      return `${this.tt('astro.sunIn')} ${sign} · ${this.astroToday.sunDegInSign}°`
    },
    astroElementLine() {
      const key = this.astroToday?.elementKey
      if (!key) return ''
      return this.tt(`astro.elements.${key}`)
    },
    astroNumerologyLine() {
      if (!this.astroToday) return ''
      const n = this.astroToday.numerologyDay
      const meaning = this.tt(`astro.numerology.${n}`)
      if (this.locale === 'uk') return `Число дня ${n} · ${meaning}`
      return `Day number ${n} · ${meaning}`
    },
    astroStreakLine() {
      if (!this.dailyStreak) return ''
      if (this.locale === 'uk') return `Серія: ${this.dailyStreak} днів`
      return `Streak: ${this.dailyStreak} days`
    },
    astroTextItems() {
      if (this.locale === 'uk') {
        return [
          { icon: 'nightlight_round', label: 'Фаза Місяця', value: this.astroMoonPhase },
          { icon: 'trip_origin', label: 'Місяць у знаку', value: this.astroMoonSign },
          { icon: 'trending_up', label: 'Повний місяць', value: this.astroNextLunarLine || this.astroNumerologyLine },
          { icon: 'wb_sunny', label: 'Сонячне поле', value: this.astroSunLine },
          { icon: 'change_history', label: 'Стихія дня', value: this.astroElementLine },
          { icon: 'public', label: 'Планета дня', value: this.astroPlanetaryDayLine },
        ].filter((item) => Boolean(item.value))
      }

      return [
        { icon: 'nightlight_round', label: 'Moon phase', value: this.astroMoonPhase },
        { icon: 'trip_origin', label: 'Moon sign', value: this.astroMoonSign },
        { icon: 'trending_up', label: 'Full Moon', value: this.astroNextLunarLine || this.astroNumerologyLine },
        { icon: 'wb_sunny', label: 'Solar field', value: this.astroSunLine },
        { icon: 'change_history', label: 'Day element', value: this.astroElementLine },
        { icon: 'public', label: 'Planetary day', value: this.astroPlanetaryDayLine },
      ].filter((item) => Boolean(item.value))
    },
    astroSummaryItem() {
      return this.astroTextItems[0] || { icon: '☾', label: '', value: '' }
    },
    astroExtraItems() {
      return this.astroTextItems.slice(1)
    },
    astroToggleLabel() {
      if (this.locale === 'uk') {
        return this.astroExpanded ? 'Згорнути астродеталі' : 'Розгорнути астродеталі'
      }
      return this.astroExpanded ? 'Collapse astro details' : 'Expand astro details'
    },
  },

  mounted() {
    // без preload — одразу показуємо сцену
    this.isPreloaded = true
    this.computeAstro()
    this.dailyStreak = Math.max(
      readDailyStreak(DAILY_ACTIVITY_KEYS.dailyCard).current,
      readDailyStreak(DAILY_ACTIVITY_KEYS.horoscope).current,
      readDailyStreak(DAILY_ACTIVITY_KEYS.tarot).current,
    )
    this.resetPhraseQueue()
    this.setNextPhrase()
    this.$nextTick(() => {
      this.startRandomLetterReveal()
    })
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
        const eventDate = fullMoonTime.date
        const daysUntil = Math.max(0, Math.ceil((eventDate.getTime() - now.getTime()) / 86400000))
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
    toggleAstroExpanded() {
      this.astroExpanded = !this.astroExpanded
    },
    onAstroListBeforeEnter(el) {
      el.style.height = '0px'
      el.style.opacity = '0'
      el.style.transform = 'translateY(-4px)'
      el.style.overflow = 'hidden'
    },
    onAstroListEnter(el, done) {
      const targetHeight = `${el.scrollHeight}px`
      requestAnimationFrame(() => {
        el.style.transition = 'height 280ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 220ms ease, transform 220ms ease'
        el.style.height = targetHeight
        el.style.opacity = '1'
        el.style.transform = 'translateY(0)'
      })
      const onEnd = (event) => {
        if (event.propertyName !== 'height') return
        el.removeEventListener('transitionend', onEnd)
        done()
      }
      el.addEventListener('transitionend', onEnd)
    },
    onAstroListAfterEnter(el) {
      el.style.height = 'auto'
      el.style.overflow = ''
      el.style.transition = ''
      el.style.opacity = ''
      el.style.transform = ''
    },
    onAstroListBeforeLeave(el) {
      el.style.height = `${el.scrollHeight}px`
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
      el.style.overflow = 'hidden'
    },
    onAstroListLeave(el, done) {
      requestAnimationFrame(() => {
        el.style.transition = 'height 240ms cubic-bezier(0.4, 0, 0.2, 1), opacity 180ms ease, transform 180ms ease'
        el.style.height = '0px'
        el.style.opacity = '0'
        el.style.transform = 'translateY(-4px)'
      })
      const onEnd = (event) => {
        if (event.propertyName !== 'height') return
        el.removeEventListener('transitionend', onEnd)
        done()
      }
      el.addEventListener('transitionend', onEnd)
    },
    onAstroListAfterLeave(el) {
      el.style.height = ''
      el.style.overflow = ''
      el.style.transition = ''
      el.style.opacity = ''
      el.style.transform = ''
    },

    shuffleArray(arr) {
      // Fisher–Yates
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    },

    resetPhraseQueue() {
      const list = this.phrases?.[this.locale] || this.phrases.en
      if (!list?.length) return

      // створюємо список індексів фраз
      this.phraseQueue = this.shuffleArray([...Array(list.length).keys()])
      this.phraseCursor = 0

      // ✅ щоб перша фраза нового кола не була такою самою, як остання минулого
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

      // Fisher–Yates shuffle
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

            this.cycleTimeout = setTimeout(() => {
              this.setNextPhrase()
              this.$nextTick(() => {
                this.startRandomLetterReveal()
              })
            }, 3200)



            return
          }

          this.revealedIndices = this.revealedIndices.filter(i => i !== shuffled[current])
          current++
        }, step)
      }, 4000)
    },
  }
}
</script>

<style lang="scss" scoped>
/* Плавна поява всієї сцени */
.wrapper,
.container {
  opacity: 0;
  transition: opacity 1.4s cubic-bezier(0.215, 0.61, 0.355, 1);
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
  background-image: url('assets/images/1v4.png');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}


.mono-text {
  font-style: normal;
  font-weight: 400;
}

.logo-wrap {
  margin-top: 80px;
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
}

.logo-img {
  max-width: 170px;
  width: 170px;
  height: auto;
  display: block;
}

.content-wrapper {
  position: absolute;
  inset: 0;
  z-index: 3;
}

.main-title {
  max-width: 300px;
  text-align: center;
  font-size: 13px;
  line-height: 20px;
  color: #ffffff;
  margin: 24px auto;
  position: relative;
  z-index: 2;
  opacity: 0.8;
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
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.9), 0 0 14px rgba(159, 216, 246, 0.8);
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

.main-title {
  letter-spacing: 0.08em;
  font-size: 13px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.main-title div {
  opacity: 0.72;
}

.astro-strip {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: calc(100px + env(safe-area-inset-bottom, 0px));
  z-index: 4;
  opacity: 0;
  transform: translateY(8px) scale(0.995);
  transition: opacity 280ms ease, transform 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.astro-strip--visible {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.astro-text {
  border-radius: 12px;
  padding: 8px;
  background: rgba(8, 14, 22, 0.62);
  border: 1px solid rgba(169, 218, 250, 0.2);
  transition: background 240ms ease, border-color 240ms ease, box-shadow 280ms ease;
}

.astro-text--expanded {
  border-color: rgba(169, 218, 250, 0.35);
  background: rgba(9, 17, 26, 0.72);
  box-shadow:
    inset 0 1px 0 rgba(226, 241, 255, 0.12),
    0 8px 20px rgba(2, 9, 17, 0.24);
}

.astro-text__summary {
  width: 100%;
  display: flex;
  gap: 8px;
  align-items: center;
  text-align: left;
  border: 0;
  background: transparent;
  padding: 0;
  transition: opacity 180ms ease, transform 180ms ease;
}

.astro-text__summary:active {
  opacity: 0.9;
  transform: scale(0.995);
}

.astro-text__toggle {
  margin-left: auto;
  color: rgba(180, 223, 248, 0.95);
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  padding: 0;
  transform: rotate(0deg);
  transform-origin: center center;
  transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1), color 220ms ease;
}

.astro-text__toggle-icon {
  font-size: 18px;
  line-height: 1;
}

.astro-text__toggle--expanded {
  transform: rotate(180deg);
  color: rgba(214, 240, 255, 0.96);
}

.astro-text__list {
  margin-top: 7px;
  padding-top: 7px;
  border-top: 1px solid rgba(169, 218, 250, 0.16);
}

.astro-text__row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.astro-text__row + .astro-text__row {
  margin-top: 6px;
}

.astro-text__icon {
  width: 22px;
  height: 22px;
  margin-top: 0;
  color: rgba(182, 220, 244, 0.95);
  text-align: center;
  line-height: 1;
  flex: 0 0 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: rgba(127, 171, 201, 0.16);
  border: 1px solid rgba(160, 200, 227, 0.28);
}

.astro-text__icon--summary {
  width: 24px;
  height: 24px;
  flex-basis: 24px;
  border-radius: 8px;
}

.astro-text__body {
  width: 100%;
  min-width: 0;
}

.astro-text__body--summary {
  flex: 1 1 auto;
}

.astro-text__kv {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.astro-text__label {
  font-size: 12px;
  line-height: 1.25;
  color: rgba(167, 191, 212, 0.84);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.astro-text__label--summary {
  font-size: 14px;
}

.astro-text__value {
  margin-top: 0;
  font-size: 13px;
  line-height: 1.25;
  color: rgba(204, 220, 234, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: right;
  max-width: 58%;
  flex: 0 0 auto;
}

.astro-text__value--summary {
  font-size: 15px;
  line-height: 1.2;
  color: rgba(217, 231, 243, 0.9);
  max-width: 60%;
}

.astro-text__icon-glyph {
  font-size: 14px;
}

.astro-text__icon-glyph--summary {
  font-size: 16px;
}


@media (max-width: 390px) {
  .astro-strip {
    left: 12px;
    right: 12px;
    bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  }

  .astro-text__label--summary {
    font-size: 13px;
  }

  .astro-text__value--summary {
    font-size: 14px;
  }

  .astro-text__label {
    font-size: 11px;
  }

  .astro-text__value {
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .astro-strip {
    transition: none;
    animation: none;
  }

  .astro-text,
  .astro-text__summary,
  .astro-text__toggle {
    transition: none;
  }
}

</style>
