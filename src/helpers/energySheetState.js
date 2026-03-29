export const ENERGY_REWARD_STATES = Object.freeze({
  inProgress: 'in_progress',
  readyToClaim: 'ready_to_claim',
  claimedToday: 'claimed_today',
  completed: 'completed',
})

export const resolveRewardState = ({ ritualDoneCount, canClaimReward, hasClaimedToday }) => {
  const doneCount = Number(ritualDoneCount) || 0
  if (doneCount < 3) return ENERGY_REWARD_STATES.inProgress
  if (canClaimReward) return ENERGY_REWARD_STATES.readyToClaim
  if (hasClaimedToday) return ENERGY_REWARD_STATES.claimedToday
  return ENERGY_REWARD_STATES.completed
}

export const resolveNextRitualRoute = ({ hasDailyCardToday, hasHoroscopeToday, hasTarotToday }) => {
  if (!hasDailyCardToday) return 'arcana'
  if (!hasHoroscopeToday) return 'horoscope'
  if (!hasTarotToday) return 'tarot'
  return 'arcana'
}

export const resolvePrimaryActionType = (rewardState) => {
  if (rewardState === ENERGY_REWARD_STATES.readyToClaim) return 'claim'
  return 'navigate'
}

export const computeRewardProgress = ({ pointsBalance, targetPoints }) => {
  const points = Math.max(0, Number(pointsBalance) || 0)
  const target = Math.max(1, Number(targetPoints) || 1)
  const percent = Math.max(0, Math.min(100, Math.round((points / target) * 100)))
  return { points, target, percent }
}
