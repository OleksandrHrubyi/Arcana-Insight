import { resolveOnboardingRouteTarget } from './onboardingRouteTarget.js'

const normalizeSelectedCount = (value) => {
  const parsed = Number.parseInt(String(value ?? 0), 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, parsed)
}

const normalizeAction = (value) => (value === 'deselect' ? 'deselect' : 'select')

export const buildOnboardingExitContext = ({ rawFrom, selectedCount }) => {
  const routeTarget = resolveOnboardingRouteTarget(rawFrom)
  const normalizedCount = normalizeSelectedCount(selectedCount)

  return {
    ...routeTarget,
    payload: {
      resolved_target: routeTarget.resolvedTarget,
      navigation_mode: routeTarget.navigationMode,
      had_valid_from: routeTarget.hadValidFrom,
      selected_count: normalizedCount,
    },
  }
}

export const buildInterestSelectPayload = ({ interestKey, action, selectedCount }) => ({
  interest_key: String(interestKey || '').trim(),
  action: normalizeAction(action),
  selected_count: normalizeSelectedCount(selectedCount),
})
