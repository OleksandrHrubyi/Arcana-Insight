// Build-time feature flags. Flip a flag and re-run the suite to re-enable.
//
// REWARDS_ENABLED — the ritual *rewards store* (spending points on tokens/badges:
// extra tarot spreads, 24h horoscope theme unlocks, mystic badge). Parked before
// the first App Store release: the system is unfinished (unbalanced economy,
// client-trusted inventory, premium-leak paths) and competes with the paywall.
//
// IMPORTANT: this gates only *spending/redemption*. The daily streak + ritual
// activity tracking (retention loop) is intentionally NOT behind this flag and
// keeps working. When false:
//   - tarot 3/5 spreads gate purely on premium (no token unlock),
//   - the /rewards route redirects away (store is unreachable),
//   - reward tokens/badges report empty everywhere (see ritualRewardInventory).
// To bring rewards back: flip to true, finish the economy, re-run `npm test`.
export const REWARDS_ENABLED = false
