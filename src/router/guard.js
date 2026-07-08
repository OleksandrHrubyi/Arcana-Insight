const requiresOnboardingRedirect = (to, onboardingComplete) => {
  return !onboardingComplete && !to?.meta?.allowWithoutOnboarding && to?.name !== 'onboarding'
}

export const isDevHomeQaBypassActive = ({ isDev, search }) => {
  if (!isDev || !search) return false
  const params = new URLSearchParams(String(search || ''))
  return params.get('qa') === 'home'
}

export const resolveRouteGuardDecision = ({ to, onboardingComplete, hasUser }) => {
  if (requiresOnboardingRedirect(to, onboardingComplete)) {
    return {
      name: 'onboarding',
      query: {
        from: String(to?.fullPath || '/'),
      },
    }
  }

  // An authenticated user has no business on the auth screens. Real case: the
  // paywall's Close does history-back, and after a login → /premium hop the
  // previous history entry IS /login — landing there reads as "Close threw me
  // back to login". Send them home instead. Deliberately NOT honoring
  // to.query.redirect here: in the back-navigation case it points at the page
  // the user just closed, which would turn Close into a no-op loop.
  if (hasUser && (to?.name === 'login' || to?.name === 'signUp')) {
    return { name: 'arcana' }
  }

  if (!to?.meta?.requiresAuth) return true
  if (hasUser) return true
  return { name: 'login', query: { redirect: String(to?.fullPath || '') } }
}
