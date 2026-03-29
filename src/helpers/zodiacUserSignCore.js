export const parseDateOfBirthFromProfileCache = (rawValue) => {
  if (!rawValue) return ''
  try {
    const parsed = JSON.parse(rawValue)
    return String(parsed?.date_of_birth || '').trim()
  } catch {
    return ''
  }
}

export const resolveUserSignSnapshot = async ({
  readProfileCacheValue,
  getCurrentUserId,
  fetchUserDateOfBirthById,
  zodiacFromRawDate,
}) => {
  const errors = []
  let dob = ''

  try {
    const rawProfile = await readProfileCacheValue()
    dob = parseDateOfBirthFromProfileCache(rawProfile)
  } catch {
    errors.push('cache_read_failed')
  }

  if (!dob) {
    const userId = String(getCurrentUserId?.() || '').trim()
    if (userId) {
      try {
        dob = String((await fetchUserDateOfBirthById(userId)) || '').trim()
      } catch {
        errors.push('profile_fetch_failed')
      }
    }
  }

  let signKey = ''
  try {
    signKey = String(zodiacFromRawDate(dob) || '')
  } catch {
    errors.push('zodiac_parse_failed')
  }

  return {
    dob,
    signKey,
    errors,
  }
}
