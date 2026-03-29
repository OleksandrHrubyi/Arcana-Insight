# Plan: Ritual Rewards and Retention System v1

## Task Description
Define a complete rewards system for Daily Ritual (energy sheet) that is simple, premium-feeling, and retention-oriented. The system must support both guest and authenticated users, keep progress meaningful without login, and preserve value when users authenticate later.

## Objective
Ship a clear and motivating ritual economy that improves D1 and D7 retention with low friction and minimal ambiguity.

## Problem Statement
Current rewards behavior is mixed (local + server) and can feel inconsistent:
- guest users complete rituals but value persistence is unclear
- reward inventory behavior across guest->logged transition is not strictly defined
- retention layer needs clear v1 scope vs v1.1 scope

## Solution Approach
Implement one unified ritual model with two storage modes:
- Guest mode: local-first points, claims, and inventory
- Auth mode: server-backed points and claims with controlled migration from local

v1 focuses on:
- base ritual earning loop
- manual reward claim loop
- weekly chest + comeback mission
- explicit guest->logged migration rules

Use mystic ritual tone in copy and feedback.

## Final Product Decisions (Locked)
- Goal priority: D1 and D7 both critical
- Product style: simplicity first, with wow effect
- Guest rewards: real and usable without login
- Base economy: +10 per ritual step, +20 for full 3/3 day
- Reward types: utility + emotional mix
- Reward expiry: no expiry for permanent items; timed unlocks use explicit `expiresAt`
- Claim flow: manual claim button
- Claim policy: user can claim multiple rewards while balance is enough
- Retention mechanics in v1: weekly chest + comeback mission
- Weekly chest rule: 5/7 small chest, 7/7 big chest
- Weekly chest direct 7/7 claim: if first claim happens at 7/7, user receives full weekly total in one claim
- Comeback mission rule: complete 3/3 today after miss -> instant bonus
- Streak freeze: moved to v1.1 (out of v1 release scope)
- Voice/tone: mystic ritual
- Economy pricing mode: fixed prices
- Anti-abuse posture for guest: UX-first (accept low-level risk)
- D1 vs D7 tie-breaker: balanced, with D7 tie-break
- Core KPI set: reward claim rate (Day 3), D7 retention, active ritual days per user per week
- Login CTA policy: soft and non-blocking for v1
- Comeback eligibility: strict 7-day rule (defined below)
- Timed unlock repeat-claim policy: extends duration from max(now, currentExpiresAt)
- `mystic_badge`: one-time claim in v1
- `active ritual day` definition: at least 1 valid ritual step completed on that local day
- Reward catalog visibility: always visible with disabled items when balance is insufficient

## Login CTA Policy (Locked)
- Show soft login CTA at first reward claim and in energy header:
  "Bind your ritual to keep rewards across devices."
- Do not hard-block claims for guest in v1.
- Keep rewards usable without login.
- Hard gating is allowed only for future cloud-only rewards (not in v1 catalog).

## Reward Economy v1

### Point Sources
- Ritual step completion (`daily_card`, `horoscope`, `tarot`): +10 each, once per day per activity
- Full day completion (`3/3`): +20 once per day
- Comeback mission completion: +20 once per valid comeback day
- Weekly chest `5/7`: +30 once per week
- Weekly chest `7/7`: +30 upgrade in same week (weekly chest total = 60)

### Cap and Abuse Guard
- No visible product cap in v1 (to avoid fake/decorative complexity).
- Keep only technical server-side abuse guard (high threshold, implementation detail).
- Reward claims never affect earning guard, only earning events do.

### Initial Reward Catalog (v1)
- `extra_tarot_spread`
  - Cost: 60
  - Effect: grants +1 extra spread usage token
  - Scope (locked): token is consumed on successful start of one premium-gated tarot spread flow, valid app-wide (not tied to current screen/session)
  - Consumption guard (locked): token is not consumed on screen open or pre-flow preview actions
- `horoscope_love_unlock_24h`
  - Cost: 35
  - Effect: unlocks Love tab for 24h
- `horoscope_career_unlock_24h`
  - Cost: 35
  - Effect: unlocks Career tab for 24h
- `mystic_badge`
  - Cost: 45
  - Effect: grants collectible emotional badge (profile/ritual identity)
  - Claim policy: one-time only in v1
  - Primary placement (v1 locked): show first in Profile header; optional mirrored indicator in Energy identity area

Notes:
- Keep existing rewards (`premium_day_pass`, `insight_pack`, `tarot_spread_boost`) disabled for v1 launch unless catalog strategy changes.

## Retention Mechanics v1

### Weekly Chest
- Track active ritual days in local week window (Mon-Sun, local timezone).
- At 5 active days: unlock Small Chest claim once.
- At 7 active days: unlock Big Chest upgrade claim once (delta if small already claimed).
- If user reaches 7/7 before first weekly claim, a single claim grants full weekly chest value (60 points total).
- Weekly state reset (locked): every local Monday at 00:00 (device timezone), reset week progress and weekly claim flags (`5/7`, `7/7`).

### Active Ritual Day Definition (Locked)
- A day is `active` if user has at least 1 valid ritual event that day:
  - `daily_card` OR `horoscope` OR `tarot`
- `3/3` full completion is not required to count as active day.
- This definition must be shared by:
  - weekly chest progress
  - `active ritual days per user per week` KPI
  - relevant energy sheet UI counters

### Comeback Mission
- Eligibility (strict):
  - `yesterday` has zero valid ritual events
  - and within the 7 days before yesterday, there is at least 1 `active ritual day`
- Condition: complete 3/3 today.
- Reward: +20 instant points with ritual comeback feedback.
- Limit: max 1 comeback reward per local day.

### Out of Scope (v1.1)
- `streak freeze` grant/use flow
- freeze token inventory sync across devices

## Guest vs Logged User Behavior

### Guest Mode
- Points, claims, inventory, and retention state are local and real.
- Rewards are immediately usable on this device.
- No cloud backup guarantee.
- App reinstall/data wipe can reset guest state.

### Logged Mode
- New ritual events and claims are server-backed.
- On login, app syncs queued guest activity events.
- Inventory migration follows strict source-of-truth rules.

### Source of Truth Rules (Critical)
- Before login: source of truth = local.
- After first successful migration sync: source of truth = server for all new events/claims.
- Already used local consumables are not restored after migration.
- Timed unlocks migrate by `expiresAt` remaining time, not by raw claim existence.
- Migration must be idempotent using stable `migration_key`/dedupe key.

### Timed Unlock Repeat-Claim Policy (Locked)
- Applies to:
  - `horoscope_love_unlock_24h`
  - `horoscope_career_unlock_24h`
- If claimed while unlock is still active:
  - new `expiresAt = max(now, currentExpiresAt) + 24h`
- If unlock already expired:
  - new `expiresAt = now + 24h`
- This policy must be identical in guest and logged modes.

### Sync Strategy (Guest -> Logged)
- Queue ritual events locally, dedupe by `activity+dateKey`.
- On successful auth:
  - sync queue to backend
  - run one-time inventory migration with idempotent keys
  - refresh ritual dashboard
- If partial sync fails:
  - keep failed items in queue
  - retry on next foreground/login

## UX Behavior Rules
- Show points and progress in energy sheet for both guest and logged users.
- Reward catalog is always visible.
- Rewards user cannot afford are shown disabled with explicit price.
- Claim CTA is enabled only when balance is sufficient for that reward.
- Claims are manual and repeatable while balance allows.
- Guest sees subtle sync hint:
  - "Progress is real on this device. Sign in to bind your ritual."
- Logged users do not see guest warning hint.

## Data Model Requirements

### Local
- `ritual_events_queue`
- `ritual_points_local`
- `ritual_reward_inventory_local`
- `ritual_weekly_state_local`
- `ritual_comeback_state_local`
- `ritual_inventory_migration_state_local`

### Backend (existing + extensions)
- Existing: activity events, points balance, streaks, reward catalog, reward claims.
- Extension required for robust migration parity (chosen model):
  - `reward_inventory` table is the server source of effective reward state
  - fields include: `user_id`, `reward_key`, `quantity`, `expires_at`, `updated_at`
  - `migration_key` support for idempotent guest inventory migration

## Analytics and KPIs

### Primary KPIs (Locked)
- `% users with any reward claim by Day 3`
- `D7 retention`
- `average ritual active days per user per week`

### Key Event Tracking
- `ritual_step_completed`
- `ritual_full_day_completed`
- `ritual_reward_claimed`
- `ritual_weekly_chest_claimed`
- `ritual_comeback_completed`
- `ritual_login_cta_seen`
- `ritual_login_cta_clicked`

### Required Event Parameters (Locked)
- For catalog purchase claim events (`ritual_reward_claimed`):
  - `reward_key`
  - `reward_cost`
  - `user_mode` (`guest` | `logged`)
  - `claim_source` (`catalog`)
  - `week_progress` (`0..7`)
  - `had_active_unlock_before_claim` (`true` | `false`)
  - `migration_state` (`local_only` | `syncing` | `migrated`)
- For grant events (`ritual_weekly_chest_claimed`, `ritual_comeback_completed`):
  - `points_granted`
  - `user_mode` (`guest` | `logged`)
  - `claim_source` (`weekly_chest` | `comeback`)
  - `week_progress` (`0..7`)
  - `migration_state` (`local_only` | `syncing` | `migrated`)
- For ritual progress events:
  - `user_mode`
  - `week_progress`
  - `migration_state`

## Relevant Files
- [src/components/main/DailyRitualProgressComponent.vue](/Users/oleksandr/Desktop/App/Arcana-Insight/src/components/main/DailyRitualProgressComponent.vue)
- [src/helpers/ritualRewardsBackend.js](/Users/oleksandr/Desktop/App/Arcana-Insight/src/helpers/ritualRewardsBackend.js)
- [src/helpers/dailyRitual.js](/Users/oleksandr/Desktop/App/Arcana-Insight/src/helpers/dailyRitual.js)
- [src/helpers/energySheetState.js](/Users/oleksandr/Desktop/App/Arcana-Insight/src/helpers/energySheetState.js)
- [src/stores/authStore.js](/Users/oleksandr/Desktop/App/Arcana-Insight/src/stores/authStore.js)
- [src/stores/authStoreCore.js](/Users/oleksandr/Desktop/App/Arcana-Insight/src/stores/authStoreCore.js)
- [supabase/functions/ritual-track/index.ts](/Users/oleksandr/Desktop/App/Arcana-Insight/supabase/functions/ritual-track/index.ts)
- [supabase/functions/ritual-dashboard/index.ts](/Users/oleksandr/Desktop/App/Arcana-Insight/supabase/functions/ritual-dashboard/index.ts)
- [supabase/functions/ritual-claim/index.ts](/Users/oleksandr/Desktop/App/Arcana-Insight/supabase/functions/ritual-claim/index.ts)
- [supabase/migrations/202603270900_ritual_rewards.sql](/Users/oleksandr/Desktop/App/Arcana-Insight/supabase/migrations/202603270900_ritual_rewards.sql)

## Implementation Phases
- [x] **Phase 1: Economy and Catalog Finalization**
  - Status: completed
  - Comments: Product rules, pricing model, claim policy, and v1 reward catalog were locked. Remaining work in this phase is technical normalization only.
- [ ] **Phase 2: Guest/Logged Sync Truth Rules**
  - Status: pending
  - Comments:
- [ ] **Phase 3: Weekly Chest, Comeback, and Reward Usage**
  - Status: pending
  - Comments:
- [ ] **Phase 4: Telemetry, QA, and Rollout**
  - Status: pending
  - Comments:

## Step by Step Tasks

### 1. Technical normalization of v1 catalog
- **Task ID**: normalize-reward-catalog-v1
- **Depends On**: none
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments: Technical normalization only; no open product decisions.
- Apply locked v1 keys (`extra_tarot_spread`, `horoscope_love_unlock_24h`, `horoscope_career_unlock_24h`, `mystic_badge`) to runtime and backend config.
- Disable non-v1 rewards for launch.

### 2. Implement local inventory runtime
- **Task ID**: implement-local-inventory-runtime
- **Depends On**: normalize-reward-catalog-v1
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Add local inventory with support for consumable and timed unlock types.
- Store and enforce `expiresAt` for 24h unlock rewards.

### 3. Implement guest->logged migration truth rules
- **Task ID**: implement-sync-truth-rules
- **Depends On**: implement-local-inventory-runtime
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Add idempotent migration keys.
- Prevent consumed-item restoration.
- Migrate timed unlocks with remaining duration.

### 4. Add weekly chest and comeback mechanics
- **Task ID**: add-weekly-comeback-loop
- **Depends On**: implement-local-inventory-runtime
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: true
- Status: pending
- Comments:
- Implement 5/7 and 7/7 chest logic.
- Implement comeback detection and payout.

### 5. Wire reward consumption in product surfaces
- **Task ID**: wire-reward-consumption-surfaces
- **Depends On**: implement-local-inventory-runtime
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: true
- Status: pending
- Comments:
- Consume tarot spread tokens in tarot flow.
- Respect timed unlock for horoscope Love/Career tabs.
- Display `mystic_badge` in profile/energy identity area.

### 6. Add analytics instrumentation
- **Task ID**: add-retention-analytics
- **Depends On**: add-weekly-comeback-loop
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: true
- Status: pending
- Comments:
- Track claim/chest/comeback/login CTA events.
- Validate event params for KPI analysis.

### 7. Final validation
- **Task ID**: validate-all
- **Depends On**: normalize-reward-catalog-v1,implement-local-inventory-runtime,implement-sync-truth-rules,add-weekly-comeback-loop,wire-reward-consumption-surfaces,add-retention-analytics
- **Assigned To**: codex
- **Agent Type**: codex
- **Parallel**: false
- Status: pending
- Comments:
- Run lint/build/tests and guest/logged migration QA matrix.
- Verify no reward duplication in migration.
- Mandatory QA scenarios:
  - login while a timed 24h unlock is active (remaining `expiresAt` migrates correctly)
  - partial sync failure (queue retention + safe retry, no duplicate grants)
  - migration after `extra_tarot_spread` token was already consumed (token is not restored)

## Acceptance Criteria
- Guest can earn points and claim real rewards without login.
- Claimed guest rewards are immediately usable.
- On login, queued ritual events sync and dashboard refreshes.
- Inventory migration is idempotent and respects consumed/timed states.
- High-risk migration paths are validated: active timed unlock login, partial sync failure, and consumed token migration.
- Weekly chest and comeback mission work end-to-end.
- Weekly chest `7/7` direct claim never double-pays when `5/7` chest was already claimed earlier in the same week.
- User can claim multiple rewards while balance permits.
- Energy sheet uses mystic ritual tone and communicates sync behavior.
- KPI events are emitted and queryable.

## Validation Commands
- `npm run lint`
- `npm run build`
- `npm test`

## Notes
- v1 intentionally optimizes UX over strict anti-abuse.
- `streak freeze` is planned for v1.1 after v1 metrics stabilize.
- If economy inflates, tune reward prices and weekly bonus values before adding hard caps.
- Timezone drift policy (guest local state): if device timezone changes, day/week boundaries are applied forward from current time; prior local history is not retroactively recalculated.
