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

  if (!to?.meta?.requiresAuth) return true
  if (hasUser) return true
  return { name: 'login', query: { redirect: String(to?.fullPath || '') } }
}
