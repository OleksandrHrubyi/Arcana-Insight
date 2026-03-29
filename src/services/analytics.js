import { FirebaseAnalytics } from '@capacitor-firebase/analytics'
import { Capacitor } from '@capacitor/core'

class AnalyticsService {
  constructor() {
    const env =
      typeof import.meta !== 'undefined' && import.meta?.env
        ? import.meta.env
        : {}
    this.isNative = Capacitor.isNativePlatform()
    this.isAvailable = Capacitor.isPluginAvailable('FirebaseAnalytics')
    this.initialized = false
    this.timeoutMs = 1500
    this.debug = env.DEV && env.VITE_ANALYTICS_DEBUG === '1'
    this.devFallback = env.DEV && env.VITE_ANALYTICS_DEV_FALLBACK !== '0'
  }

  logDevFallback(label, payload = {}) {
    if (!this.devFallback) return
    console.info('[Analytics][dev-fallback]', label, payload)
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
    if (!this.isNative || !this.isAvailable) return

    try {
      await this.withTimeout(
        FirebaseAnalytics.setEnabled({ enabled: true }),
        'setEnabled',
      )
      this.initialized = true
    } catch (error) {
      if (this.debug) {
        console.warn('[Analytics] Initialization failed:', error)
      }
    }
  }

  async logEvent(eventName, params = {}) {
    if (!this.isNative || !this.isAvailable) {
      this.logDevFallback('logEvent:plugin-unavailable', {
        eventName,
        params,
        isNative: this.isNative,
        isAvailable: this.isAvailable,
      })
      return
    }

    // Безпечно ігноруємо якщо не ініціалізовано
    if (!this.initialized) {
      this.logDevFallback('logEvent:not-initialized', {
        eventName,
        params,
      })
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
    } catch (error) {
      this.logDevFallback('logEvent:error', { eventName, params })
      if (this.debug) {
        console.warn(`[Analytics] Failed to log event ${eventName}:`, error)
      }
    }
  }

  async setUserId(userId) {
    if (!this.isNative || !this.isAvailable || !this.initialized) return

    try {
      await this.withTimeout(
        FirebaseAnalytics.setUserId({ userId: userId?.toString() || null }),
        'setUserId',
      )
    } catch (error) {
      if (this.debug) {
        console.warn('[Analytics] Failed to set user ID:', error)
      }
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
    } catch (error) {
      if (this.debug) {
        console.warn('[Analytics] Failed to set user property:', error)
      }
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
    } catch (error) {
      if (this.debug) {
        console.warn('[Analytics] Failed to log screen view:', error)
      }
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
