<template>
  <div class="wrapper" :class="{ 'scene-ready': isPreloaded }">
    <div class="container bg-container" :class="{ 'scene-ready': isPreloaded }">
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
        <div>your path is forming</div>
      </div>
      <div v-if="!isLoggedIn" class="bottom-btn">
        <q-btn
          label="Start my reading"
          class="no-auth-btn mono-text"
          no-caps
          flat
          @click="pushTo('/horoscope')"
        />

        <div class="auth-btn-wrap">
          <q-btn @click="pushTo('/login')" label="Login" flat class="auth-btn mono-text" no-caps />
          <span class="auth-separator">|</span>
          <q-btn @click="pushTo('/sign-up')" label="Sign up" flat class="auth-btn mono-text" no-caps />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import logo from 'src/assets/images/logo.svg';
import { useAuthStore } from 'src/stores/authStore.js';
import { supabase } from 'src/boot/supabase';

export default {
  name: 'LandingScene',

  data() {
    return {
      logo,
      fullText: 'What you are waiting for may soon appear',
      revealedIndices: [],
      lettersTimer: null,
      hideTimer: null,
      isPreloaded: false,
      authStore: null,
    };
  },

  created() {
    this.authStore = useAuthStore()
    this.authStore.initAuth()
  },

  computed: {
    fullTextArray() {
      return this.fullText.split('');
    },
    auth() {
      return useAuthStore();
    },
    user() {
      console.log(this.auth);
      return this.auth.state.user;
    },
    isLoggedIn() {
      return this.authStore.isLoggedIn;
    },
  },

  mounted() {
    this.$nextTick(() => {
      this.preloadAllImages().then(() => {
        this.isPreloaded = true;
        this.startRandomLetterReveal();
      });
    });
  },

  beforeUnmount() {
    if (this.lettersTimer) clearInterval(this.lettersTimer);
    if (this.hideTimer) clearInterval(this.hideTimer);
  },

  methods: {
    // Прелоад всіх фонів (1x + потрібний @2x/@3x)
    preloadAllImages() {
      const dpr = window.devicePixelRatio || 1;
      const high = dpr >= 2.5 ? '@3x.png' : dpr >= 1.5 ? '@2x.png' : '@1x.png';

      const images = ['bg1', 'bg2', 'bg3', 'bg4', 'bg5'].flatMap(name => [
        `assets/images/${name}@1x.png`,
        `assets/images/${name}${high}`,
      ]);

      const promises = images.map(src => {
        return new Promise(resolve => {
          const img = new Image();
          img.onload = img.onerror = resolve;
          img.src = src;
        });
      });

      return Promise.all(promises);
    },

    startRandomLetterReveal() {
      const indices = [];
      for (let i = 0; i < this.fullText.length; i++) {
        if (this.fullText[i] !== ' ') indices.push(i);
      }

      // Fisher–Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[indices[i], indices[j]] = [indices[j], indices[i]];
      }

      this.revealedIndices = [];

      setTimeout(() => {
        let current = 0;
        const totalDuration = 4000;
        const minInterval = 90;
        const step = Math.max(minInterval, Math.floor(totalDuration / indices.length));

        this.lettersTimer = setInterval(() => {
          if (current >= indices.length) {
            clearInterval(this.lettersTimer);
            this.startRandomLetterHide(indices);
            return;
          }
          this.revealedIndices = [...this.revealedIndices, indices[current]];
          current++;
        }, step);
      }, 800);
    },

    startRandomLetterHide(indices) {
      const shuffled = [...indices];
      let current = 0;
      const totalDuration = 3500;
      const minInterval = 90;
      const step = Math.max(minInterval, Math.floor(totalDuration / shuffled.length));

      setTimeout(() => {
        this.hideTimer = setInterval(() => {
          if (current >= shuffled.length) {
            clearInterval(this.hideTimer);
            return;
          }
          this.revealedIndices = this.revealedIndices.filter(i => i !== shuffled[current]);
          current++;
        }, step);
      }, 4000);
    },

    pushTo(path) {
      this.$router.push(path);
    },

    async onLogout() {
      const auth = useAuthStore();

      try {
        // спочатку подивимось, чи є взагалі активна сесія
        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (!session) {
          // сесії немає – значить юзер і так не залогінений
          auth.state.user = null;
          this.$router.push('/login');
          return;
        }

        const { error } = await supabase.auth.signOut();

        if (error && error.name !== 'AuthSessionMissingError') {
          // інші помилки покажемо в консолі
          console.error('Logout error:', error);
          return;
        }

        // локально чистимо стейт
        auth.state.user = null;
        this.$router.push('/login');
      } catch (e) {
        console.error('Logout error:', e);
        // навіть якщо щось пішло не так – все одно ведемо на логін
        this.$router.push('/login');
      }
    },
  },
};
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
  background-color: #0a0a0f; /* проти білого спалаху */
}

.bg-container {
  background-image: image-set(
      url('assets/images/bg1@1x.png') 1x,
      url('assets/images/bg1@2x.png') 2x,
      url('assets/images/bg1@3x.png') 3x
  );
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

/* Усі шари фону */
.content-wrapper,
.content-left,
.content-write,
.content-bottom {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.content-wrapper {
  z-index: 1;
  background-image: image-set(
      'assets/images/bg2@1x.png' 1x,
      'assets/images/bg2@2x.png' 2x,
      'assets/images/bg2@3x.png' 3x
  );
}

.content-left {
  background-image: image-set('assets/images/bg3@1x.png' 1x, 'assets/images/bg3@2x.png' 2x, 'assets/images/bg3@3x.png' 3x);
}

.content-write {
  background-image: image-set('assets/images/bg4@1x.png' 1x, 'assets/images/bg4@2x.png' 2x, 'assets/images/bg4@3x.png' 3x);
}

.content-bottom {
  background-image: image-set('assets/images/bg5@1x.png' 1x, 'assets/images/bg5@2x.png' 2x, 'assets/images/bg5@3x.png' 3x);
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
  animation: bottom-fade-up 0.6s ease-out 4s forwards; /* тепер кнопки з'являються після анімації тексту */
}

/* ТВОЇ ОРИГІНАЛЬНІ КРАСИВІ КНОПКИ — 100% збережений дизайн */
.no-auth-btn {
  height: 45px;
  width: 100%;
  max-width: 240px;
  background: linear-gradient(98.11deg, #0C0D0E 14.75%, #242C35 54.07%, #0C0D0E 89.76%);
  border: 1px solid #9FD8F6;
  border-radius: 12px;
  font-size: 14px;
  line-height: 21px;
  color: #FFFFFF;
  letter-spacing: 0.02em;
  margin-bottom: 4px;
  box-shadow: 0 0 0 rgba(159, 216, 246, 0);
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

.auth-separator {
  color: #FFFFFF;
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
  70%, 100% {
    opacity: 0;
    transform: translate3d(-75vw, 55vh, 0);
  }
}
</style>
