<template>
  <q-btn
    flat round dense
    :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
    @click="toggleTheme"
    aria-label="Toggle theme"
  />
</template>

<script>
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

export default {
  name: 'ThemeToggle',
  methods: {
    async toggleTheme () {
      const toDark = !this.$q.dark.isActive
      this.$q.dark.set(toDark)
      localStorage.setItem('ai_theme', toDark ? 'dark' : 'light')

      // опційно: підлаштувати iOS статусбар (Capacitor)
      try {
        if (Capacitor.getPlatform() === 'ios') {
          await StatusBar.setOverlaysWebView({ overlay: false })
          await StatusBar.setStyle({ style: toDark ? Style.Light : Style.Dark })
          await StatusBar.setBackgroundColor({ color: toDark ? '#0b0d16' : '#ffffff' })
        }
      } catch (e) {
        console.log(e,'toggleTheme'); }
    }
  }
}
</script>
