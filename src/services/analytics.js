import { FirebaseAnalytics } from '@capacitor-firebase/analytics'
import { Capacitor } from '@capacitor/core'

class AnalyticsService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform()
    this.initialized = false
  }

  async init() {
    if (!this.isNative) {
      console.log('[Analytics] Running on web, skipping native analytics')
      return
    }

    try {
      await FirebaseAnalytics.setEnabled({ enabled: true })
      this.initialized = true
      console.log('[Analytics] Firebase Analytics initialized')
    } catch (error) {
      console.error('[Analytics] Initialization failed:', error)
    }
  }

  async logEvent(eventName, params = {}) {
    if (!this.isNative || !this.initialized) return

    try {
      await FirebaseAnalytics.logEvent({
        name: eventName,
        params,
      })
      console.log(`[Analytics] Event logged: ${eventName}`, params)
    } catch (error) {
      console.error(`[Analytics] Failed to log event ${eventName}:`, error)
    }
  }

  async setUserId(userId) {
    if (!this.isNative || !this.initialized) return

    try {
      await FirebaseAnalytics.setUserId({ userId: userId?.toString() || null })
      console.log(`[Analytics] User ID set: ${userId}`)
    } catch (error) {
      console.error('[Analytics] Failed to set user ID:', error)
    }
  }

  async setUserProperty(name, value) {
    if (!this.isNative || !this.initialized) return

    try {
      await FirebaseAnalytics.setUserProperty({
        key: name,
        value: value?.toString() || null,
      })
      console.log(`[Analytics] User property set: ${name} = ${value}`)
    } catch (error) {
      console.error('[Analytics] Failed to set user property:', error)
    }
  }

  async logScreenView(screenName, screenClass) {
    if (!this.isNative || !this.initialized) return

    try {
      await FirebaseAnalytics.logEvent({
        name: 'screen_view',
        params: {
          screen_name: screenName,
          screen_class: screenClass || screenName,
        },
      })
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
