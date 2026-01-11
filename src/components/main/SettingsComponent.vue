<template>
  <q-page class="settings-page">

    <div class="settings-title">Settings</div>

    <q-list class="settings-list">

      <!-- Language -->
      <q-item clickable v-ripple class="settings-item" @click="go('/settings/language')">
        <q-item-section  class="section-1">
          <q-item-label>Language</q-item-label>
        </q-item-section>

        <q-item-section side class="row items-center no-wrap items-settings-custom ">
          <div class="settings-value">{{ languageLabel }}</div>
          <q-icon name="chevron_right" size="18px" />
        </q-item-section>
      </q-item>
      <!-- Daily push notifications -->
      <q-item class="settings-item">
        <q-item-section>
          <q-item-label>Daily push notifications</q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-toggle v-model="dailyPush" color="grey" keep-color class="arcana-toggle" />
        </q-item-section>
      </q-item>

      <!-- Optimal time (тільки коли ON) -->
      <q-item
        v-if="dailyPush"
        clickable
        v-ripple
        class="settings-item"
        @click="go('/settings/time')"
      >
        <q-item-section>
          <q-item-label>Optimal time</q-item-label>
        </q-item-section>

        <q-item-section side class="row items-center items-settings-custom">
          <div class="settings-value">{{ optimalTimeLabel }}</div>
          <q-icon name="chevron_right" size="18px" />
        </q-item-section>
      </q-item>

      <!-- Account -->
      <q-item clickable v-ripple class="settings-item" @click="onAccountClick">
        <q-item-section>
          <q-item-label>Account</q-item-label>
        </q-item-section>

        <q-item-section side class="row items-center items-settings-custom">
          <div v-if="!isLoggedIn" class="settings-value">Login</div>
          <q-icon name="chevron_right" size="18px" />
        </q-item-section>
      </q-item>

    </q-list>

  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import { supabase } from 'boot/supabase'
import { ensureToken, syncRegisterDevice, getSavedTime } from 'src/helpers/pushBackend'

const LS_DAILY_PUSH = 'daily_push_enabled'
const LS_LOCALE = 'locale'

export default defineComponent({
  name: 'SettingsPage',

  data () {
    return {
      isLoggedIn: false,
      dailyPush: JSON.parse(localStorage.getItem(LS_DAILY_PUSH) || 'false'),
      locale: localStorage.getItem(LS_LOCALE) || 'en',
      busy: false
    }
  },

  computed: {
    languageLabel () {
      // простий маппінг під твій Figma список
      const map = {
        en: 'English',
        uk: 'Ukrainian',
        pl: 'Polish',
        nl: 'Dutch',
        de: 'German',
        hu: 'Hungarian'
      }
      return map[this.locale] || 'English'
    },

    optimalTimeLabel () {
      const hhmm = getSavedTime()
      if (!hhmm) return 'Default (08:00 UTC)'
      return this.formatTime(hhmm)
    }
  },

  watch: {
    async dailyPush (val) {
      if (this.busy) return
      this.busy = true
      try {
        localStorage.setItem(LS_DAILY_PUSH, JSON.stringify(val))

        if (val) {
          const token = await ensureToken()
          if (!token) {
            this.$q.notify({ type: 'negative', message: 'No permission / no token' })
            this.dailyPush = false
            return
          }

          // sync ON (час може бути пустий -> дефолт 08:00 UTC)
          const res = await syncRegisterDevice({
            enabled: true,
            timeHHMM: getSavedTime(),
            locale: this.locale
          })
          if (!res.ok) {
            console.log(res.error)
            this.$q.notify({ type: 'negative', message: 'Push sync failed' })
          }
        } else {
          // sync OFF
          const res = await syncRegisterDevice({ enabled: false, timeHHMM: '', locale: this.locale })
          if (!res.ok) console.log(res.error)
        }
      } finally {
        this.busy = false
      }
    }
  },

  async mounted () {
    const { data } = await supabase.auth.getSession()
    this.isLoggedIn = !!data?.session
    supabase.auth.onAuthStateChange((_event, session) => {
      this.isLoggedIn = !!session
    })
  },

  activated () {
    // якщо повернувся зі сторінки language/time — підхопити значення
    this.locale = localStorage.getItem(LS_LOCALE) || 'en'
  },

  methods: {
    go (path) {
      this.$router.push(path)
    },

    onAccountClick () {
      if (this.isLoggedIn) this.go('/account')
      else this.go('/login') // <-- заміни на свій роут логіну
    },

    formatTime (hhmm) {
      // відображення як у Figma: 8.00 AM (крапка)
      const [h, m] = hhmm.split(':').map(Number)
      const d = new Date()
      d.setHours(h, m, 0, 0)

      const is12h = (this.locale || 'en').toLowerCase() === 'en'
      const fmt = new Intl.DateTimeFormat(is12h ? 'en-US' : 'uk-UA', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: is12h
      }).format(d)

      // робимо 8:00 AM -> 8.00 AM
      return fmt.replace(':', '.')
    }
  }
})
</script>

<style scoped>
.settings-page {
  min-height: 100%;
  background: #0B131B;
  padding: 72px 16px 30px;

}

.settings-title {
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 21px;
margin-bottom: 24px;
  color: #FFFFFF;
}

.settings-list {
  overflow: hidden;
}

.settings-item {
  min-height: 54px;
  border-bottom: 1px solid #142632;
}


.settings-value {
  color: rgba(255,255,255,.6);
  margin-right: 6px;
}

.items-settings-custom {
  flex-direction: row !important;
  justify-content: center !important;
  align-items: center;

}

.section-1 {
  justify-content: center;
}
</style>
