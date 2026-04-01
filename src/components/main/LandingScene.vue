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

      <div class="main-title mono-text no-pointer-events">
        {{tt('betweenStars')}}
        <div> {{tt('answerAppear')}}</div>
      </div>

      <!-- Apple-style horizontal scroll cards -->
      <div v-if="astroCards.length" class="astro-cards" :class="{ 'astro-cards--visible': isPreloaded }">
        <div
          v-for="card in astroCards"
          :key="card.id"
          class="astro-card"
          :style="{ background: card.bg, borderColor: card.border }"
        >
          <span class="astro-card__label">{{ card.label }}</span>
          <span class="astro-card__icon">{{ card.icon }}</span>
          <span class="astro-card__value">{{ card.value }}</span>
          <span v-if="card.sub" class="astro-card__sub">{{ card.sub }}</span>
        </div>
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
        bg: 'rgba(140, 170, 255, 0.09)',
        border: 'rgba(140, 170, 255, 0.18)',
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
          bg: 'rgba(255, 228, 130, 0.07)',
          border: 'rgba(255, 228, 130, 0.15)',
        })
      }

      // 3. Planetary day
      if (pd) {
        const pBg = { sun:'rgba(255,220,100,0.08)', moon:'rgba(140,180,255,0.08)', mars:'rgba(255,100,80,0.09)', mercury:'rgba(150,220,160,0.08)', jupiter:'rgba(255,200,100,0.08)', venus:'rgba(255,155,200,0.09)', saturn:'rgba(180,160,140,0.08)' }
        const pBd = { sun:'rgba(255,220,100,0.18)', moon:'rgba(140,180,255,0.18)', mars:'rgba(255,100,80,0.2)', mercury:'rgba(150,220,160,0.18)', jupiter:'rgba(255,200,100,0.18)', venus:'rgba(255,155,200,0.2)', saturn:'rgba(180,160,140,0.18)' }
        cards.push({
          id: 'planet',
          label: this.tt('astro.cards.dayRuler'),
          icon: pd.symbol,
          value: this.tt(`astro.planets.${pd.key}`),
          sub: this.tt(`astro.planetMeanings.${pd.key}`),
          bg: pBg[pd.key] || 'rgba(255,255,255,0.06)',
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
        bg: 'rgba(255, 218, 90, 0.07)',
        border: 'rgba(255, 218, 90, 0.15)',
      })

      // 5. Moon element
      const eBg = { fire:'rgba(255,105,55,0.1)', water:'rgba(75,155,255,0.1)', air:'rgba(185,170,255,0.1)', earth:'rgba(105,195,105,0.1)' }
      const eBd = { fire:'rgba(255,105,55,0.22)', water:'rgba(75,155,255,0.22)', air:'rgba(185,170,255,0.22)', earth:'rgba(105,195,105,0.22)' }
      const eIco = { fire:'🔥', water:'🌊', air:'🌀', earth:'🌿' }
      cards.push({
        id: 'element',
        label: this.tt('astro.cards.moonEnergy'),
        icon: eIco[d.elementKey] || '◇',
        value: this.tt(`astro.elements.${d.elementKey}`),
        sub: this.tt(`astro.elementMeanings.${d.elementKey}`),
        bg: eBg[d.elementKey] || 'rgba(255,255,255,0.06)',
        border: eBd[d.elementKey] || 'rgba(255,255,255,0.12)',
      })

      // 6. Numerology
      const numIco = { 1:'🌟', 2:'☯️', 3:'🎨', 4:'🏛️', 5:'🦋', 6:'🌸', 7:'🔮', 8:'💫', 9:'🌀' }
      cards.push({
        id: 'num',
        label: this.tt('astro.cards.dayNumber'),
        icon: numIco[d.numerologyDay] || '✨',
        value: String(d.numerologyDay),
        sub: this.tt(`astro.numerology.${d.numerologyDay}`),
        bg: 'rgba(255,255,255,0.05)',
        border: 'rgba(255,255,255,0.10)',
      })

      // 7. Streak
      if (this.dailyStreak > 0) {
        cards.push({
          id: 'streak',
          label: this.tt('astro.cards.yourStreak'),
          icon: '⚡',
          value: String(this.dailyStreak),
          sub: this.tt('astro.cards.streakSub'),
          bg: 'rgba(255, 205, 90, 0.09)',
          border: 'rgba(255, 205, 90, 0.2)',
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
          bg: 'rgba(195, 155, 255, 0.1)',
          border: 'rgba(195, 155, 255, 0.22)',
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
            this.cycleTimeout = setTimeout(() => {
              this.setNextPhrase()
              this.$nextTick(() => { this.startRandomLetterReveal() })
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
  margin-top: 80px;
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
}
.logo-img { max-width: 170px; width: 170px; height: auto; display: block; }

/* ─── Subtitle ─────────────────────────────────────────── */
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
  letter-spacing: 0.08em;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
.main-title div { opacity: 0.72; }

/* ─── Cycling phrase ───────────────────────────────────── */
.content-wrapper { position: absolute; inset: 0; z-index: 3; }
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
  bottom: calc(96px + env(safe-area-inset-bottom, 0px) + 12px);
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
  transition: opacity 1.0s ease 0.9s, transform 1.0s cubic-bezier(0.2, 0.8, 0.2, 1) 0.9s;
}
.astro-cards::-webkit-scrollbar { display: none; }
/* iOS WebKit fix: padding on overflow-x containers is unreliable — use pseudo-elements instead */
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
  border: 1px solid rgba(255,255,255,0.12);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  display: flex;
  flex-direction: column;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.09),
    0 8px 28px rgba(0,0,0,0.22);
}

.astro-card__label {
  font-size: 9px;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.36);
  -webkit-font-smoothing: antialiased;
  line-height: 1;
  margin-bottom: 7px;
}

.astro-card__icon {
  font-size: 22px;
  line-height: 1;
  margin-bottom: 6px;
}

.astro-card__value {
  font-size: 13px;
  font-weight: 500;
  color: rgba(255,255,255,0.88);
  letter-spacing: 0.01em;
  line-height: 1.25;
  -webkit-font-smoothing: antialiased;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.astro-card__sub {
  font-size: 11px;
  color: rgba(255,255,255,0.42);
  letter-spacing: 0.02em;
  line-height: 1.25;
  margin-top: 2px;
  -webkit-font-smoothing: antialiased;
}

@media (max-width: 390px) {
  .astro-cards {
    --cards-pad: 16px;
    bottom: calc(70px + env(safe-area-inset-bottom, 0px) + 10px);
    gap: 7px;
  }
  .astro-card { width: 98px; padding: 10px 10px 9px; }
  .astro-card__icon { font-size: 20px; }
  .astro-card__value { font-size: 12px; }
}

@media (prefers-reduced-motion: reduce) {
  .astro-cards { transition: none; }
}
</style>
