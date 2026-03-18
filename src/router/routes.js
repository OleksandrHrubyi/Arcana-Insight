const routes = [
  {
    path: '/',
    component: () => import('src/layouts/BlankLayout.vue'),
    children: [
      { path: '', name: 'arcana', component: () => import('src/pages/GetStartedPage.vue'), meta: { tab: 'arcana' } },
      { path: 'login', name: 'login', component: () => import('src/pages/LoginPage.vue') },
      { path: 'sign-up', name: 'signUp', component: () => import('src/pages/SignUpPage.vue') },
      { path: 'confirm-code', component: () => import('src/pages/ConfirmEmailCodePage.vue'), meta: { hideBottomNav: true } },
      { path: 'horoscope', name: 'horoscope', component: () => import('src/pages/HoroscopePage.vue'), meta: { tab: 'horoscope' } },
      { path: 'tarot', name: 'tarot', component: () => import('src/pages/TarotPage.vue'), meta: { tab: 'tarot', hideBottomNav: true } },
      { path: 'tarot-interpretation', name: 'tarotInterpretation', component: () => import('src/pages/TarotInterpretationPage.vue'), meta: { tab: 'tarot', hideBottomNav: true } },
      {
        path: "tarot/:id",
        name: "TarotResult",
        component: () => import("pages/TarotResult.vue"),
        meta: { tab: 'tarot', hideBottomNav: true }
      },

      { path: 'menu', name: 'menu', component: () => import('src/pages/MenuPage.vue'), meta: { tab: 'menu' } },
      { path: 'daily', name: 'daily', component: () => import('src/pages/DailyCardPage.vue') },
      { path: 'support', name: 'support', component: () => import('src/pages/FaqSupportPage.vue') },
      { path: 'privacy-terms', name: 'privacyTerms', component: () => import('src/pages/PrivacyTermsPage.vue') },
      { path: 'onboarding', name: 'onboarding', component: () => import('src/pages/OnboardingPage.vue'), meta: { hideBottomNav: true } },
      { path: 'cards', name: 'cards', component: () => import('src/pages/CardLibraryPage.vue') },
      { path: 'compatibility', name: 'compatibility', component: () => import('src/pages/CompatibilityPage.vue') },
      { path: 'readings', name: 'readings', component: () => import('src/pages/SavedReadingsPage.vue') },
      { path: 'settings', name: 'settings', component: () => import('src/pages/SettingsPage.vue'), meta: { tab: 'menu' } },
      { path: 'reset-password', component: () => import('src/pages/ResetPasswordPage.vue') },
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
