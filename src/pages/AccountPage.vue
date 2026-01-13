<template>
  <q-page class="settings-page">

    <div class="topbar">
      <q-btn flat round icon="chevron_left" @click="$router.back()" />
      <div class="topbar-title">Account</div>
      <q-btn flat class="edit-btn" label="Edit" @click="goEdit" />
    </div>

    <q-list class="settings-list">
      <q-item class="settings-item">
        <q-item-section class="section-1"><q-item-label>Name</q-item-label></q-item-section>
        <q-item-section side class="section-1"><div class="settings-value">{{ profile.name || '—' }}</div></q-item-section>
      </q-item>


      <q-item class="settings-item">
        <q-item-section class="section-1"><q-item-label>Email</q-item-label></q-item-section>
        <q-item-section side class="section-1"><div class="settings-value">{{ profile.email || userEmail || '—' }}</div></q-item-section>
      </q-item>

      <q-item class="settings-item">
        <q-item-section class="section-1"><q-item-label>Date of birth</q-item-label></q-item-section>
        <q-item-section side class="section-1"><div class="settings-value">{{ profile.date_of_birth || '—' }}</div></q-item-section>
      </q-item>

      <q-item class="settings-item">
        <q-item-section class="section-1"><q-item-label>City of birth</q-item-label></q-item-section>
        <q-item-section side class="section-1"><div class="settings-value">{{ profile.city_of_birth || '—' }}</div></q-item-section>
      </q-item>

      <q-item class="settings-item">
        <q-item-section class="section-1"><q-item-label>Country</q-item-label></q-item-section>
        <q-item-section side class="section-1"><div class="settings-value">{{ profile.country || '—' }}</div></q-item-section>
      </q-item>
    </q-list>

    <q-btn flat class="logout" label="Logout" @click="logout" />

  </q-page>
</template>

<script>
import { defineComponent } from 'vue'
import { supabase } from 'boot/supabase'

export default defineComponent({
  name: 'AccountPage',

  data () {
    return {
      profile: {
        name: '',
        email: '',
        date_of_birth: '',
        city_of_birth: '',
        country: ''
      },
      userEmail: ''
    }
  },

  async mounted () {
    const { data } = await supabase.auth.getUser()
    const user = data?.user
    if (!user) {
      this.$router.replace('/login')
      return
    }
    this.userEmail = user.email || ''

    const { data: row } = await supabase
    .from('app_users')
    .select('name,email,date_of_birth,city_of_birth,country')
    .eq('id', user.id)
    .maybeSingle()

    if (row) this.profile = { ...this.profile, ...row }
  },

  methods: {
    goEdit () {
      this.$router.push('/account/edit')
    },

    async logout () {
      await supabase.auth.signOut()
      this.$router.replace('/settings')
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

.edit-btn {
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

.logout {
  margin-top: 14px;
  color: #ff5a5a;
  text-transform: none;
}

.section-1 {
  justify-content: center;
}
</style>
