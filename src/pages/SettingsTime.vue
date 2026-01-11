<template>
  <q-page class="settings-page">

    <div class="topbar">
      <q-btn flat round icon="chevron_left" @click="$router.back()" />
      <div class="topbar-title">Optimal time</div>
      <div style="width: 40px;"></div>
    </div>

    <q-list class="settings-list">
      <q-item
        v-for="t in timeOptions"
        :key="t"
        clickable
        v-ripple
        class="settings-item"
        @click="selectTime(t)"
      >
        <q-item-section>
          <q-item-label>{{ labelFor(t) }}</q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-icon v-if="t === selected" name="check" />
        </q-item-section>
      </q-item>

      <!-- Default row -->
      <q-separator class="settings-sep" />
      <q-item clickable v-ripple class="settings-item" @click="selectTime('')">
        <q-item-section>
          <q-item-label>Default (08:00 UTC)</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-icon v-if="selected === ''" name="check" />
        </q-item-section>
      </q-item>
    </q-list>

  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import { syncRegisterDevice, getSavedTime, setSavedTime } from 'src/helpers/pushBackend'

const LS_DAILY_PUSH = 'daily_push_enabled'
const LS_LOCALE = 'locale'

export default defineComponent({
  name: 'SettingsTime',

  data () {
    return {
      selected: getSavedTime(), // "HH:mm" або ""
      dailyPush: JSON.parse(localStorage.getItem(LS_DAILY_PUSH) || 'false'),
      locale: localStorage.getItem(LS_LOCALE) || 'en',
      timeOptions: []
    }
  },

  mounted () {
    // як у Figma — слоти кожні 30 хв, наприклад 06:00..14:30 (під себе легко змінити)
    const start = 6 * 60
    const end = 14 * 60 + 30
    const step = 30
    const out = []
    for (let m = start; m <= end; m += step) {
      const hh = String(Math.floor(m / 60)).padStart(2, '0')
      const mm = String(m % 60).padStart(2, '0')
      out.push(`${hh}:${mm}`)
    }
    this.timeOptions = out
  },

  methods: {
    labelFor (hhmm) {
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
    },

    async selectTime (hhmm) {
      this.selected = hhmm
      setSavedTime(hhmm)

      if (this.dailyPush) {
        const res = await syncRegisterDevice({
          enabled: true,
          timeHHMM: hhmm, // "" => дефолт
          locale: this.locale
        })
        if (!res.ok) console.log(res.error)
      }

      this.$router.back()
    }
  }
})
</script>

<style scoped>
.settings-page {
  min-height: 100%;
  background: #0B131B;
  padding: 72px 16px;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.topbar-title {
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 21px;
  color: #FFFFFF;
}

.settings-list {
  overflow: hidden;
}

.settings-item {
  min-height: 54px;
  border-bottom: 1px solid #142632;
}

.settings-sep {
  opacity: 0.12;
}
</style>
