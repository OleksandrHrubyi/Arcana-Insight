const requiresOnboardingRedirect = (to, onboardingComplete) => {
  return !onboardingComplete && !to?.meta?.allowWithoutOnboarding && to?.name !== 'onboarding'
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
  return { name: 'login' }
}
