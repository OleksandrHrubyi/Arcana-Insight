import { FirebaseAnalytics } from '@capacitor-firebase/analytics'
import { Capacitor } from '@capacitor/core'

class AnalyticsService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform()
    this.isAvailable = Capacitor.isPluginAvailable('FirebaseAnalytics')
    this.initialized = false
    this.timeoutMs = 1500
  }

  async withTimeout(promise, label) {
    if (!this.timeoutMs) return promise

    let timer
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`[Analytics] Timeout: ${label}`))
      }, this.timeoutMs)
    })

    try {
      return await Promise.race([promise, timeout])
    } finally {
      clearTimeout(timer)
    }
  }

  async init() {
    if (!this.isNative || !this.isAvailable) {
      console.log('[Analytics] Analytics unavailable, skipping init')
      return
    }

    try {
      await this.withTimeout(
        FirebaseAnalytics.setEnabled({ enabled: true }),
        'setEnabled',
      )
      this.initialized = true
      console.log('[Analytics] Firebase Analytics initialized')
    } catch (error) {
      console.error('[Analytics] Initialization failed:', error)
    }
  }

  async logEvent(eventName, params = {}) {
    if (!this.isNative || !this.isAvailable) return

    // Безпечно ігноруємо якщо не ініціалізовано
    if (!this.initialized) {
      console.log(`[Analytics] Skipped ${eventName} (not initialized yet)`)
      return
    }

    try {
      await this.withTimeout(
        FirebaseAnalytics.logEvent({
          name: eventName,
          params,
        }),
        `logEvent:${eventName}`,
      )
      console.log(`[Analytics] Event logged: ${eventName}`, params)
    } catch (error) {
      console.error(`[Analytics] Failed to log event ${eventName}:`, error)
    }
  }

  async setUserId(userId) {
    if (!this.isNative || !this.isAvailable || !this.initialized) return

    try {
      await this.withTimeout(
        FirebaseAnalytics.setUserId({ userId: userId?.toString() || null }),
        'setUserId',
      )
      console.log(`[Analytics] User ID set: ${userId}`)
    } catch (error) {
      console.error('[Analytics] Failed to set user ID:', error)
    }
  }

  async setUserProperty(name, value) {
    if (!this.isNative || !this.isAvailable || !this.initialized) return

    try {
      await this.withTimeout(
        FirebaseAnalytics.setUserProperty({
          key: name,
          value: value?.toString() || null,
        }),
        `setUserProperty:${name}`,
      )
      console.log(`[Analytics] User property set: ${name} = ${value}`)
    } catch (error) {
      console.error('[Analytics] Failed to set user property:', error)
    }
  }

  async logScreenView(screenName, screenClass) {
    if (!this.isNative || !this.isAvailable || !this.initialized) return

    try {
      await this.withTimeout(
        FirebaseAnalytics.logEvent({
          name: 'screen_view',
          params: {
            screen_name: screenName,
            screen_class: screenClass || screenName,
          },
        }),
        `screenView:${screenName}`,
      )
      console.log(`[Analytics] Screen view: ${screenName}`)
    } catch (error) {
      console.error('[Analytics] Failed to log screen view:', error)
    }
  }

  // Predefined event helpers
  async logLogin(method) {
    await this.logEvent('login', { method })
  }

  async logSignUp(method) {
    await this.logEvent('sign_up', { method })
  }

  async logShare(contentType, itemId) {
    await this.logEvent('share', {
      content_type: contentType,
      item_id: itemId,
    })
  }

  async logSearch(searchTerm) {
    await this.logEvent('search', { search_term: searchTerm })
  }

  async logSelectContent(contentType, itemId) {
    await this.logEvent('select_content', {
      content_type: contentType,
      item_id: itemId,
    })
  }
}

export const analytics = new AnalyticsService()
