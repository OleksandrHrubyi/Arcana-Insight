import { REWARDS_ENABLED } from '../constants/featureFlags.js'

const routes = [
  {
    path: '/',
    component: () => import('src/layouts/BlankLayout.vue'),
    children: [
      { path: '', name: 'arcana', component: () => import('src/pages/GetStartedPage.vue'), meta: { tab: 'arcana' } },
      { path: 'login', name: 'login', component: () => import('src/pages/LoginPage.vue'), meta: { allowWithoutOnboarding: true, hideBottomNav: true } },
      { path: 'sign-up', name: 'signUp', component: () => import('src/pages/SignUpPage.vue'), meta: { allowWithoutOnboarding: true, hideBottomNav: true } },
      { path: 'confirm-code', component: () => import('src/pages/ConfirmEmailCodePage.vue'), meta: { hideBottomNav: true, allowWithoutOnboarding: true } },
      { path: 'horoscope', name: 'horoscope', component: () => import('src/pages/HoroscopePage.vue'), meta: { tab: 'horoscope' } },
      { path: 'personal-horoscope', name: 'personalHoroscope', component: () => import('src/pages/PersonalHoroscopePage.vue'), meta: { tab: 'horoscope', hideBottomNav: true } },
      { path: 'tarot', name: 'tarot', component: () => import('src/pages/TarotPage.vue'), meta: { tab: 'tarot', hideBottomNav: true } },
      { path: 'tarot-interpretation', name: 'tarotInterpretation', component: () => import('src/pages/TarotInterpretationPage.vue'), meta: { tab: 'tarot', hideBottomNav: true } },

      { path: 'menu', name: 'menu', component: () => import('src/pages/MenuPage.vue'), meta: { tab: 'menu' } },
      { path: 'daily', name: 'daily', component: () => import('src/pages/DailyCardPage.vue'), meta: { hideBottomNav: true } },
      { path: 'support', name: 'support', component: () => import('src/pages/FaqSupportPage.vue'), meta: { allowWithoutOnboarding: true, tab: 'menu' } },
      { path: 'privacy-terms', name: 'privacyTerms', component: () => import('src/pages/PrivacyTermsPage.vue'), meta: { allowWithoutOnboarding: true, tab: 'menu' } },
      { path: 'onboarding', name: 'onboarding', component: () => import('src/pages/OnboardingPage.vue'), meta: { hideBottomNav: true, allowWithoutOnboarding: true } },
      { path: 'cards', name: 'cards', component: () => import('src/pages/CardLibraryPage.vue'), meta: { tab: 'menu' } },
      { path: 'zodiac-guide', name: 'zodiacGuide', component: () => import('src/pages/ZodiacGuidePage.vue'), meta: { tab: 'menu' } },
      { path: 'compatibility', name: 'compatibility', component: () => import('src/pages/CompatibilityPage.vue'), meta: { tab: 'menu' } },
      { path: 'readings', name: 'readings', component: () => import('src/pages/SavedReadingsPage.vue'), meta: { tab: 'menu' } },
      { path: 'journal', name: 'journal', component: () => import('src/pages/JournalPage.vue'), meta: { tab: 'menu' } },
      { path: 'premium', name: 'premium', component: () => import('src/pages/PremiumPage.vue'), meta: { tab: 'menu', hideBottomNav: true } },
      { path: 'rewards', name: 'ritualRewards', component: () => import('src/pages/RitualRewardsPage.vue'), meta: { hideBottomNav: true }, beforeEnter: (to, from, next) => next(REWARDS_ENABLED ? true : { name: 'menu' }) },
      { path: 'settings', name: 'settings', component: () => import('src/pages/SettingsPage.vue'), meta: { tab: 'menu' } },
      {
        path: '/account',
        name: 'account',
        component: () => import('src/pages/AccountPage.vue'),
        meta: { requiresAuth: true, tab: 'menu' }
      }

    ]
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('src/pages/ErrorNotFound.vue'),
    // A bad URL must land on 404, not bounce a not-yet-onboarded user into the
    // onboarding gate (N3).
    meta: { allowWithoutOnboarding: true },
  },
];

export default routes;
