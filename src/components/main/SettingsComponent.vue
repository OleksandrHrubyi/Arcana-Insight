<template>
  <q-page class="settings-page">
    <!-- content -->
    <div class="settings-container">
      <!-- Optional tiny hint text instead of hero -->
      <div class="settings-help">
        {{ tt('settingsPage.subtitle') }}
      </div>

      <div class="settings-panel">
        <!-- GENERAL -->
        <div class="settings-section-title">
          {{ tt('settingsPage.sections.general') }}
        </div>
        <q-list class="settings-list">
          <q-item
            clickable
            v-ripple
            class="settings-item"
            @click="onOpenLanguage"
          >
            <q-item-section avatar class="row items-center justify-center">
              <q-icon name="language" size="20px" class="settings-icon" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="settings-label">{{ tt('language') }}</q-item-label>
            </q-item-section>

            <q-item-section side class="row items-center no-wrap settings-side">
              <div class="settings-value">{{ languageLabel }}</div>
              <q-icon name="chevron_right" size="18px" class="settings-chevron" />
            </q-item-section>
          </q-item>
        </q-list>

        <div class="settings-divider"></div>

        <!-- NOTIFICATIONS -->
        <div class="settings-section-title">
          {{ tt('settingsPage.sections.notifications') }}
        </div>
        <q-list class="settings-list">
          <q-item class="settings-item">
            <q-item-section avatar class="row items-center justify-center">
              <q-icon name="notifications" size="20px" class="settings-icon" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="settings-label">{{ tt('dailyPush') }}</q-item-label>
            </q-item-section>

            <q-item-section side>
              <q-toggle
                v-model="dailyPush"
                class="arcana-toggle"
                @update:model-value="onToggleHaptic"
              />
            </q-item-section>
          </q-item>

          <q-item
            v-if="dailyPush"
            clickable
            v-ripple
            class="settings-item"
            @click="onOpenTime"
          >
            <q-item-section avatar>
              <q-icon name="schedule" size="20px" class="settings-icon" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="settings-label">{{ tt('optimalTime') }}</q-item-label>
            </q-item-section>

            <q-item-section side class="row items-center no-wrap settings-side">
              <div class="settings-value">{{ optimalTimeLabel }}</div>
              <q-icon name="chevron_right" size="18px" class="settings-chevron" />
            </q-item-section>
          </q-item>
        </q-list>

        <div class="settings-divider"></div>

        <!-- ACCOUNT -->
        <div class="settings-section-title">
          {{ tt('settingsPage.sections.account') }}
        </div>
        <q-list class="settings-list">
          <q-item
            clickable
            v-ripple
            class="settings-item"
            @click="onAccountClickHaptic"
          >
            <q-item-section avatar class="row items-center justify-center">
              <q-icon name="person" size="20px" class="settings-icon" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="settings-label">{{ tt('account') }}</q-item-label>
            </q-item-section>

            <q-item-section side class="row items-center no-wrap settings-side">
              <div v-if="!isLoggedIn" class="settings-chip">
                {{ tt('login') }}
              </div>
              <q-icon name="chevron_right" size="18px" class="settings-chevron settings-chevron--raised" />
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>

    <!-- Language bottom sheet -->
    <q-dialog v-model="languageSheet" position="bottom" class="settings-language-dialog">
      <q-card class="settings-sheet">
        <div class="sheet-handle"></div>
        <div class="sheet-title">{{ tt('language') }}</div>

        <q-list class="sheet-list">
          <q-item
            v-for="opt in languageOptions"
            :key="opt.value"
            clickable
            v-ripple
            class="sheet-item"
            @click="selectLanguageHaptic(opt.value)"
          >
            <q-item-section>
              <q-item-label class="sheet-label">{{ opt.label }}</q-item-label>
              <q-item-label caption class="sheet-caption">{{ opt.sub }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon v-if="opt.value === locale" name="check" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import { supabase } from 'boot/supabase'
import { ensureToken, syncRegisterDevice, getSavedTime } from 'src/helpers/pushBackend'
import { t, currentLocale, setLocale } from 'src/i18n'

// Capacitor Haptics (safe import)
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const LS_DAILY_PUSH = 'daily_push_enabled'

export default defineComponent({
  name: 'SettingsPage',

  data () {
    return {
      isLoggedIn: false,
      dailyPush: JSON.parse(localStorage.getItem(LS_DAILY_PUSH) || 'false'),
      busy: false,
      languageSheet: false,
      reduceMotion: false
    }
  },

  computed: {
    locale () {
      return currentLocale.value || 'en'
    },

    tt () {
      return (key) => t(this.locale || 'en', key)
    },

    languageLabel () {
      return this.tt(`languages.${this.locale}`) || this.tt('languages.en')
    },

    optimalTimeLabel () {
      const hhmm = getSavedTime()
      if (!hhmm) return this.tt('notifications.defaultTime')
      return this.formatTime(hhmm)
    },

    languageOptions () {
      return [
        { value: 'en', label: this.tt('languages.en'), sub: this.tt('languagesNative.en') },
        { value: 'uk', label: this.tt('languages.uk'), sub: this.tt('languagesNative.uk') }
      ]
    }
  },

  watch: {
    languageSheet (val) {
      document.body.classList.toggle('settings-sheet-open', !!val)
    },

    async dailyPush (val) {
      if (this.busy) return
      this.busy = true
      try {
        localStorage.setItem(LS_DAILY_PUSH, JSON.stringify(val))

        if (val) {
          const token = await ensureToken()
          if (!token) {
            this.$q.notify({ type: 'negative', message: this.tt('notifications.noPermission') })
            this.dailyPush = false
            return
          }

          const res = await syncRegisterDevice({
            enabled: true,
            timeHHMM: getSavedTime(),
            locale: this.locale
          })
          if (!res.ok) {
            console.log(res.error)
            this.$q.notify({ type: 'negative', message: this.tt('notifications.syncFailed') })
          }
        } else {
          const res = await syncRegisterDevice({ enabled: false, timeHHMM: '', locale: this.locale })
          if (!res.ok) console.log(res.error)
        }
      } finally {
        this.busy = false
      }
    }
  },

  async mounted () {
    // reduced motion
    try {
      this.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch (e) {
      console.log(e);
    }

    const { data } = await supabase.auth.getSession()
    this.isLoggedIn = !!data?.session
    supabase.auth.onAuthStateChange((_event, session) => {
      this.isLoggedIn = !!session
    })
  },

  methods: {
    onBack () {
      // If you prefer always go to home, replace with this.go('/')
      if (window.history.length > 1) this.$router.back()
      else this.go('/')
      this.hapticSelect()
    },

    go (path) {
      this.$router.push(path)
    },

    async hapticSelect () {
      if (!Capacitor.isNativePlatform()) return
      if (this.reduceMotion) return
      try {
        await Haptics.selectionChanged()
      } catch (e) {
        console.log(e);
      }
    },

    async hapticLight () {
      if (!Capacitor.isNativePlatform()) return
      if (this.reduceMotion) return
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.log(e);
      }
    },

    onOpenLanguage () {
      this.hapticSelect()
      this.languageSheet = true
    },

    onOpenTime () {
      this.hapticSelect()
      this.go('/settings/time')
    },

    onToggleHaptic () {
      this.hapticLight()
    },

    onAccountClickHaptic () {
      this.hapticSelect()
      this.onAccountClick()
    },

    selectLanguageHaptic (val) {
      this.hapticSelect()
      this.selectLanguage(val)
    },

    selectLanguage (val) {
      setLocale(val)
      this.languageSheet = false
    },

    onAccountClick () {
      if (this.isLoggedIn) this.go('/account')
      else this.go('/login')
    },

    formatTime (hhmm) {
      const [h, m] = hhmm.split(':').map(Number)
      const d = new Date()
      d.setHours(h, m, 0, 0)

      const is12h = (this.locale || 'en').toLowerCase() === 'en'
      const fmt = new Intl.DateTimeFormat(is12h ? 'en-US' : 'uk-UA', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: is12h
      }).format(d)

      return fmt.replace(':', '.')
    }
  }
})
</script>

<style scoped>
/* Layout base */
.settings-layout {
  background: #050b10;
}

/* iOS blur header */
.settings-header {
  padding-top: env(safe-area-inset-top);
  background: rgba(10, 18, 26, 0.55);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.settings-toolbar {
  min-height: 52px;
}

.settings-nav-title {
  text-align: center;
  font-weight: 600;
  font-size: 17px;
  letter-spacing: 0.01em;
}

.settings-header-spacer {
  width: 40px;
}

.settings-back {
  color: rgba(255, 255, 255, 0.92);
}

/* Page background */
.settings-page {
  min-height: 100vh !important;
  padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
  position: relative;
  overflow: hidden;
  color: #ffffff;

  background: url('/images/set-bg.png') center bottom / cover no-repeat;
}

.settings-page::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1200px 700px at 50% -10%, rgba(159, 216, 246, 0.22), transparent 55%),
    linear-gradient(180deg, rgba(3, 8, 12, 0.55) 0%, rgba(3, 8, 12, 0.35) 45%, rgba(3, 8, 12, 0.72) 100%);
  pointer-events: none;
  z-index: 0;
}

/* Ambient stars */
.settings-stars {
  position: absolute;
  inset: -18% -12% auto -12%;
  height: 70%;
  background-image:
    radial-gradient(circle, rgba(255, 255, 255, 0.9) 0 1px, transparent 2px),
    radial-gradient(circle, rgba(159, 216, 246, 0.7) 0 1px, transparent 2.2px),
    radial-gradient(circle, rgba(255, 220, 180, 0.55) 0 1px, transparent 2.4px),
    radial-gradient(circle, rgba(255, 255, 255, 0.45) 0 1px, transparent 2.6px),
    radial-gradient(circle, rgba(159, 216, 246, 0.35) 0 1px, transparent 2.8px);
  background-size: 70px 70px, 100px 100px, 140px 140px, 180px 180px, 220px 220px;
  background-position: 10px 20px, 40px 60px, 80px 30px, 120px 90px, 160px 20px;
  opacity: 0.45;
  pointer-events: none;
  z-index: 0;
  animation: settingsStarsTwinkle 7s ease-in-out infinite, settingsStarsDrift 38s linear infinite;
}

.settings-shooting {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.shooting-star {
  position: absolute;
  width: 180px;
  height: 2px;
  opacity: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0), rgba(159,216,246,0.95), rgba(255,255,255,0));
  filter: drop-shadow(0 0 8px rgba(159, 216, 246, 0.5));
  transform: rotate(-25deg) translate3d(-40%, -40%, 0);
  animation: shootingStar 18s linear infinite;
}

.shooting-star--1 {
  top: 14%;
  left: -22%;
  width: 140px;
  height: 1.5px;
  animation-delay: 0s;
  animation-duration: 20s;
}

.shooting-star--2 {
  top: 28%;
  left: 110%;
  width: 220px;
  height: 2.5px;
  transform: rotate(205deg) translate3d(-40%, -40%, 0);
  animation-delay: 9.5s;
  animation-duration: 26s;
}

@media (prefers-reduced-motion: reduce) {
  .settings-stars,
  .shooting-star {
    animation: none !important;
  }
}

/* Container */
.settings-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}

/* Subtle help text */
.settings-help {
  margin: 10px 2px 14px;
  font-size: 12px;
  line-height: 18px;
  letter-spacing: 0.01em;
  color: rgba(255, 255, 255, 0.62);
}

/* One glass panel */
.settings-panel {
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(18, 34, 48, 0.55), rgba(10, 18, 26, 0.62));
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
  box-shadow:
    0 18px 45px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px rgba(255, 255, 255, 0.10);
  overflow: hidden;
  padding: 10px 0;
}

.settings-section-title {
  margin: 10px 18px 8px;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.55);
}

.settings-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 6px 0 10px;
}

.settings-list {
  overflow: hidden;
}

/* Items */
.settings-item {
  min-height: 56px;
  color: rgba(255, 255, 255, 0.92);
}

.settings-item:active {
  background: rgba(255, 255, 255, 0.06);
}

.settings-label {
  font-size: 15px;
  line-height: 20px;
}

.settings-side {
  color: rgba(255, 255, 255, 0.72);
  justify-content: flex-end;
  flex-wrap: nowrap;
  max-width: 48%;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.settings-value {
  color: rgba(255, 255, 255, 0.62);
  margin-right: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  display: inline-block;
}

.settings-chevron {
  color: rgba(255, 255, 255, 0.38);
  flex: 0 0 auto;
  align-self: center;
}

.settings-chevron--raised {
  transform: none;
}

/* Inset separators (like iOS) */
.settings-list :deep(.q-item) {
  position: relative;
}

.settings-list :deep(.q-item__section--side) {
  flex: 0 0 auto;
  min-width: 0;
  flex-direction: row !important;
}

.settings-list :deep(.q-item:not(:last-child))::after {
  content: '';
  position: absolute;
  left: 56px;  /* after icon */
  right: 0;
  bottom: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
}

/* Icon glow */
.settings-icon {
  color: rgba(159, 216, 246, 0.95);
  filter: drop-shadow(0 0 10px rgba(159, 216, 246, 0.18));
}

/* Account chip */
.settings-chip {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 14px;
  color: rgba(255, 255, 255, 0.78);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.10);
  display: inline-flex;
  align-items: center;
  height: 22px;
}

/* Toggle premium */
.arcana-toggle {
  --q-toggle-thumb-color: rgba(255, 255, 255, 0.95);
  --q-toggle-track-color: rgba(255, 255, 255, 0.16);
  --q-toggle-track-active-color: rgba(159, 216, 246, 0.58);
  filter: drop-shadow(0 0 12px rgba(159, 216, 246, 0.16));
}

/* Bottom sheet */
.settings-sheet {
  width: min(420px, 100%);
  margin: 0 auto;
  border-radius: 22px 22px 0 0;
  padding: 10px 14px 18px;
  background: linear-gradient(180deg, rgba(22, 42, 58, 0.72), rgba(8, 18, 26, 0.78));
  backdrop-filter: blur(26px);
  -webkit-backdrop-filter: blur(26px);
  box-shadow: 0 -18px 50px rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: #ffffff;
}

.sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  margin: 0 auto 10px;
}

.sheet-title {
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.74);
  margin-bottom: 8px;
}

.sheet-item {
  min-height: 56px;
}

.sheet-item:active {
  background: rgba(255, 255, 255, 0.06);
}

.sheet-caption {
  color: rgba(255, 255, 255, 0.55);
}

.sheet-label {
  font-size: 15px;
}

/* Dialog backdrop blur */
:deep(.settings-language-dialog .q-dialog__backdrop) {
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

/* Small footnote */
.settings-footnote {
  margin-top: 12px;
  padding: 0 4px;
  font-size: 11px;
  line-height: 16px;
  color: rgba(255, 255, 255, 0.45);
}

/* Animations */
@keyframes settingsStarsTwinkle {
  0%, 100% { opacity: 0.34; transform: scale(1); }
  50% { opacity: 0.52; transform: scale(1.01); }
}

@keyframes settingsStarsDrift {
  from { background-position: 10px 20px, 40px 60px, 80px 30px, 120px 90px, 160px 20px; }
  to   { background-position: 40px 0px, 80px 20px, 120px 10px, 160px 60px, 200px 0px; }
}

@keyframes shootingStar {
  0%   { opacity: 0;   transform: rotate(-25deg) translate3d(-40%, -40%, 0); }
  10%  { opacity: 0.9; }
  28%  { opacity: 0;   transform: rotate(-25deg) translate3d(140%, 120%, 0); }
  100% { opacity: 0;   transform: rotate(-25deg) translate3d(140%, 120%, 0); }
}
</style>
