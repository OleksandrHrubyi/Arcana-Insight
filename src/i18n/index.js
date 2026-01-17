// src/i18n/index.js

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

    languages: {
      en: 'English',
      uk: 'Ukrainian',
    },

    common: {
      cancel: 'Cancel',
      save: 'Save',
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

    languages: {
      en: 'English',
      uk: 'Українська',
    },

    common: {
      cancel: 'Скасувати',
      save: 'Зберегти',
    },
  },
};

export function t(locale, key) {
  if (!key) return '';

  const parts = key.split('.');
  let value = messages?.[locale];

  for (const p of parts) {
    value = value?.[p];
    if (value == null) break;
  }

  if (value == null && locale !== 'en') {
    let fallback = messages.en;
    for (const p of parts) {
      fallback = fallback?.[p];
      if (fallback == null) break;
    }
    return fallback ?? key;
  }

  return value ?? key;
}
