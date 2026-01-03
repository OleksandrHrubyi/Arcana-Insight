<template>
  <div class="settings-wrap">
    <div class="settings-container">
      <p class="settings-title">Settings</p>

      <div class="settings-list">
        <!-- Language -->
        <button class="settings-row" type="button" @click="openLanguage">
          <span class="settings-row-label">Language</span>
          <span class="settings-row-right">
            <span class="settings-row-value">{{ languageLabel }}</span>
            <q-icon name="chevron_right" size="16px" />
          </span>
        </button>

        <div class="settings-divider"></div>

        <!-- Daily push notifications -->
        <div class="settings-row settings-row--static">
          <span class="settings-row-label">Daily push notifications</span>
          <q-toggle
            v-model="dailyPush"
            color="cyan-4"
            keep-color
            class="settings-toggle"
          />
        </div>

        <div class="settings-divider"></div>

        <!-- Optimal time -->
        <button class="settings-row" type="button" @click="openOptimalTime">
          <span class="settings-row-label">Optimal time</span>
          <span class="settings-row-right">
            <span class="settings-row-value">{{ optimalTime }}</span>
            <q-icon name="chevron_right" size="16px" />
          </span>
        </button>

        <div class="settings-divider"></div>

        <!-- account -->
        <button class="settings-row" type="button" @click="openAccount">
          <span class="settings-row-label">Account</span>
          <span class="settings-row-right">
            <span class="settings-row-value">{{ email }}</span>
            <q-icon name="chevron_right" size="16px" />
          </span>
        </button>

        <div class="settings-divider"></div>

        <!-- logout -->
        <q-btn
          no-caps
          class="settings-row"
          @click="onLogout"
          v-if="isLoggedIn"
          :loading="loading"
        >
          <span class="settings-row-label">Log Out</span>
        </q-btn>
      </div>
    </div>

    <!-- Language bottom sheet -->
    <q-dialog v-model="langSheet" position="bottom">
      <div class="sheet">
        <div class="sheet-handle" />

        <div class="sheet-title">Language</div>

        <button
          class="sheet-option"
          type="button"
          @click="selectLocale('en')"
        >
          <span>English</span>
          <q-icon v-if="locale === 'en'" name="check" size="18px" />
        </button>

        <button
          class="sheet-option"
          type="button"
          @click="selectLocale('uk')"
        >
          <span>Українська</span>
          <q-icon v-if="locale === 'uk'" name="check" size="18px" />
        </button>

        <q-btn
          flat
          no-caps
          class="sheet-cancel"
          @click="langSheet = false"
        >
          Cancel
        </q-btn>
      </div>
    </q-dialog>
  </div>
</template>

<script>
import { supabase } from 'boot/supabase.js';
import { useAuthStore } from 'stores/authStore.js';

export default {
  name: 'SettingsComponent',
  emits: ['language-changed'],

  data() {
    return {
      // locale реальне значення яке треба для бекенду
      locale: 'en', // 'en' | 'uk'

      // UI
      langSheet: false,

      dailyPush: true,
      optimalTime: '8.00 AM',
      authStore: useAuthStore(),
      loading: false
    };
  },

  computed: {
    isLoggedIn() {
      return this.authStore.isLoggedIn;
    },

    email() {
      return this.authStore?.userState?.email || 'No Email';
    },

    languageLabel() {
      return this.locale === 'uk' ? 'Українська' : 'English';
    },
  },

  mounted() {
    // підтягуємо з localStorage
    const saved = localStorage.getItem('locale');
    if (saved === 'uk' || saved === 'en') this.locale = saved;
  },

  methods: {
    goBack() {
      this.$router.push('/');
    },

    openLanguage() {
      this.langSheet = true;
    },

    selectLocale(next) {
      if (next !== 'uk' && next !== 'en') return;

      this.locale = next;
      localStorage.setItem('locale', next);

      this.langSheet = false;

      // повідомляємо інші екрани (гороскоп) що мова змінилась
      this.$emit('language-changed', next);
    },

    openOptimalTime() {
      console.log('open optimal time');
    },

    openAccount() {
      console.log('open account');
    },

    async onLogout() {
      try {
        this.loading = true;

        const { data } = await supabase.auth.getSession();
        const session = data.session;

        if (!session) {
          this.authStore.state.user = null;
          this.$router.push('/login');
          return;
        }

        const { error } = await supabase.auth.signOut();

        if (error && error.name !== 'AuthSessionMissingError') {
          console.error('Logout error:', error);
          return;
        }

        this.authStore.state.user = null;
        this.$router.push('/login');
      } catch (e) {
        console.error('Logout error:', e);
        this.$router.push('/login');
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style scoped lang="scss">
.settings-wrap {
  height: 100dvh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: stretch;
  background: linear-gradient(
      180deg,
      #101721 0%,
      #12202b 16.7%,
      #142632 35.58%,
      #12212b 57.35%,
      #080c0f 96.63%
  );
}

.settings-container {
  position: relative;
  height: 100dvh;
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  padding: 74px 16px 24px;
  display: flex;
  flex-direction: column;
}

.settings-title {
  font-weight: 400;
  font-size: 18px;
  line-height: 26px;
  color: #ffffff;
  margin-bottom: 32px;
}

.settings-list {
  border-radius: 18px;
  background: rgba(5, 7, 10, 0.9);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.85),
  0 0 0 1px rgba(255, 255, 255, 0.02);
  padding: 8px 0;
}

.settings-row {
  width: 100%;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  border: none;
  outline: none;
  text-align: left;
  cursor: pointer;
}

.settings-row--static {
  cursor: default;
}

.settings-row-label {
  font-size: 14px;
  line-height: 20px;
  color: #D9D9D9;
}

.settings-row-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.settings-row-value {
  font-size: 13px;
  color: #7E8AA5;
}

.settings-divider {
  height: 1px;
  margin: 0 16px;
  background: rgba(60, 70, 92, 0.65);
}

/* Bottom sheet */
.sheet {
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  background: rgba(5, 7, 10, 0.98);
  border-radius: 18px 18px 0 0;
  padding: 10px 14px 14px;
  box-shadow: 0 -18px 40px rgba(0, 0, 0, 0.65);
}

.sheet-handle {
  width: 38px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.18);
  margin: 6px auto 10px;
}

.sheet-title {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  letter-spacing: 0.02em;
  margin: 6px 4px 10px;
}

.sheet-option {
  width: 100%;
  padding: 14px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid rgba(60, 70, 92, 0.55);
  background: rgba(10, 14, 20, 0.85);
  border-radius: 14px;
  color: #D9D9D9;
  margin-bottom: 10px;
  cursor: pointer;
}

.sheet-option:active {
  transform: translateY(1px);
}

.sheet-cancel {
  width: 100%;
  margin-top: 6px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.9);
}
</style>
