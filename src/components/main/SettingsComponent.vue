<template>
  <div class="settings-shell">
    <q-page v-if="!embedded" class="settings-page">
      <div class="settings-bg" aria-hidden="true"></div>

      <div class="settings-content">
        <header v-if="showHero" class="settings-hero">
          <div class="settings-title">{{ tt('settings') }}</div>
          <div class="settings-kicker">{{ tt('settingsPage.subtitle') }}</div>
        </header>

        <section class="settings-stack">
          <div class="settings-card">
            <div class="settings-card__title">
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
          </div>

          <div class="settings-card">
            <div class="settings-card__title">
              {{ tt('settingsPage.sections.notifications') }}
            </div>
            <q-list class="settings-list">
              <q-item class="settings-item">
                <q-item-section avatar class="row items-center justify-center">
                  <q-icon name="notifications" size="20px" class="settings-icon" />
                </q-item-section>

                <q-item-section>
                  <q-item-label class="settings-label">{{ tt('dailyPush') }}</q-item-label>
                  <q-item-label caption class="settings-caption">{{ getPushStatusLabel() }}</q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-spinner
                    v-if="busy"
                    size="16px"
                    color="white"
                    class="q-mr-sm"
                  />
                  <q-toggle
                    v-model="dailyPush"
                    class="arcana-toggle"
                    :disable="busy"
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
                <q-item-section avatar class="row items-center justify-center">
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
          </div>

          <div class="settings-card">
            <div class="settings-card__title">
              {{ tt('settingsPage.sections.personalization') }}
            </div>
            <div class="settings-personalization">
              <div class="settings-personalization__hint">
                {{ tt('settingsPage.personalization.interestsHint') }}
              </div>
              <div class="settings-personalization__meta">
                {{ tt('settingsPage.personalization.selectedLabel') }}: {{ onboardingSelectedCount }}
              </div>
              <div class="settings-interest-tags">
                <button
                  v-for="item in onboardingInterestItems"
                  :key="item.key"
                  type="button"
                  class="settings-interest-tag"
                  :class="{ 'settings-interest-tag--active': item.isSelected }"
                  @click="onToggleOnboardingInterest(item.key)"
                >
                  <q-icon :name="item.icon" size="14px" />
                  <span>{{ tt(item.labelKey) }}</span>
                </button>
              </div>
            </div>
          </div>

          <div class="settings-card">
            <div class="settings-card__title">
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
        </section>
      </div>
    </q-page>

    <div v-else class="settings-content settings-content--embedded">
      <header v-if="showHero" class="settings-hero">
        <div class="settings-title">{{ tt('settings') }}</div>
        <div class="settings-kicker">{{ tt('settingsPage.subtitle') }}</div>
      </header>

      <section class="settings-stack">
        <div class="settings-card">
          <div class="settings-card__title">
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
        </div>

        <div class="settings-card">
          <div class="settings-card__title">
            {{ tt('settingsPage.sections.notifications') }}
          </div>
          <q-list class="settings-list">
            <q-item class="settings-item">
              <q-item-section avatar class="row items-center justify-center">
                <q-icon name="notifications" size="20px" class="settings-icon" />
              </q-item-section>

              <q-item-section>
                <q-item-label class="settings-label">{{ tt('dailyPush') }}</q-item-label>
                <q-item-label caption class="settings-caption">{{ getPushStatusLabel() }}</q-item-label>
              </q-item-section>

                <q-item-section side>
                  <q-spinner
                    v-if="busy"
                    size="16px"
                    color="white"
                    class="q-mr-sm"
                  />
                  <q-toggle
                    v-model="dailyPush"
                    class="arcana-toggle"
                    :disable="busy"
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
              <q-item-section avatar class="row items-center justify-center">
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
        </div>

        <div class="settings-card">
          <div class="settings-card__title">
            {{ tt('settingsPage.sections.personalization') }}
          </div>
          <div class="settings-personalization">
            <div class="settings-personalization__hint">
              {{ tt('settingsPage.personalization.interestsHint') }}
            </div>
            <div class="settings-personalization__meta">
              {{ tt('settingsPage.personalization.selectedLabel') }}: {{ onboardingSelectedCount }}
            </div>
            <div class="settings-interest-tags">
              <button
                v-for="item in onboardingInterestItems"
                :key="item.key"
                type="button"
                class="settings-interest-tag"
                :class="{ 'settings-interest-tag--active': item.isSelected }"
                @click="onToggleOnboardingInterest(item.key)"
              >
                <q-icon :name="item.icon" size="14px" />
                <span>{{ tt(item.labelKey) }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="settings-card__title">
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
      </section>
    </div>

    <!-- Language bottom sheet -->
    <q-dialog
      v-model="languageSheet"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="440"
      :class="['oracle-actions-dialog', { 'oracle-actions-dialog--opaque': opaqueSheet }]"
    >
      <section class="oracle-actions">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-title">{{ tt('language') }}</div>

        <div class="oracle-wheel">
          <div class="oracle-wheel__window" aria-hidden="true"></div>
          <div ref="languageWheelRef" class="oracle-wheel__scroll" @scroll.passive="onLanguageWheelScroll">
            <div class="oracle-wheel__spacer"></div>
            <button
              v-for="(opt, index) in languageOptions"
              :key="opt.value"
              type="button"
              class="oracle-wheel__item"
              :class="{ 'oracle-wheel__item--active': index === selectedLanguageIndex }"
              @click="onLanguageWheelItemTap(index)"
            >
              {{ opt.label }}
            </button>
            <div class="oracle-wheel__spacer"></div>
          </div>
        </div>

        <div class="oracle-actions__footer">
          <button type="button" class="arcana-btn arcana-btn--primary" @click="confirmLanguageWheel">
            {{ tt('common.apply') }}
          </button>
        </div>
      </section>
    </q-dialog>

    <!-- Time bottom sheet -->
    <q-dialog
      v-model="timeSheet"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
      :transition-duration="440"
      :class="['oracle-actions-dialog', { 'oracle-actions-dialog--opaque': opaqueSheet }]"
    >
      <section class="oracle-actions">
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-title">{{ tt('optimalTime') }}</div>

        <div class="oracle-wheel">
          <div class="oracle-wheel__window" aria-hidden="true"></div>
          <div ref="timeWheelRef" class="oracle-wheel__scroll" @scroll.passive="onTimeWheelScroll">
            <div class="oracle-wheel__spacer"></div>
            <button
              v-for="(opt, index) in timeOptions"
              :key="opt.value"
              type="button"
              class="oracle-wheel__item"
              :class="{ 'oracle-wheel__item--active': index === selectedTimeIndex }"
              @click="onTimeWheelItemTap(index)"
            >
              {{ opt.label }}
            </button>
            <div class="oracle-wheel__spacer"></div>
          </div>
        </div>

        <div class="oracle-actions__footer">
          <button type="button" class="arcana-btn arcana-btn--primary" :disabled="busy" @click="confirmTimeWheel">
            <q-spinner-dots v-if="busy" size="18px" color="white" />
            <span v-else>{{ tt('common.apply') }}</span>
          </button>
        </div>
      </section>
    </q-dialog>
  </div>
</template>

<script>
import { defineComponent } from 'vue'
import {
  ensureToken,
  syncRegisterDevice,
  resolveAccountPushPreference,
  getSavedTime,
  setSavedTime
} from 'src/helpers/pushBackend'
import {
  normalizeOnboardingInterests,
  persistOnboardingPreferences,
  readOnboardingInterests,
} from 'src/helpers/onboardingPrefs'
import { t, currentLocale, setLocale } from 'src/i18n'
import { useAuthStore } from 'stores/authStore.js'

// Capacitor Haptics (safe import)
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

const LS_DAILY_PUSH = 'daily_push_enabled'
const DEFAULT_TIME = '08:00'
const ONBOARDING_INTEREST_ITEMS = Object.freeze([
  { key: 'love', icon: 'favorite', labelKey: 'onboardingPage.interests.love' },
  { key: 'career', icon: 'work_outline', labelKey: 'onboardingPage.interests.career' },
  { key: 'money', icon: 'payments', labelKey: 'onboardingPage.interests.money' },
  { key: 'self', icon: 'self_improvement', labelKey: 'onboardingPage.interests.self' },
  { key: 'energy', icon: 'bolt', labelKey: 'onboardingPage.interests.energy' },
  { key: 'future', icon: 'travel_explore', labelKey: 'onboardingPage.interests.future' },
])

export default defineComponent({
  name: 'SettingsComponent',
  props: {
    embedded: {
      type: Boolean,
      default: false,
    },
    showHero: {
      type: Boolean,
      default: true,
    },
    opaqueSheet: {
      type: Boolean,
      default: false,
    },
  },

  data () {
    return {
      authStore: useAuthStore(),
      // Strict string compare, not JSON.parse: this runs in data() during mount —
      // a corrupted value must read as "off", never white-screen the Settings tab
      // (B3 — the writer below stores 'true'/'false').
      dailyPush: localStorage.getItem(LS_DAILY_PUSH) === 'true',
      busy: false,
      pushSyncError: false,
      suppressDailyPushWatch: false,
      languageSheet: false,
      timeSheet: false,
      reduceMotion: false,
      selectedLanguageIndex: 0,
      lastLanguageHapticAt: 0,
      timeOptions: [],
      selectedTimeIndex: 0,
      lastTimeHapticAt: 0,
      selectedTimeValue: '',
      onboardingInterests: [],
    }
  },

  computed: {
    locale () {
      return currentLocale.value || 'en'
    },

    isLoggedIn () {
      return !!this.authStore.state.user
    },

    tt () {
      return (key) => t(this.locale || 'en', key)
    },

    languageLabel () {
      return this.tt(`languages.${this.locale}`) || this.tt('languages.en')
    },

    optimalTimeLabel () {
      const hhmm = this.selectedTimeValue || DEFAULT_TIME
      return this.formatTime(hhmm)
    },

    languageOptions () {
      return [
        { value: 'en', label: this.tt('languages.en'), sub: this.tt('languagesNative.en') },
        { value: 'uk', label: this.tt('languages.uk'), sub: this.tt('languagesNative.uk') }
      ]
    },

    onboardingSelectedCount () {
      return this.onboardingInterests.length
    },

    onboardingInterestItems () {
      const selectedSet = new Set(this.onboardingInterests)
      const selected = []
      const rest = []
      for (const item of ONBOARDING_INTEREST_ITEMS) {
        const next = { ...item, isSelected: selectedSet.has(item.key) }
        if (next.isSelected) selected.push(next)
        else rest.push(next)
      }
      return [...selected, ...rest]
    }
  },

  watch: {
    languageSheet (val) {
      document.body.classList.toggle('settings-sheet-open', !!(val || this.timeSheet))
    },

    timeSheet (val) {
      document.body.classList.toggle('settings-sheet-open', !!(val || this.languageSheet))
    },

    locale () {
      this.buildTimeOptions()
      if (this.dailyPush && !this.busy) {
        void this.syncDailyPushStateSafe(true, { silentError: true })
      }
    },

    dailyPush (val) {
      if (this.suppressDailyPushWatch) return
      void this.syncDailyPushStateSafe(Boolean(val))
    }
  },

  mounted () {
    void this.initializeSettingsSafe()
  },

  beforeUnmount () {
    // no-op
  },

  methods: {
    async initializeSettings () {
      // reduced motion
      try {
        this.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      } catch (e) {
        console.error(e)
      }

      this.buildTimeOptions()
      this.selectedTimeValue = this.normalizeTimeValue(getSavedTime() || DEFAULT_TIME)
      setSavedTime(this.selectedTimeValue)
      this.hydrateOnboardingInterests()

      await this.initializeSettingsAuthSafe()
      await this.hydratePushPreferenceFromAccountSafe()
    },

    async initializeSettingsSafe () {
      try {
        await this.initializeSettings()
      } catch (error) {
        console.warn('[Settings] init failed', error)
      }
    },

    async initializeSettingsAuthSafe () {
      try {
        await this.authStore.initAuth()
      } catch (error) {
        console.warn('[Settings] initAuth failed', error)
      }
    },

    toHHMM (hour, minute) {
      const h = Number(hour)
      const m = Number(minute)
      if (!Number.isFinite(h) || !Number.isFinite(m)) return ''
      if (h < 0 || h > 23 || m < 0 || m > 59) return ''
      return `${String(Math.trunc(h)).padStart(2, '0')}:${String(Math.trunc(m)).padStart(2, '0')}`
    },

    async hydratePushPreferenceFromAccount () {
      if (!this.isLoggedIn) return

      const resolved = await resolveAccountPushPreference()
      if (!resolved.ok) {
        console.warn('[Settings] resolveAccountPushPreference failed', resolved.error)
        return
      }

      const pref = resolved?.data?.preference || null
      if (!pref || typeof pref.enabled !== 'boolean') {
        if (resolved?.data?.reason) {
          console.warn('[Settings] account push preference unavailable:', resolved.data.reason)
        }
        return
      }

      const nextEnabled = Boolean(pref.enabled)
      const nextHHMM = this.toHHMM(pref.notify_hour, pref.notify_minute)
      if (nextHHMM) {
        const normalized = this.normalizeTimeValue(nextHHMM)
        this.selectedTimeValue = normalized
        setSavedTime(normalized)
      }

      this.persistDailyPushFlag(nextEnabled)
      this.setDailyPushLocally(nextEnabled)
    },

    async hydratePushPreferenceFromAccountSafe () {
      try {
        await this.hydratePushPreferenceFromAccount()
      } catch (error) {
        console.warn('[Settings] hydratePushPreferenceFromAccount failed', error)
      }
    },

    getPushStatusLabel () {
      if (this.busy) {
        return this.tt('notifications.syncing')
      }
      // A failed enable reverts the toggle to OFF (and a toast already announced the
      // failure), so the resting caption must read "off", not a stale "sync failed"
      // (QA NICE #19). The sync error only applies while push is ON.
      if (!this.dailyPush) {
        return this.tt('notifications.off')
      }
      if (this.pushSyncError) {
        return this.tt('notifications.syncFailed')
      }
      return `${this.tt('notifications.onAt')} ${this.optimalTimeLabel}`
    },

    setDailyPushLocally (next) {
      this.suppressDailyPushWatch = true
      this.dailyPush = Boolean(next)
      this.$nextTick(() => {
        this.suppressDailyPushWatch = false
      })
    },

    normalizeTimeValue (value) {
      const candidate = String(value || '').trim()
      const isValidOption = this.timeOptions.some((opt) => opt.value === candidate)
      if (isValidOption) return candidate
      const hasDefault = this.timeOptions.some((opt) => opt.value === DEFAULT_TIME)
      if (hasDefault) return DEFAULT_TIME
      return this.timeOptions[0]?.value || DEFAULT_TIME
    },

    persistDailyPushFlag (enabled) {
      localStorage.setItem(LS_DAILY_PUSH, JSON.stringify(Boolean(enabled)))
    },

    async syncDailyPushState (enabled, { silentError = false } = {}) {
      if (this.busy) return
      this.busy = true
      this.pushSyncError = false
      try {
        if (enabled) {
          const chosenTime = this.normalizeTimeValue(getSavedTime() || this.selectedTimeValue || DEFAULT_TIME)
          setSavedTime(chosenTime)
          this.selectedTimeValue = chosenTime
          const token = await ensureToken()
          if (!token) {
            this.pushSyncError = true
            this.persistDailyPushFlag(false)
            this.setDailyPushLocally(false)
            if (!silentError) {
              this.$q.notify({ type: 'negative', message: this.tt('notifications.noPermission') })
            }
            return
          }

          const res = await syncRegisterDevice({
            enabled: true,
            timeHHMM: chosenTime,
            locale: this.locale
          })
          if (!res.ok) {
            console.error(res.error)
            this.pushSyncError = true
            if (silentError) {
              this.persistDailyPushFlag(true)
              this.setDailyPushLocally(true)
              return
            }
            this.persistDailyPushFlag(false)
            this.setDailyPushLocally(false)
            if (!silentError) {
              this.$q.notify({ type: 'negative', message: this.tt('notifications.syncFailed') })
            }
            return
          }
          this.persistDailyPushFlag(true)
          this.setDailyPushLocally(true)
        } else {
          this.persistDailyPushFlag(false)
          const res = await syncRegisterDevice({ enabled: false, timeHHMM: '', locale: this.locale })
          if (!res.ok) console.error(res.error)
          this.setDailyPushLocally(false)
        }
      } catch (error) {
        console.error('[Settings] syncDailyPushState failed:', error)
        this.pushSyncError = true
        if (enabled) {
          if (silentError) {
            this.persistDailyPushFlag(true)
            this.setDailyPushLocally(true)
          } else {
            this.persistDailyPushFlag(false)
            this.setDailyPushLocally(false)
            this.$q.notify({ type: 'negative', message: this.tt('notifications.syncFailed') })
          }
        } else {
          this.persistDailyPushFlag(false)
          this.setDailyPushLocally(false)
        }
      } finally {
        this.busy = false
      }
    },

    async syncDailyPushStateSafe (enabled, options = {}) {
      try {
        await this.syncDailyPushState(enabled, options)
      } catch (error) {
        console.warn('[Settings] syncDailyPushStateSafe failed:', error)
      }
    },

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
        console.error(e);
      }
    },

    async hapticLight () {
      if (!Capacitor.isNativePlatform()) return
      if (this.reduceMotion) return
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.error(e);
      }
    },

    hydrateOnboardingInterests () {
      this.onboardingInterests = normalizeOnboardingInterests(readOnboardingInterests())
    },

    onToggleOnboardingInterest (key) {
      const next = [...this.onboardingInterests]
      const index = next.indexOf(key)
      if (index >= 0) next.splice(index, 1)
      else next.push(key)

      const normalized = normalizeOnboardingInterests(next)
      this.onboardingInterests = normalized
      persistOnboardingPreferences(normalized)
      this.hapticSelect()
    },

    onOpenLanguage () {
      this.hapticSelect()
      this.selectedLanguageIndex = Math.max(0, this.languageOptions.findIndex((opt) => opt.value === this.locale))
      this.languageSheet = true
      this.hapticSelectionStart()
      this.$nextTick(() => {
        this.scrollLanguageWheelTo(this.selectedLanguageIndex, false)
      })
    },

    onOpenTime () {
      this.hapticSelect()
      const current = this.selectedTimeValue || DEFAULT_TIME
      this.selectedTimeIndex = Math.max(0, this.timeOptions.findIndex((opt) => opt.value === current))
      this.timeSheet = true
      this.hapticSelectionStart()
      this.$nextTick(() => {
        this.scrollTimeWheelTo(this.selectedTimeIndex, false)
      })
    },

    onToggleHaptic () {
      this.hapticLight()
    },

    async onAccountClickHaptic () {
      await this.hapticSelect()
      await this.onAccountClick()
    },

    selectLanguageHaptic (val) {
      this.hapticSelect()
      this.selectLanguage(val)
    },

    selectLanguage (val) {
      setLocale(val)
      this.languageSheet = false
      this.hapticSelectionEnd()
    },

    async onAccountClick () {
      try {
        void this.authStore.syncSession({ refresh: false })
        const target = this.isLoggedIn ? { name: 'account' } : { name: 'login' }
        await this.$router.push(target)
      } catch (err) {
        console.warn('[Settings] onAccountClick navigation failed:', err)
        try {
          const target = this.isLoggedIn ? { name: 'account' } : { name: 'login' }
          await this.$router.replace(target)
        } catch (e) {
          console.error('[Settings] onAccountClick replace failed:', e)
        }
      }
    },

    onLanguageWheelScroll () {
      const wheel = this.$refs.languageWheelRef
      if (!wheel) return
      const rawIndex = Math.round(wheel.scrollTop / 44)
      const nextIndex = Math.min(this.languageOptions.length - 1, Math.max(0, rawIndex))
      if (nextIndex === this.selectedLanguageIndex) return
      this.selectedLanguageIndex = nextIndex
      const now = Date.now()
      if (now - this.lastLanguageHapticAt > 80) {
        this.hapticSelect()
        this.lastLanguageHapticAt = now
      }
    },

    onLanguageWheelItemTap (index) {
      this.selectedLanguageIndex = index
      this.scrollLanguageWheelTo(index, true)
      this.hapticSelect()
    },

    scrollLanguageWheelTo (index, smooth) {
      const wheel = this.$refs.languageWheelRef
      if (!wheel) return
      const top = index * 44
      wheel.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
    },

    confirmLanguageWheel () {
      const opt = this.languageOptions[this.selectedLanguageIndex]
      if (!opt) return
      this.selectLanguageHaptic(opt.value)
    },

    onTimeWheelScroll () {
      const wheel = this.$refs.timeWheelRef
      if (!wheel) return
      const rawIndex = Math.round(wheel.scrollTop / 44)
      const nextIndex = Math.min(this.timeOptions.length - 1, Math.max(0, rawIndex))
      if (nextIndex === this.selectedTimeIndex) return
      this.selectedTimeIndex = nextIndex
      const now = Date.now()
      if (now - this.lastTimeHapticAt > 80) {
        this.hapticSelect()
        this.lastTimeHapticAt = now
      }
    },

    onTimeWheelItemTap (index) {
      this.selectedTimeIndex = index
      this.scrollTimeWheelTo(index, true)
      this.hapticSelect()
    },

    scrollTimeWheelTo (index, smooth) {
      const wheel = this.$refs.timeWheelRef
      if (!wheel) return
      const top = index * 44
      wheel.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
    },

    async confirmTimeWheel () {
      if (this.busy) return
      const opt = this.timeOptions[this.selectedTimeIndex]
      if (!opt) return
      const prevTime = this.selectedTimeValue || DEFAULT_TIME
      const hhmm = opt.value
      setSavedTime(hhmm)
      this.selectedTimeValue = hhmm || DEFAULT_TIME
      this.pushSyncError = false
      // Drive the spinner + disabled state and make the `if (this.busy) return`
      // guard above effective during the up-to-8s register-device call, so a
      // double-tap can't fire parallel syncs with no feedback (QA #19).
      this.busy = true

      try {
        if (this.dailyPush) {
          const res = await syncRegisterDevice({
            enabled: true,
            timeHHMM: hhmm,
            locale: this.locale
          })
          if (!res.ok) {
            console.error(res.error)
            this.pushSyncError = true
            this.selectedTimeValue = prevTime
            setSavedTime(prevTime)
            this.$q.notify({ type: 'negative', message: this.tt('notifications.syncFailed') })
            return
          }
        }

        this.timeSheet = false
        this.hapticSelect()
        this.hapticSelectionEnd()
      } finally {
        this.busy = false
      }
    },

    async hapticSelectionStart () {
      if (!Capacitor.isNativePlatform()) return
      if (this.reduceMotion) return
      try {
        await Haptics.selectionStart()
      } catch (e) {
        console.error(e)
      }
    },

    async hapticSelectionEnd () {
      if (!Capacitor.isNativePlatform()) return
      if (this.reduceMotion) return
      try {
        await Haptics.selectionEnd()
      } catch (e) {
        console.error(e)
      }
    },

    buildTimeOptions () {
      const start = 0
      const end = 23 * 60 + 30
      const step = 30
      const out = []
      for (let m = start; m <= end; m += step) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0')
        const mm = String(m % 60).padStart(2, '0')
        const value = `${hh}:${mm}`
        out.push({
          value,
          label: this.formatTime(value),
          caption: value
        })
      }
      this.timeOptions = out
      const current = this.normalizeTimeValue(this.selectedTimeValue || getSavedTime() || DEFAULT_TIME)
      this.selectedTimeValue = current
      this.selectedTimeIndex = Math.max(0, this.timeOptions.findIndex((opt) => opt.value === current))
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
.settings-page {
  --settings-ink: rgba(235, 242, 255, 0.94);
  --settings-muted: rgba(208, 219, 238, 0.62);
  --settings-accent: rgba(159, 216, 246, 0.85);
  --settings-glass: rgba(8, 14, 22, 0.6);
  --settings-border: rgba(255, 255, 255, 0.12);
  --oracle-surface-top: rgba(18, 15, 14, 0.68);
  --oracle-surface-bottom: rgba(10, 9, 11, 0.64);
  --oracle-border-strong: rgba(198, 178, 136, 0.2);
  --oracle-text-main: rgba(238, 235, 228, 0.94);
  --oracle-text-muted: rgba(196, 184, 161, 0.72);

  min-height: 100vh !important;
  padding: calc(96px + env(safe-area-inset-top)) 18px calc(24px + env(safe-area-inset-bottom));
  position: relative;
  overflow: hidden;
  color: var(--settings-ink);
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
}

.settings-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: transparent;
}

.settings-content {
  position: relative;
  z-index: 1;
  max-width: 440px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-content--embedded {
  width: 100%;
  max-width: none;
  margin: 0;
}

.settings-hero {
  text-align: center;
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 4px 8px 6px;
}

.settings-kicker {
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 9px;
  color: var(--settings-muted);
}

.settings-title {
  font-size: 20px;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.settings-stack {
  display: grid;
  gap: 14px;
}

.settings-card {
  background: linear-gradient(180deg, rgba(18, 24, 38, 0.82), rgba(10, 14, 22, 0.92));
  border-radius: 12px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.18),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.settings-card__title {
  padding: 12px 16px 4px;
  font-size: 9px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.78);
}

.settings-list {
  padding-bottom: 4px;
}

.settings-item {
  min-height: 50px;
  color: var(--settings-ink);
}

.settings-item:active {
  background: rgba(255, 255, 255, 0.05);
}

.settings-label {
  font-size: 13px;
  letter-spacing: 0.01em;
}

.settings-caption {
  margin-top: 2px;
  font-size: 11px;
  color: rgba(214, 225, 242, 0.56);
}

.settings-side {
  color: rgba(229, 237, 250, 0.78);
  justify-content: flex-end;
  flex-wrap: nowrap;
  max-width: 48%;
  min-width: 0;
  align-items: center;
  gap: 6px;
}

.settings-value {
  color: rgba(224, 234, 248, 0.7);
  font-size: 13px;
  margin-right: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  display: inline-block;
}

.settings-chevron {
  color: rgba(214, 227, 245, 0.36);
  flex: 0 0 auto;
  align-self: center;
}

/*noinspection CssUnusedSymbol*/
.settings-list :deep(.q-item) {
  position: relative;
}

/*noinspection CssUnusedSymbol*/
.settings-list :deep(.q-item__section--side) {
  flex: 0 0 auto;
  min-width: 0;
  flex-direction: row !important;
}

/*noinspection CssUnusedSymbol*/
.settings-list :deep(.q-item:not(:last-child))::after {
  content: '';
  position: absolute;
  left: 56px;
  right: 0;
  bottom: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.04);
}

.settings-icon {
  color: var(--settings-accent);
  filter: none;
}

.settings-chip {
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  line-height: 14px;
  color: rgba(244, 238, 227, 0.94);
  background: linear-gradient(180deg, rgba(34, 48, 76, 0.88), rgba(10, 15, 27, 0.96));
  box-shadow:
    inset 0 1px 0 rgba(222, 234, 255, 0.2),
    inset 0 -1px 0 rgba(86, 118, 176, 0.22);
  display: inline-flex;
  align-items: center;
  height: 22px;
}

.settings-personalization {
  padding: 6px 14px 14px;
  display: grid;
  gap: 10px;
}

.settings-personalization__hint {
  font-size: 12px;
  line-height: 1.4;
  color: rgba(214, 225, 242, 0.7);
}

.settings-personalization__meta {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(224, 234, 248, 0.64);
}

.settings-interest-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.settings-interest-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: linear-gradient(180deg, rgba(15, 22, 36, 0.84), rgba(8, 12, 21, 0.8));
  color: rgba(214, 225, 242, 0.72);
  font-size: 11px;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  transition: transform 160ms ease, border-color 160ms ease, box-shadow 180ms ease, color 160ms ease;
}

.settings-interest-tag:active {
  transform: scale(0.98);
}

.settings-interest-tag--active {
  border-color: rgba(166, 218, 255, 0.72);
  color: #f4f9ff;
  background: linear-gradient(180deg, rgba(43, 67, 109, 0.75), rgba(20, 29, 46, 0.8));
  box-shadow:
    0 0 0 1px rgba(198, 234, 255, 0.16) inset,
    0 8px 16px rgba(29, 62, 104, 0.28);
}

.arcana-toggle {
  --q-toggle-thumb-color: rgba(255, 255, 255, 0.95);
  --q-toggle-track-color: rgba(255, 255, 255, 0.14);
  --q-toggle-track-active-color: rgba(159, 216, 246, 0.58);
  filter: drop-shadow(0 0 12px rgba(159, 216, 246, 0.16));
}

.oracle-actions {
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  border-radius: 22px 22px 0 0;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 24px);
  box-shadow: 0 -16px 46px rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
  pointer-events: auto;
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
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(229, 237, 250, 0.74);
  margin-bottom: 6px;
}

.oracle-actions__footer {
  margin-top: 12px;
  padding: 8px;
  border-radius: 16px;
  border: 1px solid rgba(106, 126, 164, 0.22);
  background:
    linear-gradient(180deg, rgba(9, 13, 21, 0.88), rgba(3, 6, 11, 0.95)),
    linear-gradient(90deg, rgba(83, 112, 170, 0.1), rgba(83, 112, 170, 0));
  box-shadow:
    inset 0 1px 0 rgba(186, 207, 247, 0.08),
    0 10px 24px rgba(0, 0, 0, 0.3);
}


/*noinspection CssUnusedSymbol*/
:deep(.oracle-actions-dialog .q-dialog__backdrop) {
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

/*noinspection CssUnusedSymbol*/
:deep(.oracle-actions-dialog .q-dialog__inner) {
  padding: 0;
  align-items: flex-end;
}

:global(.oracle-actions-dialog--opaque .oracle-actions) {
  background: #050d15;
}

.oracle-actions {
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  border-radius: 22px 22px 0 0;
  padding: 8px 12px calc(env(safe-area-inset-bottom, 0px) + 24px);
  box-shadow: 0 -16px 46px rgba(0, 0, 0, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #ffffff;
  pointer-events: auto;
}

.sheet-handle {
  width: 36px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  margin: 0 auto 10px;
}

.sheet-title {
  text-align: center;
  font-size: 13px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.74);
  margin-bottom: 6px;
}

.oracle-wheel {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  touch-action: pan-y;
}

.oracle-wheel::before,
.oracle-wheel::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  height: 40px;
  z-index: 2;
  pointer-events: none;
}

.oracle-wheel::before {
  top: 0;
}

.oracle-wheel::after {
  bottom: 0;
}

.oracle-wheel__window {
  position: absolute;
  left: 6px;
  right: 6px;
  top: 50%;
  height: 44px;
  transform: translateY(-50%);
  border-radius: 9px;
  border: 1px solid rgba(138, 161, 204, 0.16);
  background: black;
  box-shadow:
    0 14px 30px rgba(0, 0, 0, 0.46),
    inset 0 1px 0 rgba(198, 218, 255, 0.13),
    inset 0 -1px 0 rgba(68, 96, 141, 0.13),
    inset 0 0 14px rgba(56, 82, 124, 0.1);
  backdrop-filter: blur(6px) saturate(118%);
  -webkit-backdrop-filter: blur(6px) saturate(118%);
  z-index: 1;
  pointer-events: none;
}

.oracle-wheel__scroll {
  position: relative;
  height: 152px;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: y mandatory;
  z-index: 3;
  scrollbar-width: none;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
}

.oracle-wheel__spacer {
  height: 54px;
}

.oracle-wheel__item {
  display: block;
  width: 100%;
  min-height: 44px;
  height: 44px;
  padding: 0 10px;
  margin: 0;
  border: 0;
  background: transparent;
  color: rgba(231, 225, 211, 0.7);
  font-size: 15px;
  line-height: 1.2;
  scroll-snap-align: center;
  transition: color 140ms ease, transform 140ms ease;
}

.oracle-wheel__item--active {
  color: rgba(244, 238, 227, 0.97);
  transform: scale(1.01);
}

/*noinspection CssUnusedSymbol*/
.oracle-wheel__item--disabled {
  color: rgba(196, 188, 173, 0.34);
}

.oracle-wheel__scroll::-webkit-scrollbar {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
}
</style>
