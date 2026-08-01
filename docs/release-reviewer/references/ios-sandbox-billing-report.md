# iOS Sandbox Billing Report

Last updated: 2026-08-01 (statuses backfilled from live LR-12 runs 2026-06-23 and 2026-07-07/08; evidence in `docs/launch-readiness-plan.md` LR-12 + changelog)
Reviewer: Oleksandr (real-device runs)
Device: real iPhone (TestFlight build)
Build source: TestFlight
Sandbox Apple ID: sandbox account (LR-12 sessions)
Arcana account: same-user account used for purchase + restore (LR-12)

Catalog loads: pass
Cancelled purchase: not run
Successful monthly purchase: pass
Restore purchase: pass
Entitlement survives restart: pass
Negative restore: not run
Expiration/cancel sanity check: not run

Notes:
- 2026-06-23 — purchase verified end-to-end on a real device with **`arcana.premium.yearly` $29.99** ("Готово! Покупку завершено [Sandbox]"): catalog loaded, paywall rendered both plans with real prices, purchase auto-created a `user_entitlements` row (`is_premium=true`, event `RENEWAL`) — device → RevenueCat → webhook → DB → enforcement confirmed live. The monthly product was NOT separately purchased; it shares the same RC offering/entitlement chain (`premium`).
- 2026-07-07 — Restore verified: delete app → TestFlight reinstall → Restore returned the still-active sub (RENEWAL #8 in `user_entitlements`).
- 2026-07-08 — entitlement survived reinstall + restarts across days: premium still active on device, RENEWAL #9 seen 21:40 Kyiv. `VITE_RC_IOS_API_KEY` confirmed in `.env`.
- Cancelled purchase (App Store sheet cancel), negative restore (second sandbox account) and the expiration sanity check were not run; per the 2026-07-08 decision they don't block submission (the expiration→revoke chain was verified server-side: webhook smoke 06-24, ordering migration 06-28, resume-sync LR-09). They belong to the owner's real-device pass — `app-store/asc-submit-checklist.md` §0.
- Use `pass`, `fail`, `pending`, or `not run`.
- `launch-readiness` clears the billing blocker only when all required checks are `pass`.
