<template>
  <div class="account-wrap">
    <div class="account-container">
      <header class="auth-hero auth-hero--with-back">
        <button type="button" class="account-back" @click="onBack">
          <q-icon name="chevron_left" size="18px" />
        </button>
        <div class="auth-hero__text">
          <div class="auth-title">{{ tt('account') }}</div>
          <div class="auth-kicker">{{ tt('accountPage.subtitle') }}</div>
        </div>
      </header>

      <section v-if="zodiacLabel" class="account-panel account-panel--status">
        <div class="account-status">
          <div class="account-status__content">
            <div class="account-status__title">{{ tt('accountPage.zodiacTitle') }}</div>
            <div class="account-status__subtitle">{{ zodiacLabel }}</div>
            <div v-if="hasMysticBadge" class="account-status__reward-badge">
              <span class="account-status__reward-icon">✦</span>
              <span>{{ mysticBadgeLabel }}</span>
            </div>
          </div>
          <div class="account-badge">
            {{ zodiacEmoji }}
          </div>
        </div>
      </section>

      <section class="account-panel account-panel--fields">
        <div class="account-panel__title">{{ tt('accountPage.profileInfo') }}</div>

        <button type="button" class="account-row account-row--button" @click="openEdit('name')">
          <span class="account-row__content">
            <span class="account-label">{{ tt('fields.name') }}</span>
            <span class="account-value">{{ profile.name || '—' }}</span>
          </span>
          <q-icon name="edit" size="18px" class="account-row__icon" />
        </button>

        <div class="account-row">
          <span class="account-row__content">
            <span class="account-label">{{ tt('fields.email') }}</span>
            <span class="account-value">{{ profile.email || userEmail || '—' }}</span>
            <span class="account-row__hint">{{ tt('accountPage.emailNote') }}</span>
          </span>
        </div>

        <button type="button" class="account-row account-row--button" @click="onOpenDateSheet">
          <span class="account-row__content">
            <span class="account-label">{{ tt('fields.dateOfBirth') }}</span>
            <span class="account-value">{{ profile.date_of_birth || '—' }}</span>
          </span>
          <q-icon name="edit" size="18px" class="account-row__icon" />
        </button>
      </section>

      <div class="account-actions">
        <q-btn flat class="account-btn account-btn--logout" no-caps :loading="logoutLoading" :disable="logoutLoading" @click="logout">
          <q-icon name="logout" size="18px" class="account-btn__icon" />
          <span>{{ tt('logout') }}</span>
        </q-btn>
      </div>

      <div class="account-danger-zone">
        <div class="account-danger-zone__title">{{ tt('accountPage.dangerZone') }}</div>
        <q-btn flat class="account-btn account-btn--danger" no-caps @click="openDeleteDialog">
          <q-icon name="delete_outline" size="18px" class="account-btn__icon" />
          <span>{{ tt('accountPage.deleteAccount') }}</span>
        </q-btn>
      </div>
    </div>
  </div>

  <q-dialog
    v-model="editOpen"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
    :transition-duration="440"
    class="oracle-actions-dialog"
  >
    <section class="oracle-actions">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-title">{{ editTitle }}</div>

      <div class="account-edit-card">
        <input
          v-model="draftValue"
          class="account-edit-input"
          :placeholder="editPlaceholder"
          :type="editType"
          :inputmode="editInputMode"
          :autocomplete="editAutocomplete"
          @input="editError = ''"
        />
        <div class="account-edit-error" :class="{ 'account-edit-error--visible': !!editError }">
          {{ editError }}
        </div>
      </div>

      <div class="oracle-actions__footer">
        <button type="button" class="arcana-btn arcana-btn--secondary" :disabled="editSaving" @click="saveEdit">
          <q-spinner-dots v-if="editSaving" size="18px" color="white" />
          <span v-else>{{ tt('common.save') }}</span>
        </button>
      </div>
    </section>
  </q-dialog>

  <q-dialog
    v-model="dateSheet"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
    :transition-duration="440"
    class="oracle-actions-dialog"
  >
    <section class="oracle-actions">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-title">{{ tt('fields.dateOfBirth') }}</div>

      <div class="oracle-wheel-grid">
        <div class="oracle-wheel">
          <div class="oracle-wheel__window" aria-hidden="true"></div>
          <div ref="dayWheelRef" class="oracle-wheel__scroll" @scroll.passive="onDayWheelScroll">
            <div class="oracle-wheel__spacer"></div>
            <button
              v-for="(day, index) in dayOptions"
              :key="`day-${day}`"
              type="button"
              class="oracle-wheel__item"
              :class="{ 'oracle-wheel__item--active': index === selectedDayIndex }"
              @click="onDayWheelItemTap(index)"
            >
              {{ String(day).padStart(2, '0') }}
            </button>
            <div class="oracle-wheel__spacer"></div>
          </div>
        </div>

        <div class="oracle-wheel">
          <div class="oracle-wheel__window" aria-hidden="true"></div>
          <div
            ref="monthWheelRef"
            class="oracle-wheel__scroll"
            @scroll.passive="onMonthWheelScroll"
          >
            <div class="oracle-wheel__spacer"></div>
            <button
              v-for="(month, index) in monthOptions"
              :key="`month-${month.value}`"
              type="button"
              class="oracle-wheel__item"
              :class="{ 'oracle-wheel__item--active': index === selectedMonthIndex }"
              @click="onMonthWheelItemTap(index)"
            >
              {{ month.label }}
            </button>
            <div class="oracle-wheel__spacer"></div>
          </div>
        </div>

        <div class="oracle-wheel">
          <div class="oracle-wheel__window" aria-hidden="true"></div>
          <div ref="yearWheelRef" class="oracle-wheel__scroll" @scroll.passive="onYearWheelScroll">
            <div class="oracle-wheel__spacer"></div>
            <button
              v-for="(year, index) in yearOptions"
              :key="`year-${year}`"
              type="button"
              class="oracle-wheel__item"
              :class="{ 'oracle-wheel__item--active': index === selectedYearIndex }"
              @click="onYearWheelItemTap(index)"
            >
              {{ year }}
            </button>
            <div class="oracle-wheel__spacer"></div>
          </div>
        </div>
      </div>

      <div class="oracle-actions__footer">
        <button type="button" class="arcana-btn arcana-btn--secondary" :disabled="dateSaving" @click="confirmDateWheel">
          <q-spinner-dots v-if="dateSaving" size="18px" color="white" />
          <span v-else>{{ tt('common.save') }}</span>
        </button>
      </div>
    </section>
  </q-dialog>

  <DeleteAccountDialog
    v-model="deleteDialog"
    :loading="deletingAccount"
    @confirm="deleteAccount"
    @cancel="closeDeleteDialog"
  />
</template>

<script>
import { defineComponent } from 'vue'
import { supabase, clearStoredSession } from 'src/services/supabaseClient'
import { selectAppUser, invokeFunction } from 'src/services/supabaseNative'
import { t, currentLocale } from 'src/i18n'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import DeleteAccountDialog from 'src/components/DeleteAccountDialog.vue'
import { useAuthStore } from 'stores/authStore.js'
import { Preferences } from '@capacitor/preferences'
import { useAppEpoch } from 'stores/appEpoch'
import { resolveAccountBootstrapUser } from 'src/helpers/accountBootstrapCore.js'
import { ensureRitualRewardInventory } from 'src/helpers/ritualRewardsBackend.js'
import { isRitualRewardActive, RITUAL_REWARD_KEYS } from 'src/helpers/ritualRewardInventory'

export default defineComponent({
  name: 'AccountPage',

  components: {
    DeleteAccountDialog,
  },

  data() {
    return {
      authStore: useAuthStore(),
      appEpoch: useAppEpoch(),
      profile: {
        name: '',
        email: '',
        date_of_birth: '',
      },
      userEmail: '',
      userId: '',
      editOpen: false,
      editField: '',
      editError: '',
      draftValue: '',
      editSaving: false,
      deleteDialog: false,
      deletingAccount: false,
      logoutLoading: false,
      dateSheet: false,
      dateSaving: false,
      dayOptions: [],
      monthOptions: [],
      yearOptions: [],
      selectedDayIndex: 0,
      selectedMonthIndex: 0,
      selectedYearIndex: 0,
      lastDateHapticAt: 0,
      reduceMotion: false,
      profileLoaded: false,
      rewardAccessTick: 0,
    }
  },

  computed: {
    locale() {
      return currentLocale.value || 'en'
    },

    tt() {
      return (key) => t(this.locale, key)
    },

    editTitle() {
      const map = {
        name: 'fields.name',
        date_of_birth: 'fields.dateOfBirth',
      }
      return this.tt(map[this.editField] || 'account')
    },

    editPlaceholder() {
      if (this.editField === 'date_of_birth') return 'DD.MM.YYYY'
      return ''
    },

    editType() {
      return 'text'
    },

    editInputMode() {
      return 'text'
    },

    editAutocomplete() {
      if (this.editField === 'name') return 'name'
      return 'off'
    },

    zodiacKey() {
      const raw = this.profile.date_of_birth || ''
      const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(raw)
      if (!match) return ''
      const day = parseInt(match[1], 10)
      const month = parseInt(match[2], 10)
      if (!day || !month) return ''
      if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries'
      if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus'
      if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini'
      if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer'
      if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo'
      if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo'
      if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra'
      if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio'
      if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius'
      if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn'
      if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius'
      if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return 'pisces'
      return ''
    },

    zodiacLabel() {
      if (!this.zodiacKey) return ''
      return this.tt(`zodiac.${this.zodiacKey}`)
    },

    zodiacBadge() {
      return this.zodiacLabel || this.tt('accountPage.zodiacEmpty')
    },

    zodiacEmoji() {
      const emojiMap = {
        aries: '♈',
        taurus: '♉',
        gemini: '♊',
        cancer: '♋',
        leo: '♌',
        virgo: '♍',
        libra: '♎',
        scorpio: '♏',
        sagittarius: '♐',
        capricorn: '♑',
        aquarius: '♒',
        pisces: '♓',
      }
      return emojiMap[this.zodiacKey] || '✦'
    },

    mysticBadgeLabel() {
      return this.locale === 'uk' ? 'Містичний ритуал активний' : 'Mystic ritual badge active'
    },

    hasMysticBadge() {
      const now = this.rewardAccessTick ? new Date() : new Date()
      return isRitualRewardActive({
        rewardKey: RITUAL_REWARD_KEYS.mysticBadge,
        userId: String(this.userId || this.authStore.state.user?.id || '').trim(),
        now,
      })
    },
  },

  watch: {
    editOpen() {
      this.syncBottomNav()
    },
    dateSheet() {
      this.syncBottomNav()
    },
  },

  mounted() {
    void this.initializeAccountPageSafe()
  },

  beforeUnmount() {
    document.body.classList.remove('hide-bottom-nav')
  },

  methods: {
    async refreshRitualRewardAccess(force = false) {
      const userId = String(this.userId || this.authStore.state.user?.id || '').trim()
      await ensureRitualRewardInventory({
        userId,
        force,
      })
      this.rewardAccessTick = Date.now()
    },

    async initializeAccountPage() {
      const { user, error } = await resolveAccountBootstrapUser({
        initialUser: this.authStore.state.user || null,
        syncSession: (payload) => this.authStore.syncSession(payload),
        getCurrentUser: () => this.authStore.state.user || null,
      })

      if (error) {
        console.warn('[AccountPage] session bootstrap failed:', error)
      }

      if (!user) {
        this.$router.replace('/login')
        return
      }

      this.userId = user.id
      this.userEmail = user.email || ''
      this.profile.name = this.normalizeProfileName(
        this.profile.name || user.user_metadata?.name || user.user_metadata?.full_name || '',
      )
      await this.refreshRitualRewardAccess(false)

      const cached = await this.loadCachedProfile()
      if (cached) {
        this.profile = { ...this.profile, ...cached }
      }

      await this.loadProfile(user)
      this.buildDateOptions()
      await this.refreshRitualRewardAccess(true)
    },

    async initializeAccountPageSafe() {
      try {
        await this.initializeAccountPage()
      } catch (error) {
        this.profileLoaded = true
        console.warn('[AccountPage] init failed:', error)
      }
    },

    normalizeProfileName(value) {
      if (typeof value !== 'string') return ''
      return value.trim()
    },

    async backfillMissingName(rowName, fallbackName) {
      const normalizedRowName = this.normalizeProfileName(rowName)
      const normalizedFallbackName = this.normalizeProfileName(fallbackName)
      if (normalizedRowName || !normalizedFallbackName) return

      try {
        await this.authStore.queueProfileUpdate({ name: normalizedFallbackName })
        await Promise.race([
          this.authStore.flushProfileQueue(),
          new Promise((resolve) => setTimeout(resolve, 8000)),
        ])
      } catch (err) {
        console.warn('[AccountPage] name backfill failed:', err)
      }
    },

    async loadCachedProfile() {
      try {
        const { value } = await Preferences.get({ key: 'profile_cache_v1' })
        if (!value) return null
        return JSON.parse(value)
      } catch {
        return null
      }
    },

    async saveCachedProfile(payload) {
      try {
        await Preferences.set({
          key: 'profile_cache_v1',
          value: JSON.stringify(payload),
        })
      } catch {
        // ignore cache errors
      }
    },

    async loadProfile(user) {
      const currentUser = user || this.authStore.state.user || null

      this.profileLoaded = false

      try {
        const { data: row, error } = await selectAppUser(this.userId, 6000)
        if (error) {
          console.warn('[AccountPage] profile load failed, retrying:', error)
        }
        if (row) {
          const rowName = this.normalizeProfileName(row.name || '')
          const fallbackName = this.normalizeProfileName(
            this.profile.name || currentUser?.user_metadata?.name || currentUser?.user_metadata?.full_name || '',
          )
          const fallbackEmail = this.userEmail || currentUser?.email || ''
          this.profile = {
            ...this.profile,
            ...row,
            name: rowName || fallbackName,
            email: row.email || fallbackEmail,
          }
          await this.saveCachedProfile(this.profile)
          await this.backfillMissingName(rowName, fallbackName)
        }
        this.profileLoaded = true
        if (!error) return
      } catch (err) {
        console.warn('[AccountPage] profile load crashed, retrying:', err)
      }

      // Retry once after syncing session
      await this.authStore.syncSession({ refresh: false })
      const refreshedUser = this.authStore.state.user || currentUser
      try {
        const { data: row, error } = await selectAppUser(this.userId, 6000)
        if (error) {
          console.warn('[AccountPage] profile load retry failed:', error)
          this.profileLoaded = true
          return
        }
        if (row) {
          const rowName = this.normalizeProfileName(row.name || '')
          const fallbackName = this.normalizeProfileName(
            this.profile.name || refreshedUser?.user_metadata?.name || refreshedUser?.user_metadata?.full_name || '',
          )
          const fallbackEmail = this.userEmail || refreshedUser?.email || ''
          this.profile = {
            ...this.profile,
            ...row,
            name: rowName || fallbackName,
            email: row.email || fallbackEmail,
          }
          await this.saveCachedProfile(this.profile)
          await this.backfillMissingName(rowName, fallbackName)
        }
        this.profileLoaded = true
      } catch (err) {
        console.warn('[AccountPage] profile load failed окончательно:', err)
        this.profileLoaded = true
      }
    },

    async ensureUser() {
      if (this.userId) return true

      let user = this.authStore.state.user
      if (!user) {
        await this.authStore.syncSession({ refresh: false })
        user = this.authStore.state.user
      }

      if (!user) {
        this.$router.replace('/login')
        return false
      }

      this.userId = user.id
      this.userEmail = user.email || ''
      return true
    },

    syncBottomNav() {
      const open = this.editOpen || this.dateSheet
      document.body.classList.toggle('hide-bottom-nav', open)
    },

    async hapticTap() {
      if (!Capacitor.isNativePlatform()) return
      if (this.reduceMotion) return

      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.error(e)
      }
    },

    async hapticSelectionStart() {
      if (!Capacitor.isNativePlatform()) return
      if (this.reduceMotion) return

      try {
        await Haptics.selectionStart()
      } catch (e) {
        console.error(e)
      }
    },

    async hapticSelectionEnd() {
      if (!Capacitor.isNativePlatform()) return
      if (this.reduceMotion) return

      try {
        await Haptics.selectionEnd()
      } catch (e) {
        console.error(e)
      }
    },

    async hapticSelect() {
      if (!Capacitor.isNativePlatform()) return
      if (this.reduceMotion) return

      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.error(e)
      }
    },

    openEdit(field) {
      this.hapticTap()
      this.editField = field
      this.draftValue = this.profile[field] || ''
      this.editError = ''
      this.editOpen = true
    },

    async saveEdit() {
      if (!this.editField) return
      if (!await this.ensureUser()) {
        this.editError = this.tt('errors.generic')
        return
      }

      if (this.editSaving) return
      this.editSaving = true
      const value = (this.draftValue || '').trim()

      if (this.editField === 'name' && value.length < 2) {
        this.editError = this.tt('errors.invalidName')
        this.editSaving = false
        return
      }

      if (this.editField === 'date_of_birth' && value) {
        const ok = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value)
        if (!ok) {
          this.editError = this.tt('errors.invalidDate')
          this.editSaving = false
          return
        }
      }

      try {
        await this.hapticTap()

        this.profile = { ...this.profile, [this.editField]: value }
        await this.saveCachedProfile(this.profile)
        this.editOpen = false
        await this.authStore.queueProfileUpdate({ [this.editField]: value || null })
        await Promise.race([
          this.authStore.flushProfileQueue(),
          new Promise((resolve) => setTimeout(resolve, 8000)),
        ])

        this.profileLoaded = true
      } catch (err) {
        console.error('[AccountPage] saveEdit unexpected error:', err)
        this.editError = this.tt('errors.saveFailed')
      } finally {
        this.editSaving = false
      }
    },

    async logout() {
      if (this.logoutLoading) return
      this.logoutLoading = true
      await this.hapticTap()
      try {
        const signOut = supabase.auth.signOut({ scope: 'local' })
        await Promise.race([
          signOut,
          new Promise((_, reject) => setTimeout(() => reject(new Error('signOut timeout')), 1500)),
        ])
      } catch (err) {
        console.warn('[AccountPage] signOut failed:', err)
      } finally {
        await clearStoredSession()
        this.authStore.clearUser()
        this.$router.replace('/menu')
        this.logoutLoading = false
      }
    },

    async openDeleteDialog() {
      await this.hapticTap()
      this.deleteDialog = true
    },

    async closeDeleteDialog() {
      if (this.deletingAccount) return
      await this.hapticTap()
      this.deleteDialog = false
    },

    async deleteAccount() {
      if (this.deletingAccount) return
      await this.hapticTap()
      this.deletingAccount = true

      try {
        await this.ensureUser()
        const elapsed = Date.now() - (this.appEpoch.lastBackgroundAt.value || 0)
        if (elapsed < 5000) {
          await new Promise((r) => setTimeout(r, 5000 - elapsed))
        }

        const attemptDelete = async (attempt) => {
          try {
            const res = await invokeFunction('delete-account', { confirm: true }, 8000)
            if (res.error) throw res.error
            return res
          } catch (err) {
            if (attempt >= 1) throw err
            await new Promise((r) => setTimeout(r, 1500))
            return attemptDelete(attempt + 1)
          }
        }

        const result = await attemptDelete(0)

        if (result.error) {
          return
        }
        if (result.data?.error) {
          return
        }

        const runCleanup = async () => {
          try {
            localStorage.removeItem('push_token')
            localStorage.removeItem('daily_push_enabled')
            localStorage.removeItem('daily_push_time')
            await Preferences.remove({ key: 'profile_cache_v1' })
            await this.authStore.clearProfileQueue()
            await clearStoredSession()
          } catch {
            // ignore cleanup errors
          }

          void supabase.auth.signOut({ scope: 'local' }).catch(() => {
            // ignore sign out errors
          })
        }

        this.deleteDialog = false
        this.authStore.clearUser()

        try {
          await this.$router.replace('/menu')
        } catch {
          // ignore navigation errors
        }

        // Let cleanup continue in background.
        void runCleanup()
      } catch {
        // ignore delete errors (UI is already handled)
      } finally {
        this.deletingAccount = false
        this.deleteDialog = false
      }
    },

    async onBack() {
      await this.hapticTap()
      this.$router.back()
    },

    onOpenDateSheet() {
      this.hapticTap()
      this.syncDateSelectionFromValue()
      this.dateSheet = true
      this.hapticSelectionStart()

      this.$nextTick(() => {
        this.scrollDateWheels(false)
      })
    },

    confirmDateWheel() {
      const day = this.dayOptions[this.selectedDayIndex] || 1
      const month = this.monthOptions[this.selectedMonthIndex]?.value || 1
      const year = this.yearOptions[this.selectedYearIndex] || new Date().getFullYear()

      const dd = String(day).padStart(2, '0')
      const mm = String(month).padStart(2, '0')
      const value = `${dd}.${mm}.${year}`

      this.saveDateOfBirth(value)
      this.dateSheet = false
      this.hapticSelectionEnd()
    },

    async saveDateOfBirth(value) {
      if (!await this.ensureUser()) {
        return
      }

      try {
        if (this.dateSaving) return
        this.dateSaving = true
        this.profile = { ...this.profile, date_of_birth: value }
        await this.saveCachedProfile(this.profile)
        await this.authStore.queueProfileUpdate({ date_of_birth: value || null })
        await Promise.race([
          this.authStore.flushProfileQueue(),
          new Promise((resolve) => setTimeout(resolve, 8000)),
        ])
      } catch (err) {
        console.error(err)
      } finally {
        this.dateSaving = false
      }
    },

    buildDateOptions() {
      const currentYear = new Date().getFullYear()
      const minYear = currentYear - 120
      const maxYear = currentYear

      this.yearOptions = []
      for (let y = maxYear; y >= minYear; y -= 1) {
        this.yearOptions.push(y)
      }

      this.monthOptions = Array.from({ length: 12 }, (_, idx) => {
        const value = idx + 1
        const date = new Date(2000, idx, 1)
        const label = new Intl.DateTimeFormat(this.locale === 'uk' ? 'uk-UA' : 'en-US', {
          month: 'short',
        }).format(date)

        return { value, label }
      })

      this.dayOptions = Array.from({ length: 31 }, (_, idx) => idx + 1)
      this.syncDateSelectionFromValue()
    },

    syncDateSelectionFromValue() {
      const fallbackYear = this.yearOptions[0] || new Date().getFullYear()
      const raw = this.profile.date_of_birth || ''

      let day = 1
      let month = 1
      let year = fallbackYear

      const parts = raw.includes('.') ? raw.split('.') : raw.split('-')

      if (parts.length === 3) {
        const [a, b, c] = parts.map((p) => parseInt(p, 10))

        if (raw.includes('.')) {
          day = a || day
          month = b || month
          year = c || year
        } else {
          year = a || year
          month = b || month
          day = c || day
        }
      }

      this.selectedYearIndex = Math.max(
        0,
        this.yearOptions.findIndex((y) => y === year),
      )

      this.selectedMonthIndex = Math.max(
        0,
        this.monthOptions.findIndex((m) => m.value === month),
      )

      const maxDay = this.getDaysInMonth(year, month)
      day = Math.min(day, maxDay)

      this.selectedDayIndex = Math.max(
        0,
        this.dayOptions.findIndex((d) => d === day),
      )
    },

    getDaysInMonth(year, month) {
      return new Date(year, month, 0).getDate()
    },

    onDayWheelScroll() {
      const wheel = this.$refs.dayWheelRef
      if (!wheel) return

      const nextIndex = Math.min(
        this.dayOptions.length - 1,
        Math.max(0, Math.round(wheel.scrollTop / 44)),
      )

      if (nextIndex === this.selectedDayIndex) return

      this.selectedDayIndex = nextIndex
      this.hapticSelectThrottled()
    },

    onMonthWheelScroll() {
      const wheel = this.$refs.monthWheelRef
      if (!wheel) return

      const nextIndex = Math.min(
        this.monthOptions.length - 1,
        Math.max(0, Math.round(wheel.scrollTop / 44)),
      )

      if (nextIndex === this.selectedMonthIndex) return

      this.selectedMonthIndex = nextIndex
      this.syncDayForMonth()
      this.hapticSelectThrottled()
    },

    onYearWheelScroll() {
      const wheel = this.$refs.yearWheelRef
      if (!wheel) return

      const nextIndex = Math.min(
        this.yearOptions.length - 1,
        Math.max(0, Math.round(wheel.scrollTop / 44)),
      )

      if (nextIndex === this.selectedYearIndex) return

      this.selectedYearIndex = nextIndex
      this.syncDayForMonth()
      this.hapticSelectThrottled()
    },

    onDayWheelItemTap(index) {
      this.selectedDayIndex = index
      this.scrollWheel(this.$refs.dayWheelRef, index, true)
      this.hapticSelect()
    },

    onMonthWheelItemTap(index) {
      this.selectedMonthIndex = index
      this.syncDayForMonth()
      this.scrollWheel(this.$refs.monthWheelRef, index, true)
      this.hapticSelect()
    },

    onYearWheelItemTap(index) {
      this.selectedYearIndex = index
      this.syncDayForMonth()
      this.scrollWheel(this.$refs.yearWheelRef, index, true)
      this.hapticSelect()
    },

    syncDayForMonth() {
      const year = this.yearOptions[this.selectedYearIndex] || new Date().getFullYear()
      const month = this.monthOptions[this.selectedMonthIndex]?.value || 1
      const maxDay = this.getDaysInMonth(year, month)

      if (this.dayOptions[this.selectedDayIndex] > maxDay) {
        this.selectedDayIndex = maxDay - 1
        this.scrollWheel(this.$refs.dayWheelRef, this.selectedDayIndex, true)
      }
    },

    scrollDateWheels(smooth) {
      this.scrollWheel(this.$refs.dayWheelRef, this.selectedDayIndex, smooth)
      this.scrollWheel(this.$refs.monthWheelRef, this.selectedMonthIndex, smooth)
      this.scrollWheel(this.$refs.yearWheelRef, this.selectedYearIndex, smooth)
    },

    scrollWheel(wheel, index, smooth) {
      if (!wheel) return

      const top = index * 44
      wheel.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
    },

    hapticSelectThrottled() {
      const now = Date.now()
      if (now - this.lastDateHapticAt < 80) return

      this.lastDateHapticAt = now
      this.hapticSelect()
    },
  },
})
</script>

<style scoped>
.account-wrap {
  height: 100dvh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: stretch;
  background: radial-gradient(120% 60% at 50% 0%, #0a2233 0%, #07131d 40%, #050d15 100%);
}

.account-container {
  position: relative;
  height: 100dvh;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  padding: calc(80px + env(safe-area-inset-top)) 16px calc(90px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;
  justify-content: flex-start;
  overflow-y: auto;
}

.auth-hero {
  text-align: center;
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 4px 8px 6px;
}

.auth-hero--with-back {
  position: relative;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 12px;
}

.account-back {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 14, 22, 0.7);
  color: rgba(214, 225, 242, 0.8);
  display: grid;
  place-items: center;
}

.auth-hero__text {
  text-align: center;
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 0 44px;
}

.auth-title {
  font-size: 20px;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: #ffffff;
}

.auth-kicker {
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 9px;
  color: rgba(208, 219, 238, 0.62);
}

.account-panel {
  background: linear-gradient(180deg, rgba(18, 24, 38, 0.82), rgba(10, 14, 22, 0.92));
  border-radius: 16px;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.3),
    inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  padding: 16px;
  display: grid;
  gap: 2px;
}

.account-panel--status {
  padding: 18px 20px;
  background: linear-gradient(135deg, rgba(18, 24, 38, 0.9), rgba(12, 18, 28, 0.95));
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.account-panel--fields {
  gap: 0;
}

.account-panel__title {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.56);
  padding: 0 4px 12px;
}

.account-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.account-status__content {
  flex: 1;
}

.account-status__title {
  font-size: 13px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.64);
  margin-bottom: 6px;
}

.account-status__subtitle {
  font-size: 16px;
  font-weight: 600;
  color: rgba(234, 244, 255, 0.92);
}

.account-status__reward-badge {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(151, 210, 255, 0.36);
  background:
    radial-gradient(120% 120% at 0% 0%, rgba(112, 217, 255, 0.26), rgba(112, 217, 255, 0) 60%),
    linear-gradient(140deg, rgba(20, 33, 52, 0.86), rgba(10, 18, 30, 0.92));
  padding: 4px 10px;
  font-size: 12px;
  color: rgba(223, 240, 255, 0.92);
}

.account-status__reward-icon {
  color: rgba(153, 228, 255, 0.95);
}

.account-badge {
  width: 56px;
  height: 56px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  border: 2px solid rgba(156, 184, 235, 0.24);
  background: linear-gradient(135deg, rgba(28, 38, 58, 0.6), rgba(12, 18, 28, 0.8));
  font-size: 28px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.account-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  transition: background 0.2s ease;
}

.account-row:last-child {
  border-bottom: 0;
}

.account-row--button {
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
  width: 100%;
}

.account-row--button:hover {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
}

.account-row--button:active {
  background: rgba(255, 255, 255, 0.04);
}

.account-row__content {
  flex: 1;
  min-width: 0;
  display: grid;
  gap: 5px;
}

.account-label {
  font-size: 13px;
  letter-spacing: 0.08em;
  color: rgba(214, 225, 242, 0.68);
}

.account-value {
  color: rgba(234, 244, 255, 0.88);
  font-size: 14px;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-row__hint {
  font-size: 12px;
  line-height: 1.4;
  color: rgba(214, 225, 242, 0.5);
  white-space: normal;
}

.account-row__icon {
  color: rgba(214, 225, 242, 0.45);
  flex-shrink: 0;
}

.account-actions {
  display: grid;
  gap: 12px;
  margin-top: auto;
  padding-top: 8px;
}

.account-danger-zone {
  display: grid;
  gap: 8px;
}

.account-danger-zone__title {
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255, 120, 120, 0.7);
  padding: 0 4px;
}

.account-btn {
  min-height: 50px;
  width: 100%;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.account-btn__icon {
  opacity: 0.9;
}

.account-btn--logout {
  border-color: var(--btn-secondary-border);
  color: var(--btn-secondary-text);
  background: var(--btn-secondary-bg);
}

.account-btn--logout:hover {
  background: var(--btn-secondary-bg);
}

.account-btn--danger {
  border: 1px solid rgba(255, 96, 96, 0.4);
  color: rgba(255, 120, 120, 0.92);
  background: linear-gradient(180deg, rgba(42, 8, 12, 0.5), rgba(32, 6, 10, 0.7));
}

.account-btn--danger:hover {
  background: linear-gradient(180deg, rgba(52, 10, 14, 0.6), rgba(38, 7, 11, 0.8));
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
  background: #050d15;
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
  margin-bottom: 10px;
}

.account-edit-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 14, 22, 0.72);
  padding: 12px 14px;
  display: grid;
  gap: 8px;
}

.account-edit-input {
  width: 100%;
  padding: 6px 2px 4px;
  margin: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 15px;
  line-height: 22px;
  color: rgba(224, 234, 248, 0.9);
}

.account-edit-input::placeholder {
  color: rgba(140, 152, 176, 0.6);
}

.account-edit-error {
  min-height: 16px;
  font-size: 12px;
  line-height: 14px;
  color: rgba(255, 168, 168, 0.9);
  opacity: 0;
  transition: opacity 160ms ease;
}

.account-edit-error--visible {
  opacity: 1;
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


.oracle-wheel-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
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
  transition:
    color 140ms ease,
    transform 140ms ease;
}

.oracle-wheel__item--active {
  color: rgba(244, 238, 227, 0.97);
  transform: scale(1.01);
}

.oracle-wheel__scroll::-webkit-scrollbar {
  display: none;
}
</style>
