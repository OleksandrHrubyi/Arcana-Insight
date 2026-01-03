<script>
//import { supabase } from 'src/boot/supabase'

import { supabase } from 'boot/supabase.js';
import CodeInput from 'components/ui/CodeInput.vue';

export default {
  name: 'ConfirmEmailCode',
  components: { CodeInput },

  data() {
    return {
      code: '',
      loading: false,
      errorMessage: '',
    };
  },

  watch: {
    code(val) {
      if (val?.length === 6) {
        this.confirm();
      }
    },
  },


  computed: {
    email() {
      return (this.$route.query.email || '').toString();
    },

    name() {
      return (this.$route.query.name || '').toString();
    },
    dateOfBirth() {
      return (this.$route.query.dateOfBirth || '').toString();
    },
    cityOfBirth() {
      return (this.$route.query.cityOfBirth || '').toString();
    },
    country() {
      return (this.$route.query.country || '').toString();
    },


  },

  methods: {
    async resendCode() {

      try {
        this.loading = true;
        const { error } = await supabase.auth.signInWithOtp({
          email: this.email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: null, // важливо для OTP-коду, а не magic link
            data: {
              name: this.name,
              dateOfBirth: this.dateOfBirth,
              cityOfBirth: this.cityOfBirth,
              country: this.country,
            },
          },
        });

        if (error) throw error;

      } catch (e) {
        console.error(e);
        this.errorMessage = e.message || 'Something went wrong. Please try again.';
      } finally {
        this.loading = false;
      }
    },
    goBack() {
      this.$router.push('/');
    },

    async confirm() {
      this.loading = true;
      this.errorMessage = '';

      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: this.email,        // з route.query
          token: this.code,         // твій введений код
          type: 'email',
        });

        if (error) {
          throw error;
        }

        if (!data?.session) {
          throw new Error('No session returned');
        }

        this.$router.push('/'); // або '/home' – куди веде твій "апп-скрін"
      } catch (e) {
        console.error(e);
        this.errorMessage = 'Wrong or expired code. Try again.';
      } finally {
        this.loading = false;
      }
    }

  },
};
</script>


<template>
  <div class="login-wrap">
    <div class="login-container">
      <p class="subtitle q-mb-md">We’ve sent a 6-digit verification code to your email</p>
      <div class="email q-mb-lg">
        {{ email }}
        <router-link to="/login" class="row items-center q-ml-md">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
              stroke="#617C97"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M18.5 2.49998C18.8978 2.10216 19.4374 1.87866 20 1.87866C20.5626 1.87866 21.1022 2.10216 21.5 2.49998C21.8978 2.89781 22.1213 3.43737 22.1213 3.99998C22.1213 4.56259 21.8978 5.10216 21.5 5.49998L12 15L8 16L9 12L18.5 2.49998Z"
              stroke="#617C97"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </router-link>
      </div>
      <CodeInput v-model="code" />

      <q-separator class="separator-color"/>

      <p class="send-code">
        Didn't get your code?
        <q-btn flat no-caps @click="resendCode">
          <span class="sent-code-btn">  Send a new code</span>
        </q-btn>

      </p>
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
  font-size: 16px;
  line-height: 24px;

  text-align: center;

  color: #D9D9D9;


}

.email {
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 24px;
  text-align: center;

  color: #9FD8F6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.separator-color {
  background-color: #7E8AA5;
  margin-bottom: 24px;
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

.send-code {
  font-style: normal;
  font-weight: 400;
  font-size: 16px;
  line-height: 24px;
  text-align: center;
  color: #7E8AA5;


}

.sent-code-btn {
  text-decoration: underline;
}
</style>
