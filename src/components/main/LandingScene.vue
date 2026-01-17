<template>
  <div class="wrapper" :class="{ 'scene-ready': isPreloaded }">
    <div class="container bg-container" :class="{ 'scene-ready': isPreloaded }">
      <div class="content-wrapper">
        <div class="appear-content mono-text">
          <span
            v-for="(ch, index) in fullTextArray"
            :key="index"
            :class="{ 'char-hidden': ch !== ' ' && !revealedSet.has(index) }"
          >
            {{ ch === ' ' ? '\u00A0' : ch }}
          </span>
        </div>
      </div>

      <div class="decor-layer">
        <div class="shooting-star"></div>
      </div>

      <div class="logo-wrap no-pointer-events">
        <img :src="logo" alt="logo" class="logo-img" />
      </div>

      <div class="main-title mono-text no-pointer-events">
        {{tt('betweenStars')}}
        <div> {{tt('answerAppear')}}</div>
      </div>

      <div v-if="!isLoggedIn" class="bottom-btn">
        <q-btn
          :label="tt('startReading')"
          class="no-auth-btn mono-text"
          no-caps
          flat
          @click="pushTo('/horoscope')"
        />

        <div class="auth-btn-wrap">
          <q-btn @click="pushTo('/login')" :label="tt('login')" flat class="auth-btn mono-text" no-caps />
          <span class="auth-separator">|</span>
          <q-btn @click="pushTo('/sign-up')" :label="tt('signUp')" flat class="auth-btn mono-text" no-caps />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import logo from 'src/assets/images/logo.svg'
import { useAuthStore } from 'src/stores/authStore.js'
import { t } from 'src/i18n/index.js';
export default {
  name: 'LandingScene',

  data() {
    return {
      logo,
      fullText: 'What you are waiting for may soon appear',
      revealedIndices: [],
      lettersTimer: null,
      hideTimer: null,
      revealTimeout: null,
      hideTimeout: null,
      isPreloaded: false,
      authStore: null,
      cycleTimeout: null,
      selectedLocale: 'en'
    };
  },

  created() {
    this.authStore = useAuthStore()
    this.authStore.initAuth()
  },

  computed: {
    tt() {
      return (key) => t(this.selectedLocale, key);
    },
    fullTextArray() {
      return this.fullText.split('')
    },
    revealedSet() {
      return new Set(this.revealedIndices)
    },
    isLoggedIn() {
      return this.authStore.isLoggedIn
    },
  },

  mounted() {
    // без preload — одразу показуємо сцену
    this.isPreloaded = true
    const saved = localStorage.getItem('locale');
    if (saved === 'uk' || saved === 'en') {
      this.selectedLocale = saved;
    }
    this.startRandomLetterReveal()
  },

  beforeUnmount() {
    clearInterval(this.lettersTimer)
    clearInterval(this.hideTimer)
    clearTimeout(this.revealTimeout)
    clearTimeout(this.hideTimeout)
    clearTimeout(this.cycleTimeout)
  },

  methods: {
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

            // ✅ перезапуск циклу (пауза перед новим reveal)
            this.cycleTimeout = setTimeout(() => {
              this.startRandomLetterReveal()
            }, 3200)

            return
          }

          this.revealedIndices = this.revealedIndices.filter(i => i !== shuffled[current])
          current++
        }, step)
      }, 4000)
    },

    pushTo(path) {
      this.$router.push(path)
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

.main-title {
  max-width: 300px;
  text-align: center;
  font-size: 12px;
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
}

.bottom-btn {
  position: absolute;
  bottom: calc(50px + env(safe-area-inset-bottom));
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  z-index: 3;
  opacity: 0;
  transform: translateY(12px);
  animation: bottom-fade-up 0.6s ease-out 4s forwards;
}

.auth-btn-wrap {
  display: flex;
  width: 100%;
  max-width: 190px;
  justify-content: space-between;
}

.auth-btn {
  flex: 1;
  font-size: 14px;
  line-height: 18px;
  text-align: center;
  color: #ffffff;
  padding: 10px 6px;
  white-space: nowrap;
  border-radius: 12px;
  transition: transform 0.15s ease, opacity 0.15s ease, border-color 0.2s ease;

  &:active {
    transform: scale(0.97);
    opacity: 0.8;
    border-color: rgba(255, 255, 255, 0.45);
  }
}

.auth-separator {
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
}

@keyframes bottom-fade-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

.no-auth-btn {
  position: relative;
  overflow: hidden;

  height: 45px;
  width: 100%;
  max-width: 240px;

  border-radius: 12px;
  border: 1px solid rgba(159, 216, 246, 0.65);

  /* glass */
  background: rgba(10, 12, 14, 0.55);
  font-size: 14px;
  line-height: 21px;
  color: #ffffff;
  letter-spacing: 0.02em;

  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

/* outer glow bloom */
.no-auth-btn::before {
  content: '';
  position: absolute;
  inset: -12px;
  border-radius: 999px;
  pointer-events: none;
  opacity: 0.7;
}

/* inner glossy layer */
.no-auth-btn::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  pointer-events: none;
  opacity: 0.6;
}

/* щоб текст був поверх псевдоелементів */
.no-auth-btn :deep(.q-btn__content) {
  position: relative;
  z-index: 2;
}
.main-title {
  letter-spacing: 0.08em;
  font-size: 11px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.main-title div {
  opacity: 0.72;
}
</style>
