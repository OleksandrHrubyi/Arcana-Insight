const routes = [
  {
    path: '/',
    component: () => import('src/layouts/BlankLayout.vue'),
    children: [
      { path: '', name: 'arcana', component: () => import('src/pages/GetStartedPage.vue'), meta: { tab: 'arcana', hideBottomNav: true } },
      { path: 'login', name: 'login', component: () => import('src/pages/LoginPage.vue'), meta: { allowWithoutOnboarding: true } },
      { path: 'sign-up', name: 'signUp', component: () => import('src/pages/SignUpPage.vue'), meta: { allowWithoutOnboarding: true } },
      { path: 'confirm-code', component: () => import('src/pages/ConfirmEmailCodePage.vue'), meta: { hideBottomNav: true, allowWithoutOnboarding: true } },
      { path: 'horoscope', name: 'horoscope', component: () => import('src/pages/HoroscopePage.vue'), meta: { tab: 'horoscope' } },
      { path: 'personal-horoscope', name: 'personalHoroscope', component: () => import('src/pages/PersonalHoroscopePage.vue'), meta: { tab: 'horoscope', hideBottomNav: true } },
      { path: 'tarot', name: 'tarot', component: () => import('src/pages/TarotPage.vue'), meta: { tab: 'tarot', hideBottomNav: true } },
      { path: 'tarot-interpretation', name: 'tarotInterpretation', component: () => import('src/pages/TarotInterpretationPage.vue'), meta: { tab: 'tarot', hideBottomNav: true } },
      { path: 'tarot/:id', name: 'TarotResult', component: () => import('src/pages/TarotResult.vue'), meta: { tab: 'tarot', hideBottomNav: true } },

      { path: 'menu', name: 'menu', component: () => import('src/pages/MenuPage.vue'), meta: { tab: 'menu' } },
      { path: 'daily', name: 'daily', component: () => import('src/pages/DailyCardPage.vue'), meta: { hideBottomNav: true } },
      { path: 'my-day', name: 'myDay', component: () => import('src/pages/MyDayPage.vue'), meta: { hideBottomNav: true } },
      { path: 'support', name: 'support', component: () => import('src/pages/FaqSupportPage.vue'), meta: { allowWithoutOnboarding: true } },
      { path: 'privacy-terms', name: 'privacyTerms', component: () => import('src/pages/PrivacyTermsPage.vue'), meta: { allowWithoutOnboarding: true } },
      { path: 'onboarding', name: 'onboarding', component: () => import('src/pages/OnboardingPage.vue'), meta: { hideBottomNav: true, allowWithoutOnboarding: true } },
      { path: 'cards', name: 'cards', component: () => import('src/pages/CardLibraryPage.vue') },
      { path: 'zodiac-guide', name: 'zodiacGuide', component: () => import('src/pages/ZodiacGuidePage.vue'), meta: { tab: 'menu' } },
      { path: 'compatibility', name: 'compatibility', component: () => import('src/pages/CompatibilityPage.vue') },
      { path: 'readings', name: 'readings', component: () => import('src/pages/SavedReadingsPage.vue') },
      { path: 'premium', name: 'premium', component: () => import('src/pages/PremiumPage.vue'), meta: { tab: 'menu', hideBottomNav: true } },
      { path: 'rewards', name: 'ritualRewards', component: () => import('src/pages/RitualRewardsPage.vue'), meta: { hideBottomNav: true } },
      { path: 'settings', name: 'settings', component: () => import('src/pages/SettingsPage.vue'), meta: { tab: 'menu' } },
      { path: 'reset-password', component: () => import('src/pages/ResetPasswordPage.vue'), meta: { allowWithoutOnboarding: true } },
      {
        path: '/account',
        name: 'account',
        component: () => import('src/pages/AccountPage.vue'),
        meta: { requiresAuth: true }
      }

    ]
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('src/pages/ErrorNotFound.vue'),
  },
];

export default routes;
