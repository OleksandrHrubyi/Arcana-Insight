<template>
  <q-page class="q-pa-md" style="max-width:420px;margin:0 auto">
    <div class="text-h6 q-mb-md">Новий пароль</div>

    <q-banner v-if="loading" class="bg-blue-2 text-blue-10 q-mb-md">
      Перевіряю посилання…
    </q-banner>

    <q-form @submit.prevent="onUpdate" class="q-gutter-md">
      <q-input v-model="password" type="password" label="Новий пароль" filled :disable="!sessionReady"/>
      <q-btn :loading="saving" :disable="!sessionReady" type="submit" color="primary" label="ЗБЕРЕГТИ"/>
    </q-form>

    <q-banner v-if="ok" class="bg-green-2 text-green-10 q-mt-md">Пароль оновлено</q-banner>
    <q-banner v-if="error" class="bg-red-2 text-red-10 q-mt-md">{{ error }}</q-banner>
  </q-page>
</template>

<script>
import { supabase } from 'src/boot/supabase'

function parseHashParams() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  const params = new URLSearchParams(hash)
  // інколи токени приходять як фрагмент після /#/reset-password#access_token=...
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
    type: params.get('type')
  }
}

export default {
  name: 'ResetPasswordPage',
  data () {
    return { password: '', loading: true, saving: false, error: '', ok: false, sessionReady: false }
  },
  async mounted () {
    try {
      // 1) спроба PKCE (коли у URL ?code=...)
      let sessionOk = false
      try {
        await supabase.auth.exchangeCodeForSession(window.location.href)
        const { data: { session } } = await supabase.auth.getSession()
        sessionOk = !!session?.access_token
      } catch {
        console.log('error');
      }

      // 2) якщо ні — обробляємо implicit (#access_token=...)
      if (!sessionOk) {
        const { access_token, refresh_token } = parseHashParams()
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) throw error
          sessionOk = true
        }
      }

      this.sessionReady = sessionOk
      if (!sessionOk) this.error = 'Посилання недійсне або прострочене. Запроси нове.'
    } catch (e) {
      this.error = e.message || String(e)
    } finally {
      this.loading = false
    }
  },
  methods: {
    async onUpdate () {
      this.error = ''; this.ok = false; this.saving = true
      try {
        const { error } = await supabase.auth.updateUser({ password: this.password })
        if (error) throw error
        this.ok = true
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.saving = false
      }
    }
  }
}
</script>
