import { boot } from 'quasar/wrappers'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'

export default boot(() => {
  if (Capacitor.getPlatform() === 'ios') {
    // не блокуємо монтаж програми
    setTimeout(() => {
      (async () => {
        try {
          await StatusBar.setOverlaysWebView({ overlay: false })
          await StatusBar.setStyle({ style: Style.Light })
          await StatusBar.setBackgroundColor({ color: '#0b0d16' })
        } catch (e) {
          // тихо ігноруємо — плагін ще не готовий/не підтримується на старих iOS
          console.warn('[statusbar]', e)
        }
      })()
    }, 0)
  }
})
