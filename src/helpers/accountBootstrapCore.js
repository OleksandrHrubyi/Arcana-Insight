export const resolveAccountBootstrapUser = async ({
  initialUser,
  syncSession,
  getCurrentUser,
}) => {
  let user = initialUser || null

  if (!user) {
    try {
      await syncSession({ refresh: false })
    } catch (error) {
      return {
        user: null,
        error,
      }
    }
    user = getCurrentUser() || null
  }

  return {
    user,
    error: null,
  }
}
