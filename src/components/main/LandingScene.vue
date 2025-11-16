<template>
  <div class="wrapper">
    <div class="container bg-container">
      <div class="content-wrapper">
        <div class="content-left">
          <div class="content-write">
            <div class="content-bottom"></div>
          </div>
        </div>

        <div class="appear-content mono-text">
  <span
    v-for="(ch, index) in fullTextArray"
    :key="index"
    :class="{ 'char-hidden': !revealedIndices.includes(index) && ch !== ' ' }"
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
        Between the stars and silence…
        <div>
          your path is forming
        </div>
      </div>

      <div class="bottom-btn">
        <q-btn
          label="Start my reading"
          class="no-auth-btn mono-text"
          no-caps
          flat
        />

        <div class="auth-btn-wrap">
          <q-btn
            label="Login"
            flat
            class="auth-btn mono-text"
            no-caps
          />
          <span class="auth-separator">|</span>
          <q-btn
            label="Sign up"
            flat
            class="auth-btn mono-text"
            no-caps
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import logo from 'src/assets/images/logo.svg'

export default {
  name: 'LandingScene',

  data () {
    return {
      logo,
      fullText: 'What you are waiting for may soon appear',
      revealedIndices: [],
      lettersTimer: null,
      hideTimer: null
    }
  },

  computed: {
    fullTextArray () {
      return this.fullText.split('')
    },
  },

  mounted () {
    this.startRandomLetterReveal()
  },

  beforeUnmount () {
    if (this.lettersTimer) {
      clearInterval(this.lettersTimer)
      this.lettersTimer = null
    }
    if (this.hideTimer) {
      clearInterval(this.hideTimer)
      this.hideTimer = null
    }
  },

  methods: {
    startRandomLetterReveal () {
      const indices = []

      // індекси всіх символів, крім пробілів
      for (let i = 0; i < this.fullText.length; i++) {
        if (this.fullText[i] !== ' ') {
          indices.push(i)
        }
      }

      // перемішуємо (Fisher–Yates)
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[indices[i], indices[j]] = [indices[j], indices[i]]
      }

      this.revealedIndices = []

      const delayBeforeStart = 800 // пауза перед стартом

      setTimeout(() => {
        let current = 0

        const totalDuration = 4000
        const minInterval = 90
        const stepInterval = Math.max(
          minInterval,
          Math.floor(totalDuration / indices.length)
        )

        this.lettersTimer = setInterval(() => {
          if (current >= indices.length) {
            clearInterval(this.lettersTimer)
            this.lettersTimer = null

            // після того як усе з’явилось — запускаємо зникнення
            this.startRandomLetterHide(indices)
            return
          }

          const idx = indices[current]
          this.revealedIndices = [...this.revealedIndices, idx]
          current++
        }, stepInterval)
      }, delayBeforeStart)
    },

    startRandomLetterHide (indices) {
      // можна ще раз перемішати, якщо хочеш інший порядок зникнення:
      // const shuffled = [...indices]
      // for (let i = shuffled.length - 1; i > 0; i--) {
      //   const j = Math.floor(Math.random() * (i + 1))
      //   ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      // }

      const shuffled = [...indices] // зникнення в тому ж рандомному порядку
      let current = 0

      const delayBeforeHide = 4000 // пауза після повної появи
      const totalDuration = 3500
      const minInterval = 90
      const stepInterval = Math.max(
        minInterval,
        Math.floor(totalDuration / shuffled.length)
      )

      setTimeout(() => {
        this.hideTimer = setInterval(() => {
          if (current >= shuffled.length) {
            clearInterval(this.hideTimer)
            this.hideTimer = null
            return
          }

          const idx = shuffled[current]

          // прибираємо індекс зі списку видимих → літера отримає class="char-hidden"
          this.revealedIndices = this.revealedIndices.filter(i => i !== idx)
          current++
        }, stepInterval)
      }, delayBeforeHide)
    },
  }

}
</script>

<style lang="scss" scoped>
.wrapper {
  height: 100dvh;
}

.container {
  position: relative;
  height: 100dvh;
  overflow: hidden;
}

.bg-container {
  position: relative;
  background-image: -webkit-image-set(
      url('assets/images/bg1@1x.png') 1x,
      url('assets/images/bg1@2x.png') 2x,
      url('assets/images/bg1@3x.png') 3x
  );
  background-image: image-set(
      url('assets/images/bg1@1x.png') 1x,
      url('assets/images/bg1@2x.png') 2x,
      url('assets/images/bg1@3x.png') 3x
  );
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.content-wrapper {
  pointer-events: none;
  position: absolute;
  inset: 0;
  z-index: 1;

  background-image: -webkit-image-set(
      url('assets/images/bg2@1x.png') 1x,
      url('assets/images/bg2@2x.png') 2x,
      url('assets/images/bg2@3x.png') 3x
  );
  background-image: image-set(
      url('assets/images/bg2@1x.png') 1x,
      url('assets/images/bg2@2x.png') 2x,
      url('assets/images/bg2@3x.png') 3x
  );
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.content-left {
  background-image: -webkit-image-set(
      url('assets/images/bg3@1x.png') 1x,
      url('assets/images/bg3@2x.png') 2x,
      url('assets/images/bg3@3x.png') 3x
  );
  background-image: image-set(
      url('assets/images/bg3@1x.png') 1x,
      url('assets/images/bg3@2x.png') 2x,
      url('assets/images/bg3@3x.png') 3x
  );
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 100%;
  width: 100%;
}

.content-write {
  background-image: -webkit-image-set(
      url('assets/images/bg4@1x.png') 1x,
      url('assets/images/bg4@2x.png') 2x,
      url('assets/images/bg4@3x.png') 3x
  );
  background-image: image-set(
      url('assets/images/bg4@1x.png') 1x,
      url('assets/images/bg4@2x.png') 2x,
      url('assets/images/bg4@3x.png') 3x
  );
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 100%;
  width: 100%;
}

.content-bottom {
  background-image: -webkit-image-set(
      url('assets/images/bg5@1x.png') 1x,
      url('assets/images/bg5@2x.png') 2x,
      url('assets/images/bg5@3x.png') 3x
  );
  background-image: image-set(
      url('assets/images/bg5@1x.png') 1x,
      url('assets/images/bg5@2x.png') 2x,
      url('assets/images/bg5@3x.png') 3x
  );
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  height: 100%;
  width: 100%;
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
  color: #FFFFFF;
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
  color: #FFFFFF;
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
  animation: bottom-fade-up 0.6s ease-out 0.8s forwards;
}

.no-auth-btn {
  height: 45px;
  width: 100%;
  max-width: 240px;
  background: linear-gradient(
      98.11deg,
      #0C0D0E 14.75%,
      #242C35 54.07%,
      #0C0D0E 89.76%
  );
  border: 1px solid #9FD8F6;
  border-radius: 12px;
  font-size: 14px;
  line-height: 21px;
  color: #FFFFFF;
  letter-spacing: 0.02em;
  margin-bottom: 4px;

  box-shadow: 0 0 0 rgba(159, 216, 246, 0.0);
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.3s ease;

  &:active {
    opacity: 0.9;
  }
}

.auth-btn-wrap {
  display: flex;
  width: 100%;
  max-width: 150px;
  justify-content: space-between;
}

.auth-btn {
  flex: 1;
  font-size: 14px;
  line-height: 18px;
  text-align: center;
  color: #FFFFFF;
  padding: 10px 6px;
  white-space: nowrap;

  border-radius: 12px;
  background: rgba(7, 9, 12, 0.55);
  backdrop-filter: blur(8px);

  transition: transform 0.15s ease, opacity 0.15s ease, border-color 0.2s ease;

  &:active {
    transform: scale(0.97);
    opacity: 0.8;
    border-color: rgba(255, 255, 255, 0.45);
  }
}

@keyframes bottom-fade-up {
  0% {
    opacity: 0;
    transform: translateY(12px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}


.appear-content span {
  display: inline-block;
  transition: opacity 0.5s ease; // плавний перехід
}

.char-hidden {
  opacity: 0;
}

.auth-separator {
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
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
  70% {
    opacity: 0;
    transform: translate3d(-75vw, 55vh, 0);
  }
  100% {
    opacity: 0;
    transform: translate3d(-75vw, 55vh, 0);
  }
}
</style>
