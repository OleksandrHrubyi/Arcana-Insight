<template>
  <q-page class="settings-page">

    <div class="topbar">
      <q-btn flat class="cancel-btn" label="Cancel" @click="$router.back()" />
      <div class="topbar-title">Account Edit</div>
      <q-btn flat class="done-btn" label="Done" :disable="saving" @click="save" />
    </div>

    <q-list class="settings-list">
      <q-item class="settings-item">
        <q-item-section class="custom-section-item">
          <q-item-label>Name</q-item-label>
          <q-input v-model="form.name" dense borderless />
        </q-item-section>
      </q-item>

      <q-item class="settings-item">
        <q-item-section class="custom-section-item">
          <q-item-label>Email</q-item-label>
          <q-input v-model="form.email" dense borderless />
        </q-item-section>
      </q-item>


      <q-item clickable v-ripple class="settings-item" @click="birthDialog = true">
        <q-item-section class="custom-section-item">
          <q-item-label>Date of birth</q-item-label>
        </q-item-section>
        <q-item-section side class="row items-center custom-section-item">
          <div class="settings-value">{{ form.date_of_birth || '—' }}</div>
          <q-icon name="chevron_right" size="18px" />
        </q-item-section>
      </q-item>


      <q-item class="settings-item">
        <q-item-section class="custom-section-item">
          <q-item-label>City of birth</q-item-label>
          <q-input v-model="form.city_of_birth" dense borderless />
        </q-item-section>
      </q-item>


      <q-item clickable v-ripple class="settings-item" @click="countryDialog = true">
        <q-item-section class="custom-section-item">
          <q-item-label>Country</q-item-label>
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
        <div class="text-subtitle1 q-mb-sm">Date of birth</div>
        <q-date v-model="birthModel" mask="YYYY-MM-DD" minimal />
        <div class="row q-mt-md justify-end q-gutter-sm">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn flat label="Clear" @click="birthModel=''; form.date_of_birth=''; birthDialog=false" />
          <q-btn unelevated color="cyan-4" text-color="black" label="Save"
                 @click="form.date_of_birth=birthModel; birthDialog=false" />
        </div>
      </q-card>
    </q-dialog>

    <q-dialog v-model="countryDialog">
      <q-card class="q-pa-md" style="width: 360px; max-width: 92vw; border-radius: 14px;">
        <div class="text-subtitle1 q-mb-sm">Country</div>

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
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn unelevated color="cyan-4" text-color="black" label="Save" v-close-popup />
        </div>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import { supabase } from 'boot/supabase'

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
      countryOptions: [
        { value: 'Ukraine', label: 'Ukraine' },
        { value: 'Germany', label: 'Germany' },
        { value: 'Poland', label: 'Poland' },
        { value: 'Netherlands', label: 'Netherlands' },
        { value: 'USA', label: 'USA' }
      ]
    }
  },

  computed: {
    countryLabel () {
      return this.form.country || '—'
    }
  },

  async mounted () {
    const { data } = await supabase.auth.getUser()
    const user = data?.user
    if (!user) {
      this.$router.replace('/auth')
      return
    }
    this.userId = user.id

    const { data: row } = await supabase
    .from('app_users')
    .select('name,email,date_of_birth,city_of_birth,country')
    .eq('id', user.id)
    .maybeSingle()

    if (row) {
      this.form = { ...this.form, ...row }
      this.birthModel = this.form.date_of_birth || ''
    } else {
      // email можемо підставити з auth
      this.form.email = user.email || ''
    }
  },

  methods: {
    async save () {
      if (!this.userId) return
      this.saving = true
      try {
        // Зберігаємо в app_users (id = auth.uid())
        const payload = {
          id: this.userId,
          name: this.form.name || null,
          email: this.form.email || null,
          date_of_birth: this.form.date_of_birth || null,
          city_of_birth: this.form.city_of_birth || null,
          country: this.form.country || null
        }

        const { error } = await supabase
        .from('app_users')
        .upsert(payload, { onConflict: 'id' })

        if (error) {
          console.log(error)
          this.$q.notify({ type: 'negative', message: 'Save failed' })
          return
        }

        this.$router.back()
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
  background: #0B131B;
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

.settings-sep {
  opacity: 0.12;
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
