<template>
  <q-page class="settings-page">

    <div class="topbar">
      <q-btn flat class="cancel-btn" :label="tt('common.cancel')" @click="onBack" />
      <div class="topbar-title">{{ tt('accountEdit.title') }}</div>
      <q-btn flat class="done-btn" :label="tt('done')" :disable="saving" :loading="saving" @click="save" />
    </div>

    <q-list class="settings-list">
      <q-item class="settings-item">
        <q-item-section class="custom-section-item">
          <q-item-label>{{ tt('fields.name') }}</q-item-label>
          <q-input v-model="form.name" dense borderless />
        </q-item-section>
      </q-item>

      <q-item class="settings-item">
        <q-item-section class="custom-section-item">
          <q-item-label>{{ tt('fields.email') }}</q-item-label>
          <q-input v-model="form.email" dense borderless />
        </q-item-section>
      </q-item>


      <q-item clickable v-ripple class="settings-item" @click="openBirthDialog">
        <q-item-section class="custom-section-item">
          <q-item-label>{{ tt('fields.dateOfBirth') }}</q-item-label>
        </q-item-section>
        <q-item-section side class="row items-center custom-section-item">
          <div class="settings-value">{{ form.date_of_birth || '—' }}</div>
          <q-icon name="chevron_right" size="18px" />
        </q-item-section>
      </q-item>


      <q-item class="settings-item">
        <q-item-section class="custom-section-item">
          <q-item-label>{{ tt('fields.cityOfBirth') }}</q-item-label>
          <q-input v-model="form.city_of_birth" dense borderless />
        </q-item-section>
      </q-item>


      <q-item clickable v-ripple class="settings-item" @click="openCountryDialog">
        <q-item-section class="custom-section-item">
          <q-item-label>{{ tt('fields.country') }}</q-item-label>
        </q-item-section>
        <q-item-section side class="row items-center custom-section-item">
          <div class="settings-value">{{ countryLabel }}</div>
          <div>
            <q-icon name="chevron_right" size="18px" />
          </div>
        </q-item-section>
      </q-item>
    </q-list>

    <!-- dialogs -->
    <q-dialog v-model="birthDialog">
      <q-card class="q-pa-md" style="width: 360px; max-width: 92vw; border-radius: 14px;">
        <div class="text-subtitle1 q-mb-sm">{{ tt('fields.dateOfBirth') }}</div>
        <q-date v-model="birthModel" mask="YYYY-MM-DD" minimal />
        <div class="row q-mt-md justify-end q-gutter-sm">
          <q-btn flat :label="tt('common.cancel')" v-close-popup @click="hapticTap" />
          <q-btn flat :label="tt('clear')" @click="clearBirth" />
          <q-btn unelevated color="cyan-4" text-color="black" :label="tt('common.save')"
                 @click="applyBirth" />
        </div>
      </q-card>
    </q-dialog>

    <q-dialog v-model="countryDialog">
      <q-card class="q-pa-md" style="width: 360px; max-width: 92vw; border-radius: 14px;">
        <div class="text-subtitle1 q-mb-sm">{{ tt('fields.country') }}</div>

        <q-select
          v-model="form.country"
          :options="countryOptions"
          option-label="label"
          option-value="value"
          emit-value
          map-options
          dense
          outlined
        />

        <div class="row q-mt-md justify-end q-gutter-sm">
          <q-btn flat :label="tt('common.cancel')" v-close-popup @click="hapticTap" />
          <q-btn unelevated color="cyan-4" text-color="black" :label="tt('common.save')" v-close-popup @click="hapticTap" />
        </div>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import { getUserNative, selectAppUser, upsertAppUser } from 'src/services/supabaseNative'
import { t, currentLocale } from 'src/i18n'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

export default defineComponent({
  name: 'AccountEdit',

  data () {
    return {
      saving: false,
      userId: '',
      form: {
        name: '',
        email: '',
        date_of_birth: '',
        city_of_birth: '',
        country: ''
      },
      birthDialog: false,
      birthModel: '',
      countryDialog: false,
      countryOptionsRaw: ['Ukraine', 'Germany', 'Poland', 'Netherlands', 'USA']
    }
  },

  computed: {
    locale () {
      return currentLocale.value || 'en'
    },

    tt () {
      return (key) => t(this.locale, key)
    },

    countryOptions () {
      const map = {
        Ukraine: 'countries.ukraine',
        Germany: 'countries.germany',
        Poland: 'countries.poland',
        Netherlands: 'countries.netherlands',
        USA: 'countries.usa'
      }
      return this.countryOptionsRaw.map((value) => ({
        value,
        label: this.tt(map[value]) || value
      }))
    },

    countryLabel () {
      const map = {
        Ukraine: 'countries.ukraine',
        Germany: 'countries.germany',
        Poland: 'countries.poland',
        Netherlands: 'countries.netherlands',
        USA: 'countries.usa'
      }
      if (!this.form.country) return '—'
      return this.tt(map[this.form.country]) || this.form.country
    }
  },

  mounted () {
    void this.initializeAccountEditSafe()
  },

  methods: {
    async initializeAccountEdit () {
      const { data: user } = await getUserNative(8000)
      if (!user) {
        this.$router.replace('/auth')
        return
      }
      this.userId = user.id

      const { data: row } = await selectAppUser(
        user.id,
        8000,
        'name,email,date_of_birth,city_of_birth,country'
      )

      if (row) {
        this.form = { ...this.form, ...row }
        this.birthModel = this.form.date_of_birth || ''
      } else {
        // email можемо підставити з auth
        this.form.email = user.email || ''
      }
    },

    async initializeAccountEditSafe () {
      try {
        await this.initializeAccountEdit()
      } catch (error) {
        console.warn('[AccountEdit] init failed', error)
      }
    },

    async hapticTap () {
      if (!Capacitor.isNativePlatform()) return
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (e) {
        console.error(e)
      }
    },

    async onBack () {
      await this.hapticTap()
      this.$router.back()
    },

    async openBirthDialog () {
      await this.hapticTap()
      this.birthDialog = true
    },

    async openCountryDialog () {
      await this.hapticTap()
      this.countryDialog = true
    },

    async clearBirth () {
      await this.hapticTap()
      this.birthModel = ''
      this.form.date_of_birth = ''
      this.birthDialog = false
    },

    async applyBirth () {
      await this.hapticTap()
      this.form.date_of_birth = this.birthModel
      this.birthDialog = false
    },

    async save () {
      if (!this.userId) return
      this.saving = true
      try {
        await this.hapticTap()
        const normalizedName = (this.form.name || '').trim()
        const normalizedEmail = (this.form.email || '').trim()
        const normalizedDateOfBirth = (this.form.date_of_birth || '').trim()
        const normalizedCity = (this.form.city_of_birth || '').trim()
        const normalizedCountry = (this.form.country || '').trim()

        // Зберігаємо в app_users (id = auth.uid())
        const payload = {
          id: this.userId,
          email: normalizedEmail || null,
          date_of_birth: normalizedDateOfBirth || null,
          city_of_birth: normalizedCity || null,
          country: normalizedCountry || null
        }
        if (normalizedName) payload.name = normalizedName

        const { error } = await upsertAppUser(payload, 8000)

        if (error) {
          console.error(error)
          this.$q.notify({ type: 'negative', message: this.tt('errors.saveFailed') })
          return
        }

        this.$router.back()
      } catch (error) {
        console.error('[AccountEdit] save failed:', error)
        this.$q.notify({ type: 'negative', message: this.tt('errors.saveFailed') })
      } finally {
        this.saving = false
      }
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

.cancel-btn {
  color: rgba(255,255,255,.7);
  text-transform: none;
}
.done-btn {
  color: rgba(159,216,246,.95);
  text-transform: none;
}

.settings-list {
  overflow: hidden;
}

.settings-item {
  min-height: 54px;
  border-bottom: 1px solid #142632;
}

.settings-value {
  color: rgba(255,255,255,.6);
}

.custom-section-item {
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  justify-content: flex-start;
  align-items: center;
}

</style>

<style lang="scss">
.q-item__label {
  display: flex;
  align-items: center;
  margin-right: 12px;
}
</style>
