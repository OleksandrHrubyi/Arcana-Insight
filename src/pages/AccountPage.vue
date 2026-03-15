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

      <section class="account-panel account-panel--status">
        <div class="account-status">
          <div>
            <div class="account-status__title">{{ tt('accountPage.zodiacTitle') }}</div>
            <div class="account-status__subtitle">{{ zodiacLabel }}</div>
          </div>
          <div class="account-badge" :class="{ 'account-badge--muted': !zodiacLabel }">
            {{ zodiacBadge }}
          </div>
        </div>
      </section>

      <section class="account-panel">
        <button type="button" class="account-row account-row--button" @click="openEdit('name')">
          <div class="account-label">{{ tt('fields.name') }}</div>
          <div class="account-value">{{ profile.name || '—' }}</div>
          <q-icon name="edit" size="16px" class="account-row__icon" />
        </button>

        <button type="button" class="account-row account-row--button" @click="openEdit('email')">
          <div class="account-label">{{ tt('fields.email') }}</div>
          <div class="account-value">{{ profile.email || userEmail || '—' }}</div>
          <q-icon name="edit" size="16px" class="account-row__icon" />
        </button>

        <button type="button" class="account-row account-row--button" @click="onOpenDateSheet">
          <div class="account-label">{{ tt('fields.dateOfBirth') }}</div>
          <div class="account-value">{{ profile.date_of_birth || '—' }}</div>
          <q-icon name="edit" size="16px" class="account-row__icon" />
        </button>
      </section>

      <div class="account-actions">
        <q-btn
          flat
          class="ghost-btn"
          :label="tt('logout')"
          no-caps
          @click="logout"
        />
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
        <button type="button" class="oracle-actions__ok" @click="saveEdit">
          {{ tt('common.save') }}
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
          <div ref="monthWheelRef" class="oracle-wheel__scroll" @scroll.passive="onMonthWheelScroll">
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
        <button type="button" class="oracle-actions__ok" @click="confirmDateWheel">
          {{ tt('common.save') }}
        </button>
      </div>
    </section>
  </q-dialog>
</template>

<script>
import { defineComponent } from 'vue'
import { supabase } from 'boot/supabase'
import { t, currentLocale } from 'src/i18n'
import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

export default defineComponent({
  name: 'AccountPage',

  data () {
    return {
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
      dateSheet: false,
      dayOptions: [],
      monthOptions: [],
      yearOptions: [],
      selectedDayIndex: 0,
      selectedMonthIndex: 0,
      selectedYearIndex: 0,
      lastDateHapticAt: 0,
      reduceMotion: false
    }
  },

  computed: {
    locale () {
      return currentLocale.value || 'en'
    },

    tt () {
      return (key) => t(this.locale, key)
    },

    editTitle () {
      const map = {
        name: 'fields.name',
        email: 'fields.email',
        date_of_birth: 'fields.dateOfBirth',
      }
      return this.tt(map[this.editField] || 'account')
    },

    editPlaceholder () {
      if (this.editField === 'date_of_birth') return 'DD.MM.YYYY'
      return ''
    },

    editType () {
      if (this.editField === 'email') return 'email'
      return 'text'
    },

    editInputMode () {
      if (this.editField === 'email') return 'email'
      return 'text'
    },

    editAutocomplete () {
      if (this.editField === 'email') return 'email'
      if (this.editField === 'name') return 'name'
      return 'off'
    },

    zodiacKey () {
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

    zodiacLabel () {
      if (!this.zodiacKey) return ''
      return this.tt(`zodiac.${this.zodiacKey}`)
    },

    zodiacBadge () {
      return this.zodiacLabel || this.tt('accountPage.zodiacEmpty')
    }
  },

  watch: {
    editOpen () {
      this.syncBottomNav()
    },
    dateSheet () {
      this.syncBottomNav()
    }
  },

  async mounted () {
    const { data } = await supabase.auth.getUser()
    const user = data?.user
    if (!user) {
      this.$router.replace('/login')
      return
    }
    this.userId = user.id
    this.userEmail = user.email || ''

    const { data: row } = await supabase
      .from('app_users')
      .select('name,email,date_of_birth')
      .eq('id', user.id)
      .maybeSingle()

    if (row) {
      this.profile = { ...this.profile, ...row }
    }
    this.buildDateOptions()
  },

  beforeUnmount () {
    document.body.classList.remove('hide-bottom-nav')
  },

  methods: {
    syncBottomNav () {
      const open = this.editOpen || this.dateSheet
      document.body.classList.toggle('hide-bottom-nav', open)
    },

    async hapticTap () {
      if (!Capacitor.isNativePlatform()) return
      if (this.reduceMotion) return
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.error(e)
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

    async hapticSelect () {
      if (!Capacitor.isNativePlatform()) return
      if (this.reduceMotion) return
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.error(e)
      }
    },

    openEdit (field) {
      this.hapticTap()
      this.editField = field
      this.draftValue = this.profile[field] || (field === 'email' ? this.userEmail : '')
      this.editError = ''
      this.editOpen = true
    },

    async saveEdit () {
      if (!this.userId || !this.editField) return
      const value = (this.draftValue || '').trim()
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      if (this.editField === 'name' && value.length < 2) {
        this.editError = this.tt('errors.invalidName')
        return
      }
      if (this.editField === 'email' && !emailPattern.test(value)) {
        this.editError = this.tt('errors.invalidEmail')
        return
      }
      if (this.editField === 'date_of_birth' && value) {
        const ok = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value)
        if (!ok) {
          this.editError = this.tt('errors.invalidDate')
          return
        }
      }

      try {
        await this.hapticTap()
        const payload = { id: this.userId, [this.editField]: value || null }
        const { error } = await supabase
          .from('app_users')
          .upsert(payload, { onConflict: 'id' })
        if (error) {
          console.error(error)
          this.$q?.notify({ type: 'negative', message: this.tt('errors.saveFailed') })
          return
        }
        this.profile = { ...this.profile, [this.editField]: value }
        if (this.editField === 'email') this.userEmail = value
        this.editOpen = false
      } catch (err) {
        console.error(err)
      }
    },

    async logout () {
      await this.hapticTap()
      await supabase.auth.signOut()
      this.$router.replace('/menu')
    },

    async onBack () {
      await this.hapticTap()
      this.$router.back()
    },

    onOpenDateSheet () {
      this.hapticTap()
      this.syncDateSelectionFromValue()
      this.dateSheet = true
      this.hapticSelectionStart()
      this.$nextTick(() => {
        this.scrollDateWheels(false)
      })
    },

    confirmDateWheel () {
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

    async saveDateOfBirth (value) {
      if (!this.userId) return
      try {
        const payload = { id: this.userId, date_of_birth: value || null }
        const { error } = await supabase
          .from('app_users')
          .upsert(payload, { onConflict: 'id' })
        if (error) {
          console.error(error)
          this.$q?.notify({ type: 'negative', message: this.tt('errors.saveFailed') })
          return
        }
        this.profile = { ...this.profile, date_of_birth: value }
      } catch (err) {
        console.error(err)
      }
    },

    buildDateOptions () {
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

    syncDateSelectionFromValue () {
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
      this.selectedYearIndex = Math.max(0, this.yearOptions.findIndex((y) => y === year))
      this.selectedMonthIndex = Math.max(0, this.monthOptions.findIndex((m) => m.value === month))
      const maxDay = this.getDaysInMonth(year, month)
      day = Math.min(day, maxDay)
      this.selectedDayIndex = Math.max(0, this.dayOptions.findIndex((d) => d === day))
    },

    getDaysInMonth (year, month) {
      return new Date(year, month, 0).getDate()
    },

    onDayWheelScroll () {
      const wheel = this.$refs.dayWheelRef
      if (!wheel) return
      const nextIndex = Math.min(this.dayOptions.length - 1, Math.max(0, Math.round(wheel.scrollTop / 44)))
      if (nextIndex === this.selectedDayIndex) return
      this.selectedDayIndex = nextIndex
      this.hapticSelectThrottled()
    },

    onMonthWheelScroll () {
      const wheel = this.$refs.monthWheelRef
      if (!wheel) return
      const nextIndex = Math.min(this.monthOptions.length - 1, Math.max(0, Math.round(wheel.scrollTop / 44)))
      if (nextIndex === this.selectedMonthIndex) return
      this.selectedMonthIndex = nextIndex
      this.syncDayForMonth()
      this.hapticSelectThrottled()
    },

    onYearWheelScroll () {
      const wheel = this.$refs.yearWheelRef
      if (!wheel) return
      const nextIndex = Math.min(this.yearOptions.length - 1, Math.max(0, Math.round(wheel.scrollTop / 44)))
      if (nextIndex === this.selectedYearIndex) return
      this.selectedYearIndex = nextIndex
      this.syncDayForMonth()
      this.hapticSelectThrottled()
    },

    onDayWheelItemTap (index) {
      this.selectedDayIndex = index
      this.scrollWheel(this.$refs.dayWheelRef, index, true)
      this.hapticSelect()
    },

    onMonthWheelItemTap (index) {
      this.selectedMonthIndex = index
      this.syncDayForMonth()
      this.scrollWheel(this.$refs.monthWheelRef, index, true)
      this.hapticSelect()
    },

    onYearWheelItemTap (index) {
      this.selectedYearIndex = index
      this.syncDayForMonth()
      this.scrollWheel(this.$refs.yearWheelRef, index, true)
      this.hapticSelect()
    },

    syncDayForMonth () {
      const year = this.yearOptions[this.selectedYearIndex] || new Date().getFullYear()
      const month = this.monthOptions[this.selectedMonthIndex]?.value || 1
      const maxDay = this.getDaysInMonth(year, month)
      if (this.dayOptions[this.selectedDayIndex] > maxDay) {
        this.selectedDayIndex = maxDay - 1
        this.scrollWheel(this.$refs.dayWheelRef, this.selectedDayIndex, true)
      }
    },

    scrollDateWheels (smooth) {
      this.scrollWheel(this.$refs.dayWheelRef, this.selectedDayIndex, smooth)
      this.scrollWheel(this.$refs.monthWheelRef, this.selectedMonthIndex, smooth)
      this.scrollWheel(this.$refs.yearWheelRef, this.selectedYearIndex, smooth)
    },

    scrollWheel (wheel, index, smooth) {
      if (!wheel) return
      const top = index * 44
      wheel.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
    },

    hapticSelectThrottled () {
      const now = Date.now()
      if (now - this.lastDateHapticAt < 80) return
      this.lastDateHapticAt = now
      this.hapticSelect()
    }
  }
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
  max-width: 440px;
  margin: 0 auto;
  padding: calc(96px + env(safe-area-inset-top)) 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  justify-content: flex-start;
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
  border-radius: 12px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow:
    0 8px 18px rgba(0, 0, 0, 0.18),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  padding: 12px;
  display: grid;
  gap: 6px;
}

.account-panel--status {
  padding: 14px 16px;
  min-height: 70px;
}

.account-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.account-status__title {
  font-size: 12px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.68);
}

.account-status__subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: rgba(224, 234, 251, 0.75);
}

.account-badge {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  background: rgba(12, 18, 28, 0.7);
  font-size: 10px;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(214, 225, 242, 0.75);
}

.account-badge--muted {
  color: rgba(214, 225, 242, 0.45);
  border-color: rgba(156, 184, 235, 0.2);
}

.account-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) auto;
  gap: 10px;
  align-items: center;
  padding: 8px 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.account-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.account-row--button {
  background: transparent;
  border: 0;
  text-align: left;
  cursor: pointer;
}

.account-label {
  font-size: 12px;
  line-height: 18px;
  color: rgba(214, 225, 242, 0.78);
}

.account-value {
  color: rgba(224, 234, 248, 0.7);
  font-size: 13px;
  text-align: right;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-row__icon {
  color: rgba(214, 225, 242, 0.55);
}

.account-actions {
  display: grid;
  gap: 10px;
}

.ghost-btn {
  height: 48px;
  width: 100%;
  border-radius: 12px;
  border: 1px solid rgba(255, 122, 122, 0.32);
  color: rgba(255, 138, 138, 0.9);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: rgba(32, 12, 16, 0.6);
}

.oracle-actions {
  width: 100vw;
  max-width: 100vw;
  margin: 0 auto;
  margin-bottom: 0;
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
  font-size: 11px;
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

.oracle-actions__ok {
  width: 100%;
  min-height: 48px;
  border-radius: 12px;
  border: 1px solid rgba(156, 184, 235, 0.36);
  padding: 12px 14px;
  background: linear-gradient(180deg, rgba(28, 38, 58, 0.92), rgba(10, 15, 27, 0.98));
  color: #e9edf4;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
  box-shadow: none;
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
  overflow-x: hidden;
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

.oracle-wheel__scroll::-webkit-scrollbar {
  display: none;
}
</style>
