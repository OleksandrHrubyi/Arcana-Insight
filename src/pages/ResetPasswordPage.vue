<template>
  <q-page class="q-pa-md" style="max-width:420px;margin:0 auto">
    <div class="text-h6 q-mb-md">{{ tt('resetPassword.title') }}</div>

    <q-banner v-if="loading" class="bg-blue-2 text-blue-10 q-mb-md">
      {{ tt('resetPassword.checking') }}
    </q-banner>

    <q-form @submit.prevent="onUpdate" class="q-gutter-md">
      <q-input v-model="password" type="password" :label="tt('resetPassword.newPassword')" filled :disable="!sessionReady"/>
      <q-btn :loading="saving" :disable="!sessionReady" type="submit" color="primary" :label="tt('common.save')"/>
    </q-form>

    <q-banner v-if="ok" class="bg-green-2 text-green-10 q-mt-md">{{ tt('resetPassword.updated') }}</q-banner>
    <q-banner v-if="error" class="bg-red-2 text-red-10 q-mt-md">{{ error }}</q-banner>
  </q-page>
</template>

<script>
import { supabase } from 'src/services/supabaseClient'
import { setSessionFromTokens, updateUserPasswordNative } from 'src/services/supabaseNative'
import { t, currentLocale } from 'src/i18n'

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
    return {
      password: '',
      loading: true,
      saving: false,
      error: '',
      ok: false,
      sessionReady: false
    }
  },
  computed: {
    locale () {
      return currentLocale.value || 'en'
    },

    tt () {
      return (key) => t(this.locale, key)
    }
  },
  async mounted () {
    try {
      // 1) спроба PKCE (коли у URL ?code=...)
      let sessionOk = false
      try {
        await Promise.race([
          supabase.auth.exchangeCodeForSession(window.location.href),
          new Promise((_, reject) => setTimeout(() => reject(new Error('exchange timeout')), 6000))
        ])
        sessionOk = true
      } catch {
        sessionOk = false
      }

      // 2) якщо ні — обробляємо implicit (#access_token=...)
      if (!sessionOk) {
        const { access_token, refresh_token } = parseHashParams()
        if (access_token && refresh_token) {
          await setSessionFromTokens({ access_token, refresh_token })
          sessionOk = true
        }
      }

      this.sessionReady = sessionOk
      if (!sessionOk) this.error = this.tt('resetPassword.invalidLink')
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
      const { error } = await updateUserPasswordNative(this.password, 8000)
      if (error) {
        this.error = this.tt('errors.generic')
        return
      }
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
