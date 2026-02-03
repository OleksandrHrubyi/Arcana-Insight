// src/i18n/index.js

import { ref } from 'vue'

const DEFAULT_LOCALE = 'en'
export const currentLocale = ref(localStorage.getItem('locale') || DEFAULT_LOCALE)

export function setLocale(locale) {
  const next = locale || DEFAULT_LOCALE
  currentLocale.value = next
  localStorage.setItem('locale', next)
  window.dispatchEvent(new CustomEvent('locale-changed', { detail: next }))
}

export function getLocale() {
  return currentLocale.value || DEFAULT_LOCALE
}

export const messages = {
  en: {
    appName: 'Arcana Insight',

    // Horoscope
    dailyHoroscope: 'DAILY HOROSCOPE',
    horoscopeFor: 'HOROSCOPE FOR',

    love: 'Love',
    career: 'Career',
    energy: 'Energy',
    theme: 'Theme',
    shareSubInfo: 'If it resonates — forward it to someone who needs it.',
    tarotCard: 'TAROT CARD',
    forToday: 'FOR TODAY',
    choseYourCard: 'Choose your card',
    openThisCard: 'Open this card?',
    noTitle: 'No',
    yesTitle: 'Yes',
    betweenStars: 'Between the stars and silence',
    answerAppear: 'your answer appears',
    startReading: 'Start reading',
    login: 'Log in',
    signUp: 'Sign up',
    zodiac: {
      aries: 'Aries',
      taurus: 'Taurus',
      gemini: 'Gemini',
      cancer: 'Cancer',
      leo: 'Leo',
      virgo: 'Virgo',
      libra: 'Libra',
      scorpio: 'Scorpio',
      sagittarius: 'Sagittarius',
      capricorn: 'Capricorn',
      aquarius: 'Aquarius',
      pisces: 'Pisces',
    },

    astro: {
      moonIn: 'Moon in',
      mercuryRetrograde: 'Mercury retrograde',
      phases: {
        new: 'New Moon',
        waxingCrescent: 'Waxing Crescent',
        firstQuarter: 'First Quarter',
        waxingGibbous: 'Waxing Gibbous',
        full: 'Full Moon',
        waningGibbous: 'Waning Gibbous',
        lastQuarter: 'Last Quarter',
        waningCrescent: 'Waning Crescent',
      },
    },

    // Settings
    settings: 'Settings',
    tarot: 'Tarot',
    arcana: 'Arcana',
    horoscope: 'Horoscope',
    language: 'Language',
    dailyPush: 'Daily push notifications',
    optimalTime: 'Optimal time',
    account: 'Account',
    logout: 'Log Out',
    edit: 'Edit',
    done: 'Done',
    clear: 'Clear',
    backToHome: 'Back to Home',

    settingsPage: {
      subtitle: 'Tune your arcana flow',
      sections: {
        general: 'General',
        notifications: 'Notifications',
        account: 'Account',
      },
    },

    notifications: {
      defaultTime: 'Default (08:00 UTC)',
      noPermission: 'No permission / no token',
      syncFailed: 'Push sync failed',
    },

    languages: {
      en: 'English',
      uk: 'Ukrainian',
      pl: 'Polish',
      nl: 'Dutch',
      de: 'German',
      hu: 'Hungarian',
    },

    languagesNative: {
      en: 'English',
      uk: 'Українська',
      pl: 'Polska',
      nl: 'Nederlands',
      de: 'Deutsch',
      hu: 'Magyar',
    },

    common: {
      cancel: 'Cancel',
      save: 'Save',
    },

    fields: {
      name: 'Name',
      email: 'Email',
      password: 'Password',
      repeatPassword: 'Repeat Password',
      dateOfBirth: 'Date of birth',
      cityOfBirth: 'City of birth',
      country: 'Country',
    },

    home: {
      dailyInsights: 'Daily Insights',
      tarot: 'Tarot',
      zodiac: 'Zodiac',
      daily: 'Daily',
      astrology: 'Astrology',
      settings: 'Settings',
      testAnimation: 'Test Animation',
      slide1Alt: 'Daily insights slide 1',
      slide2Alt: 'Daily insights slide 2',
      slide3Alt: 'Daily insights slide 3',
    },

    auth: {
      loginAction: 'Login',
      signUpAction: 'Sign up',
      forgotPassword: 'Forgot password?',
      welcomeBack: 'Welcome back to Arcana',
      welcomeTo: 'Welcome to Arcana',
      newToArcana: 'New to Arcana?',
      alreadyHaveAccount: 'Already have an account?',
      alreadyUser: 'Already a user?',
      orContinueWith: 'or continue with',
      byCreatingAccount: 'By creating an account, you agree to our',
      terms: 'Terms and Conditions',
      sendCodeAgain: 'Send a new code',
      didntGetCode: "Didn't get your code?",
      codeSent: "We’ve sent a 6-digit verification code to your email",
      wrongOrExpiredCode: 'Wrong or expired code. Try again.',
      fillAllFields: 'Please fill all fields correctly.',
    },

    getStarted: {
      subtitle: 'Discover daily Tarot and Horoscope readings.',
      action: 'Get Started',
    },

    tarotResult: {
      cardNotFound: 'Card not found',
      shareCard: 'Share card',
    },

    resetPassword: {
      title: 'New password',
      checking: 'Checking link…',
      newPassword: 'New password',
      updated: 'Password updated',
      invalidLink: 'Link is invalid or expired. Request a new one.',
    },

    accountEdit: {
      title: 'Account Edit',
    },

    countries: {
      ukraine: 'Ukraine',
      germany: 'Germany',
      poland: 'Poland',
      netherlands: 'Netherlands',
      usa: 'USA',
    },

    misc: {
      or: 'or',
      apple: 'Apple',
      google: 'Google',
      share: 'Share',
    },

    template: {
      waitingSoon: 'What you are waiting for will soon appear',
      futureLine: 'Can you know your future? We think YES you can. Just take it',
      lookForFuture: 'Looking for my future',
    },

    baas: {
      loginTab: 'Login',
      signupTab: 'Sign up',
      resetTab: 'Reset',
      passwordMin: 'Password (min 6)',
      nicknameOptional: 'Nickname (optional)',
      magicLink: 'Magic link',
      checkEmailAfterSignup: 'After signup, check your email (Confirm email).',
      sendResetEmail: 'Send reset email',
      signedInAs: 'Signed in as',
      loggedOut: 'Logged out',
      loginSuccess: 'Logged in',
      checkEmailConfirm: 'Check your email: confirm and log in.',
      magicLinkSent: 'Magic link sent. Check your email.',
      resetEmailSent: 'Password reset email sent.',
    },

    errors: {
      generic: 'Something went wrong. Please try again.',
      saveFailed: 'Save failed',
      noSession: 'No session returned',
      noShareText: 'Nothing to share yet',
    },

    nav: {
      bottom: 'Bottom navigation',
    },
  },

  uk: {
    appName: 'Arcana Insight',

    dailyHoroscope: 'ГОРОСКОП НА СЬОГОДНІ',
    horoscopeFor: 'ГОРОСКОП НА',

    love: 'Кохання',
    career: 'Карʼєра',
    energy: 'Енергія',
    theme: 'Тема',
    shareSubInfo: 'Якщо відгукнулося — перешли тому, кому це потрібно',
    tarotCard: 'КАРТА ТАРО',
    forToday: 'НА СЬОГОДНІ',
    choseYourCard: 'Обери свою карту',
    openThisCard: 'Відкрити цю карту?',
    noTitle: 'Ні',
    yesTitle: 'Так',
    zodiac: {
      aries: 'Овен',
      taurus: 'Телець',
      gemini: 'Близнюки',
      cancer: 'Рак',
      leo: 'Лев',
      virgo: 'Діва',
      libra: 'Терези',
      scorpio: 'Скорпіон',
      sagittarius: 'Стрілець',
      capricorn: 'Козоріг',
      aquarius: 'Водолій',
      pisces: 'Риби',
    },
    betweenStars: 'Між зорями та тишею',
    answerAppear: 'твоя відповідь з’являється',
    startReading: 'Почати читання',
    login: 'Увійти',
    signUp: 'Реєстрація',

    astro: {
      moonIn: 'Місяць у',
      mercuryRetrograde: 'Ретроградний Меркурій',
      phases: {
        new: 'Молодик',
        waxingCrescent: 'Зростаючий серп',
        firstQuarter: 'Перша чверть',
        waxingGibbous: 'Зростаючий місяць',
        full: 'Повня',
        waningGibbous: 'Спадаючий місяць',
        lastQuarter: 'Остання чверть',
        waningCrescent: 'Спадний серп',
      },
    },

    settings: 'Налаштування',
    tarot: 'Таро',
    arcana: 'Аркана',
    horoscope: 'Гороскоп',
    language: 'Мова',
    dailyPush: 'Щоденні push-сповіщення',
    optimalTime: 'Оптимальний час',
    account: 'Акаунт',
    logout: 'Вийти',
    edit: 'Редагувати',
    done: 'Готово',
    clear: 'Очистити',
    backToHome: 'Назад на головну',

    settingsPage: {
      subtitle: 'Налаштуй свій потік аркани',
      sections: {
        general: 'Загальні',
        notifications: 'Сповіщення',
        account: 'Акаунт',
      },
    },

    notifications: {
      defaultTime: 'За замовчуванням (08:00 UTC)',
      noPermission: 'Немає дозволу / немає токена',
      syncFailed: 'Синхронізація push не вдалася',
    },

    languages: {
      en: 'English',
      uk: 'Українська',
      pl: 'Польська',
      nl: 'Нідерландська',
      de: 'Німецька',
      hu: 'Угорська',
    },

    languagesNative: {
      en: 'English',
      uk: 'Українська',
      pl: 'Polska',
      nl: 'Nederlands',
      de: 'Deutsch',
      hu: 'Magyar',
    },

    common: {
      cancel: 'Скасувати',
      save: 'Зберегти',
    },

    fields: {
      name: "Ім'я",
      email: 'Email',
      password: 'Пароль',
      repeatPassword: 'Повторіть пароль',
      dateOfBirth: 'Дата народження',
      cityOfBirth: 'Місто народження',
      country: 'Країна',
    },

    home: {
      dailyInsights: 'Щоденні інсайти',
      tarot: 'Таро',
      zodiac: 'Зодіак',
      daily: 'Щодня',
      astrology: 'Астрологія',
      settings: 'Налаштування',
      testAnimation: 'Тест анімації',
      slide1Alt: 'Слайд щоденних інсайтів 1',
      slide2Alt: 'Слайд щоденних інсайтів 2',
      slide3Alt: 'Слайд щоденних інсайтів 3',
    },

    auth: {
      loginAction: 'Увійти',
      signUpAction: 'Зареєструватися',
      forgotPassword: 'Забули пароль?',
      welcomeBack: 'З поверненням до Arcana',
      welcomeTo: 'Ласкаво просимо до Arcana',
      newToArcana: 'Вперше в Arcana?',
      alreadyHaveAccount: 'Вже маєте акаунт?',
      alreadyUser: 'Вже користувач?',
      orContinueWith: 'або продовжити з',
      byCreatingAccount: 'Створюючи акаунт, ви погоджуєтесь з',
      terms: 'Умовами та положеннями',
      sendCodeAgain: 'Надіслати новий код',
      didntGetCode: 'Не отримали код?',
      codeSent: 'Ми надіслали 6-значний код підтвердження на вашу пошту',
      wrongOrExpiredCode: 'Код неправильний або прострочений. Спробуйте ще раз.',
      fillAllFields: 'Будь ласка, заповніть усі поля правильно.',
    },

    getStarted: {
      subtitle: 'Щоденні читання Таро та гороскопів.',
      action: 'Почати',
    },

    tarotResult: {
      cardNotFound: 'Карту не знайдено',
      shareCard: 'Поділитися картою',
    },

    resetPassword: {
      title: 'Новий пароль',
      checking: 'Перевіряю посилання…',
      newPassword: 'Новий пароль',
      updated: 'Пароль оновлено',
      invalidLink: 'Посилання недійсне або прострочене. Запросіть нове.',
    },

    accountEdit: {
      title: 'Редагування акаунта',
    },

    countries: {
      ukraine: 'Україна',
      germany: 'Німеччина',
      poland: 'Польща',
      netherlands: 'Нідерланди',
      usa: 'США',
    },

    misc: {
      or: 'або',
      apple: 'Apple',
      google: 'Google',
      share: 'Поділитися',
    },

    template: {
      waitingSoon: 'Те, на що ти чекаєш, скоро з’явиться',
      futureLine: 'Чи можна знати своє майбутнє? Ми вважаємо, що так. Просто візьми його',
      lookForFuture: 'Шукаю своє майбутнє',
    },

    baas: {
      loginTab: 'Увійти',
      signupTab: 'Зареєструватися',
      resetTab: 'Скидання',
      passwordMin: 'Пароль (мін. 6)',
      nicknameOptional: 'Нік (необов’язково)',
      magicLink: 'Magic link',
      checkEmailAfterSignup: 'Після реєстрації перевір пошту (Confirm email).',
      sendResetEmail: 'Надіслати лист для скидання',
      signedInAs: 'Увійшов як',
      loggedOut: 'Вийшов',
      loginSuccess: 'Вхід виконано',
      checkEmailConfirm: 'Перевір пошту: підтверди email і увійди.',
      magicLinkSent: 'Надіслав magic-link. Перевір пошту.',
      resetEmailSent: 'Надіслав лист для скидання пароля.',
    },

    errors: {
      generic: 'Щось пішло не так. Спробуйте ще раз.',
      saveFailed: 'Не вдалося зберегти',
      noSession: 'Сесію не отримано',
      noShareText: 'Немає тексту для поширення',
    },

    nav: {
      bottom: 'Нижня навігація',
    },
  },
};

export function t(locale, key) {
  if (key == null && typeof locale === 'string') {
    key = locale
    locale = undefined
  }
  if (!key) return '';

  const activeLocale = locale || getLocale()

  const parts = key.split('.');
  let value = messages?.[activeLocale];

  for (const p of parts) {
    value = value?.[p];
    if (value == null) break;
  }

  if (value == null && activeLocale !== 'en') {
    let fallback = messages.en;
    for (const p of parts) {
      fallback = fallback?.[p];
      if (fallback == null) break;
    }
    return fallback ?? key;
  }

  return value ?? key;
}
