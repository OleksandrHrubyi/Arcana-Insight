<template>
  <q-page class="q-pa-md" style="max-width:420px;margin:0 auto">
    <div class="text-h6 q-mb-md">{{ tt('resetPassword.title') }}</div>

    <q-banner v-if="loading" class="bg-blue-2 text-blue-10 q-mb-md">
      {{ tt('resetPassword.checking') }}
    </q-banner>

    <!-- Success: confirm + an explicit way forward (no dead-end — the route hides
         the bottom nav, so a CTA is the only escape). -->
    <template v-else-if="ok">
      <q-banner class="bg-green-2 text-green-10 q-mb-md">{{ tt('resetPassword.updated') }}</q-banner>
      <q-btn no-caps class="reset-submit-btn" :label="tt('auth.loginAction')" @click="goToLogin"/>
    </template>

    <!-- Invalid / expired link: the form is unusable, so show the error AND a way
         out (the banner copy promises "request a new one" — make it actionable). -->
    <template v-else-if="!sessionReady">
      <q-banner v-if="error" class="bg-red-2 text-red-10 q-mb-md">{{ error }}</q-banner>
      <q-btn no-caps class="reset-submit-btn" :label="tt('auth.loginAction')" @click="goToLogin"/>
    </template>

    <!-- Ready: the actual reset form. -->
    <template v-else>
      <q-form @submit.prevent="onUpdate" class="q-gutter-md">
        <q-input v-model="password" type="password" :label="tt('resetPassword.newPassword')" filled/>
        <q-btn :loading="saving" type="submit" no-caps class="reset-submit-btn" :label="tt('common.save')"/>
      </q-form>
      <q-banner v-if="error" class="bg-red-2 text-red-10 q-mt-md">{{ error }}</q-banner>
    </template>
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
  mounted () {
    void this.initializeResetPasswordSafe()
  },
  methods: {
    async initializeResetPassword () {
      // 1) спроба PKCE (коли у URL ?code=...). exchangeCodeForSession РЕЗОЛВИТЬСЯ
      // з { error } для невалідного/відсутнього коду (не кидає), тож успіхом
      // вважаємо лише реальну сесію — інакше показували б форму на битому лінку.
      let sessionOk = false
      try {
        const { data, error } = await Promise.race([
          supabase.auth.exchangeCodeForSession(window.location.href),
          new Promise((_, reject) => setTimeout(() => reject(new Error('exchange timeout')), 6000))
        ])
        sessionOk = !error && Boolean(data?.session)
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
    },

    async initializeResetPasswordSafe () {
      try {
        await this.initializeResetPassword()
      } catch (e) {
        this.error = e.message || String(e)
      } finally {
        this.loading = false
      }
    },

    async onUpdate () {
      if (this.saving) return
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
    },

    goToLogin () {
      this.$router.push('/login')
    }
  }
}
</script>

<style scoped>
.reset-submit-btn {
  width: 100%;
  min-height: var(--btn-min-height);
  border-radius: var(--btn-radius);
  background: var(--btn-primary-bg);
  border: 1px solid var(--btn-primary-border);
  color: var(--btn-primary-text);
  font-weight: 600;
}
</style>
