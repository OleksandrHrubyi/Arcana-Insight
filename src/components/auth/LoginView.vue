<script>
import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import { supabase } from 'boot/supabase.js';

export default {
  name: 'LoginView',

  data() {
    return {
      email: '',
      loading: false,
      errorMessage: ''
    };
  },

  methods: {
    async loginWithApple() {
      console.log('-------333333333333');
      try {
        // 1. Запит до Apple
        const result = await SignInWithApple.authorize({
          clientId: 'com.hrubyi.arcana.supabase', // твій Services ID
          redirectURI: 'https://rgqfkdhzllhmagrcasav.supabase.co/auth/v1/callback',
          scopes: 'email name',
          // state / nonce можна додати пізніше, поки залишимо мінімальний варіант
        });


        const idToken = result?.response?.identityToken;

        if (!idToken) {
          console.error('No identity token from Apple', result);
          return;
        }

        // 2. Логін через Supabase по idToken
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: idToken,
        });
        console.log(data, 'result-------');
        console.log(idToken, 'idToken-------');

        if (error) {
          console.error('Supabase Apple login error', error, error.message, error.status, error.error_description);
          return;
        }

        console.log('Logged in with Apple:', data);

        // 3. Переходимо в апці куди треба (поки що умовно /)
        this.$router.push('/');
      } catch (err) {
        console.error('Apple login failed', err);
      }
    },

    async loginWithGoogle() {
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/', // головна сторінка
          },
        });

        console.log(data, 'data');

        if (error) {
          console.error('Google login error', error);
        }

        // Сюди код майже не доходить, бо браузер піде на Google.
      } catch (err) {
        console.error('Google OAuth error', err);
      }
    },

    loginWithTelegram() {
      console.log('Login with Telegram');
    },
    goBack() {
      this.$router.push('/');
    },
    async onLogin() {

      this.loading = true;
      this.errorMessage = '';

      try {
        const { error } = await supabase.auth.signInWithOtp({
          email: this.email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: null, // важливо для OTP-коду, а не magic link
          },
        });

        if (error) throw error;

        // переходимо на екран вводу коду
        this.$router.push({
          path: '/confirm-code',
          query: {
            email: this.email,
          },
        });
      } catch (e) {
        console.error(e);
        this.errorMessage = e.message || 'Something went wrong. Please try again.';
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<template>
  <div class="login-wrap">
    <div class="login-container">
      <p class="subtitle">Welcome back to Arcana</p>

      <div class="field">
        <span class="field-label q-mb-xs">Email</span>
        <input
          class="field-input"
          v-model="email"
          type="email"
          autocomplete="email"
        />
      </div>

      <div class="q-mb-md">
        <q-btn
          label="Login"
          class="no-auth-btn mono-text"
          no-caps
          flat
          @click="onLogin"
          :loading="loading"
        />
      </div>

      <p class="bottom-text">
        New to Arcana?
        <router-link to="/sign-up" class="link">Sign up</router-link>
      </p>

      <div class="divider">
        <span class="divider-line"></span>
        <span class="divider-text">or continue with</span>
        <span class="divider-line"></span>
      </div>

      <div class="social-buttons">
        <q-btn
          flat
          round
          @click="loginWithGoogle"
          class="social-btn google-btn"
        >
          <svg
            width="24"
            height="24"
            viewBox="-3 0 262 262"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid"
          >
            <path
              d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
              fill="#4285F4"
            />
            <path
              d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
              fill="#34A853"
            />
            <path
              d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
              fill="#FBBC05"
            />
            <path
              d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
              fill="#EB4335"
            />
          </svg>
        </q-btn>

        <q-btn
          class="social-btn apple-btn"
          flat
          round
          @click="loginWithApple"
        >
          <svg
            fill="#fff"
            width="24"
            height="24"
            viewBox="-52.01 0 560.035 560.035"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M380.844 297.529c.787 84.752 74.349 112.955 75.164 113.314-.622 1.988-11.754 40.191-38.756 79.652-23.343 34.117-47.568 68.107-85.731 68.811-37.499.691-49.557-22.236-92.429-22.236-42.859 0-56.256 21.533-91.753 22.928-36.837 1.395-64.889-36.891-88.424-70.883-48.093-69.53-84.846-196.475-35.496-282.165 24.516-42.554 68.328-69.501 115.882-70.192 36.173-.69 70.315 24.336 92.429 24.336 22.1 0 63.59-30.096 107.208-25.676 18.26.76 69.517 7.376 102.429 55.552-2.652 1.644-61.159 35.704-60.523 106.559M310.369 89.418C329.926 65.745 343.089 32.79 339.498 0 311.308 1.133 277.22 18.785 257 42.445c-18.121 20.952-33.991 54.487-29.709 86.628 31.421 2.431 63.52-15.967 83.078-39.655"
            />
          </svg>
        </q-btn>

        <q-btn
          class="social-btn tg-btn"
          flat
          round
          @click="loginWithTelegram"
        >
          <svg
            width="38"
            height="38"
            viewBox="0 0 1000 1000"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                x1="50%"
                y1="0%"
                x2="50%"
                y2="99.2583404%"
                id="tg-grad"
              >
                <stop stop-color="transparent" offset="0%" />
                <stop stop-color="#050608" offset="100%" />
              </linearGradient>
            </defs>
            <circle fill="url(#tg-grad)" cx="500" cy="500" r="500" />
            <path
              d="M226.328419,494.722069 C372.088573,431.216685 469.284839,389.350049 517.917216,369.122161 C656.772535,311.36743 685.625481,301.334815 704.431427,301.003532 C708.567621,300.93067 717.815839,301.955743 723.806446,306.816707 C728.864797,310.92121 730.256552,316.46581 730.922551,320.357329 C731.588551,324.248848 732.417879,333.113828 731.758626,340.040666 C724.234007,419.102486 691.675104,610.964674 675.110982,699.515267 C668.10208,736.984342 654.301336,749.547532 640.940618,750.777006 C611.904684,753.448938 589.856115,731.588035 561.733393,713.153237 C517.726886,684.306416 492.866009,666.349181 450.150074,638.200013 C400.78442,605.66878 432.786119,587.789048 460.919462,558.568563 C468.282091,550.921423 596.21508,434.556479 598.691227,424.000355 C599.00091,422.680135 599.288312,417.758981 596.36474,415.160431 C593.441168,412.561881 589.126229,413.450484 586.012448,414.157198 C581.598758,415.158943 511.297793,461.625274 375.109553,553.556189 C355.154858,567.258623 337.080515,573.934908 320.886524,573.585046 C303.033948,573.199351 268.692754,563.490928 243.163606,555.192408 C211.851067,545.013936 186.964484,539.632504 189.131547,522.346309 C190.260287,513.342589 202.659244,504.134509 226.328419,494.722069 Z"
              fill="#7B83EB"
            />
          </svg>
        </q-btn>
      </div>

      <div class="bottom-btn-back">
        <q-btn
          icon="arrow_back_ios"
          class="back-small-btn mono-text"
          no-caps
          flat
          @click="goBack"
          dense
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.login-wrap {
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

.login-container {
  position: relative;
  height: 100dvh;
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  padding: 74px 16px 24px;
  //background: rgba(8, 12, 19, 0.82);
  display: flex;
  flex-direction: column;
}

.subtitle {
  font-weight: 400;
  font-size: 18px;
  line-height: 26px;
  color: #ffffff;
  margin-bottom: 40px;
}

.field {
  padding-bottom: 4px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-bottom: 1px solid rgba(126, 138, 165, 0.65);
  margin-bottom: 16px;
}

.field-label {
  font-size: 13px;
  line-height: 18px;
  color: #D9D9D9;
}

.field-input {
  padding: 2px 0 0;
  margin: 0;
  border: none;
  outline: none;
  background: transparent;
  font-family: inherit;
  font-size: 16px;
  line-height: 22px;
  color: #e4e8f4;
}

.field-input::placeholder {
  color: #5f6a84;
}

.no-auth-btn {
  height: 50px;
  width: 100%;
  background: linear-gradient(
      98.11deg,
      #101218 14.75%,
      #253042 54.07%,
      #101218 89.76%
  );
  border: 1px solid #8ac7ff;
  border-radius: 16px;
  font-size: 15px;
  line-height: 21px;
  color: #ffffff;
  letter-spacing: 0.02em;
  box-shadow: 0 0 0 rgba(138, 199, 255, 0);
  transition: transform 0.15s ease, opacity 0.15s ease, box-shadow 0.2s ease;

  &:active {
    opacity: 0.9;
    transform: scale(0.98);
  }
}

.bottom-text {
  font-size: 13px;
  color: #8891aa;
  margin-bottom: 24px;
}

.link {
  font-weight: 400;
  font-size: 13px;
  line-height: 20px;
  text-decoration: underline;
  color: #c1d8ff;
}

.divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.divider-line {
  flex: 1;
  height: 1px;
  background: rgba(60, 70, 92, 0.8);
}

.divider-text {
  font-size: 11px;
  color: #6f7a96;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.social-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.social-btn {
  width: 48px;
  height: 48px;
  padding: 0;
  border-radius: 16px;
  background: #050608;
  border: 1px solid rgba(132, 141, 160, 0.7);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.75) inset,
    0 10px 25px rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.12s ease, opacity 0.15s ease, border-color 0.2s ease;

  &:active {
    transform: scale(0.94);
    opacity: 0.9;
  }
}

.google-btn,
.apple-btn,
.tg-btn {
  background: #050608;
}

.bottom-btn-back {
  position: absolute;
  bottom: 50px;
  left: 16px;
}

.back-small-btn {
  color: #7E8AA5;

  background: transparent;
  transition: background 0.2s ease, transform 0.12s ease, border-color 0.2s ease;

  &:active {
    transform: scale(0.96);
  }
}
</style>
