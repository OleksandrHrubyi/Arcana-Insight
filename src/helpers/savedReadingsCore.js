export const EMPTY_SAVED_READINGS_STATE = Object.freeze({
  readings: [],
  isLoggedIn: false,
  userId: '',
})

export const normalizeReadings = (value) => {
  if (!Array.isArray(value)) return []
  return value
}

export const loadSavedReadingsSnapshot = async ({
  hasPremiumAccess,
  ensureTarotDataLoaded,
  getUserNative,
  selectTarotReadingsByUser,
  timeoutMs = 8000,
}) => {
  if (!hasPremiumAccess) {
    return {
      ...EMPTY_SAVED_READINGS_STATE,
      status: 'locked',
      error: null,
    }
  }

  try {
    await ensureTarotDataLoaded()
    const { data: user } = await getUserNative(timeoutMs)
    if (!user?.id) {
      return {
        ...EMPTY_SAVED_READINGS_STATE,
        status: 'anonymous',
        error: null,
      }
    }

    const { data, error } = await selectTarotReadingsByUser(user.id, timeoutMs)
    if (error) {
      return {
        readings: [],
        isLoggedIn: true,
        userId: user.id,
        status: 'error',
        error,
      }
    }

    return {
      readings: normalizeReadings(data),
      isLoggedIn: true,
      userId: user.id,
      status: 'ready',
      error: null,
    }
  } catch (error) {
    return {
      ...EMPTY_SAVED_READINGS_STATE,
      status: 'error',
      error,
    }
  }
}
