<template>
  <q-page class="settings-page">

    <div class="topbar">
      <q-btn flat round icon="chevron_left" @click="$router.back()" />
      <div class="topbar-title">Language</div>
      <div style="width: 40px;"></div>
    </div>

    <q-list class="settings-list">
      <q-item
        v-for="opt in options"
        :key="opt.value"
        clickable
        v-ripple
        class="settings-item"
        @click="select(opt.value)"
      >
        <q-item-section>
          <q-item-label>{{ opt.label }}</q-item-label>
          <q-item-label caption class="caption">{{ opt.sub }}</q-item-label>
        </q-item-section>

        <q-item-section side>
          <q-icon v-if="opt.value === locale" name="check" />
        </q-item-section>
      </q-item>
    </q-list>

  </q-page>
</template>

<script>
import { defineComponent } from 'vue'

const LS_LOCALE = 'locale'

export default defineComponent({
  name: 'SettingsLanguage',

  data () {
    return {
      locale: localStorage.getItem(LS_LOCALE) || 'en',
      options: [
        { value: 'en', label: 'English', sub: 'English' },
        { value: 'uk', label: 'Ukrainian', sub: 'Українська' },
        { value: 'pl', label: 'Polish', sub: 'Polska' },
        { value: 'nl', label: 'Dutch', sub: 'Nederlands' },
        { value: 'de', label: 'German', sub: 'Deutsch' },
        { value: 'hu', label: 'Hungarian', sub: 'Magyar' }
      ]
    }
  },

  methods: {
    select (val) {
      this.locale = val
      localStorage.setItem(LS_LOCALE, val)
      this.$router.back()
    }
  }
})
</script>

<style scoped>
.settings-page {
  min-height: 100%;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
  padding: 72px 16px 30px;
}

.topbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.topbar-title {
  flex: 1;
  text-align: center;
  font-size: 14px;
  letter-spacing: .12em;
  text-transform: uppercase;
}
.settings-item {
  min-height: 54px;
  border-bottom: 1px solid #142632;
}

.caption {
  color: rgba(255,255,255,.55);
}
</style>
