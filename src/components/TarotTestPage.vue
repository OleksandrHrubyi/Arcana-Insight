<template>
  <q-page class="q-pa-md" style="max-width:520px;margin:0 auto">
    <q-tabs v-model="tab" class="text-primary" dense>
      <q-tab name="login" label="Увійти"/>
      <q-tab name="signup" label="Зареєструватись"/>
      <q-tab name="reset" label="Reset"/>
    </q-tabs>
    <q-separator/>

    <q-tab-panels v-model="tab" animated>
      <!-- LOGIN -->
      <q-tab-panel name="login">
        <q-form @submit.prevent="onLogin" class="q-gutter-md">
          <q-input v-model="email" type="email" label="Email" filled/>
          <q-input v-model="password" type="password" label="Пароль" filled/>
          <div class="row q-gutter-sm">
            <q-btn :loading="loading" type="submit" label="Увійти" color="primary"/>
            <q-btn flat label="Magic link" @click="onMagicLink"/>
          </div>
        </q-form>
      </q-tab-panel>

      <!-- SIGN UP -->
      <q-tab-panel name="signup">
        <q-form @submit.prevent="onSignup" class="q-gutter-md">
          <q-input v-model="email" type="email" label="Email" filled/>
          <q-input v-model="password" type="password" label="Пароль (мін. 6)" filled/>
          <q-input v-model="displayName" label="Нік (необов’язково)" filled/>
          <q-btn :loading="loading" type="submit" label="Зареєструватись" color="primary"/>
          <div class="text-caption text-grey-7 q-mt-sm">
            Після реєстрації перевір пошту (Confirm email).
          </div>
        </q-form>
      </q-tab-panel>

      <!-- RESET PASSWORD -->
      <q-tab-panel name="reset">
        <q-form @submit.prevent="onReset" class="q-gutter-md">
          <q-input v-model="email" type="email" label="Email" filled/>
          <q-btn :loading="loading" type="submit" label="Надіслати лист для скидання" color="primary"/>
        </q-form>
      </q-tab-panel>
    </q-tab-panels>

    <q-banner v-if="notice" class="bg-green-2 text-green-10 q-mt-md">{{ notice }}</q-banner>
    <q-banner v-if="error"  class="bg-red-2 text-red-10 q-mt-md">{{ error }}</q-banner>

    <div class="q-mt-lg" v-if="user">
      <q-separator/>
      <div class="q-mt-md">Увійшов як: <b>{{ user.email || user.id }}</b></div>
      <q-btn class="q-mt-sm" color="negative" label="Вийти" @click="onLogout"/>
    </div>
  </q-page>
</template>

<script>
import { supabase } from 'src/boot/supabase'

export default {
  name: 'AuthPage',
  data () {
    return {
      tab: 'login',
      email: '',
      password: '',
      displayName: '',
      loading: false,
      error: '',
      notice: '',
      user: null
    }
  },
  async mounted () {
    const { data: { session } } = await supabase.auth.getSession()
    this.user = session?.user || null
    supabase.auth.onAuthStateChange((_event, session) => {
      this.user = session?.user || null
    })
  },
  methods: {
    async onSignup () {
      this._resetMsgs()
      this.loading = true
      try {
        const { data, error } = await supabase.auth.signUp({
          email: this.email,
          password: this.password,
          options: { emailRedirectTo: 'http://localhost:9000/' }
        })
        if (error) throw error
        // створюємо профіль (ідемпотентно)
        if (data.user) {
          await supabase.from('app_users').upsert({ id: data.user.id, display_name: this.displayName || null })
        }
        this.notice = 'Перевір пошту: підтверди email і увійди.'
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.loading = false
      }
    },

    async onLogin () {
      this._resetMsgs()
      this.loading = true
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: this.email, password: this.password })
        if (error) throw error
        // гарантуємо профіль
        await supabase.from('app_users').upsert({ id: data.user.id })
        this.notice = 'Вхід виконано'
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.loading = false
      }
    },

    async onMagicLink () {
      this._resetMsgs()
      this.loading = true
      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: this.email,
          options: { emailRedirectTo: 'http://localhost:9000/' }
        })
        if (error) throw error
        this.notice = 'Надіслав magic-link. Перевір пошту.'
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.loading = false
      }
    },

    async onReset () {
      this._resetMsgs()
      this.loading = true
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(this.email, {
          redirectTo: 'http://localhost:9000/#/reset-password'
        })
        if (error) throw error
        this.notice = 'Надіслав лист для скидання пароля.'
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.loading = false
      }
    },

    async onLogout () {
      this._resetMsgs()
      await supabase.auth.signOut()
      this.notice = 'Вийшов'
    },

    _resetMsgs () {
      this.error = ''; this.notice = ''
    }
  }
}
</script>
