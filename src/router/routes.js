const routes = [
  {
    path: '/',
    component: () => import('src/layouts/BlankLayout.vue'),
    children: [
      { path: '', name: 'get-started', component: () => import('src/pages/GetStartedPage.vue') },
      { path: 'login', name: 'login', component: () => import('src/pages/LoginPage.vue') },
      { path: 'sign-up', name: 'signUp', component: () => import('src/pages/SignUpPage.vue') },
      { path: 'confirm-code', component: () => import('src/pages/ConfirmEmailCodePage.vue') },
      { path: 'horoscope', name: 'horoscope', component: () => import('src/pages/HoroscopePage.vue') },
      { path: 'tarot', name: 'tarot', component: () => import('src/pages/TarotPage.vue') },
      { path: 'settings', name: 'settings', component: () => import('src/pages/SettingsPage.vue') },
      { path: 'reset-password', component: () => import('src/pages/ResetPasswordPage.vue') },
    ]
  },


  // {
  //   path: '/',
  //   component: () => import('layouts/MainLayout.vue'),
  //   children: [
  //     { path: '', component: () => import('pages/IndexPage.vue') },
  //   ],
  // },
  // {
  //   path: '/login',
  //   component: () => import('pages/LoginPage.vue'),
  // },

  // Always leave this as last one,
  // but you can also remove it
  // {
  //   path: '/:catchAll(.*)*',
  //   component: () => import('pages/ErrorNotFound.vue'),
  // },
];

export default routes;
