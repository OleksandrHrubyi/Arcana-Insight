# iOS Sandbox Billing Runbook

Last updated: 2026-04-23
Owner: launch reviewer

## Scope

Use this runbook to clear the `Run real iOS sandbox flow for purchase, restore, cancel, and entitlement refresh` blocker.

Expected production wiring from the repo:

- RevenueCat entitlement: `premium`
- Monthly product: `arcana.premium.monthly`
- Yearly product: `arcana.premium.yearly`
- iOS API key env: `VITE_RC_IOS_API_KEY`

## Preconditions

- The app is installed on a real iPhone via Xcode or TestFlight.
- The build uses the active iOS target in [ios/App](/Users/oleksandr/Desktop/App/Arcana-Insight/ios/App).
- The sandbox Apple ID is signed in for StoreKit purchases on the device.
- App Store Connect has active subscription products:
  - `arcana.premium.monthly`
  - `arcana.premium.yearly`
- RevenueCat current offering resolves both products and the `premium` entitlement.

## Test 1: Catalog loads

1. Open the premium screen on the iPhone build.
2. Confirm both plans render a real localized price.
3. Confirm no fallback error appears:
   - `Purchases are unavailable on this device.`
   - `VITE_RC_IOS_API_KEY is missing for the iPhone build.`
   - `The RevenueCat Purchases plugin is not connected in the native iOS build.`

Pass condition:

- Monthly and yearly plans both show real App Store prices.

## Test 2: Cancelled purchase

1. Tap monthly or yearly purchase.
2. When the App Store sheet appears, cancel it.
3. Return to the app.

Pass condition:

- The app stays usable.
- Premium does not unlock.
- The UI shows the cancelled result, not a success state.

## Test 3: Successful purchase

1. Start a purchase for `arcana.premium.monthly`.
2. Complete the sandbox transaction.
3. Return to the app.

Pass condition:

- Premium unlocks immediately.
- Premium-only surfaces stop showing the lock state.
- The premium screen reflects an active entitlement.
- Re-opening the app keeps premium active.

## Test 4: Restore purchases

1. Sign out in-app if needed, then sign back in with the same Arcana account.
2. Use the `Restore` action from the premium screen.

Pass condition:

- Restore completes without error.
- Premium returns for the same user.
- No duplicate purchase prompt appears.

## Test 5: Entitlement refresh after restart

1. Force-close the app.
2. Re-open it on the same device.
3. Visit a premium-locked screen and the premium page.

Pass condition:

- Premium remains active.
- No manual restore is required just to rehydrate entitlement state.

## Test 6: Negative restore case

1. Install on a second device or use a sandbox account with no active purchase.
2. Open premium and press `Restore`.

Pass condition:

- The app reports no active purchase restored.
- Premium does not unlock by mistake.

## Test 7: Subscription management and expiration sanity check

1. Open iOS subscription management for the sandbox account.
2. Confirm the active subscription is visible.
3. If time allows, cancel the sandbox renewal and wait for the entitlement to expire on sandbox cadence.
4. Re-open the app and refresh premium status.

Pass condition:

- Active subscription is visible in Apple subscription management.
- After sandbox expiration/cancellation propagates, premium no longer shows as active.

## Evidence to capture

- Screenshot of premium screen with real prices.
- Screenshot after successful unlock.
- Screenshot or note for restore result.
- If something fails, capture:
  - exact screen
  - plan used
  - sandbox account used
  - whether the App Store sheet appeared
  - exact user-visible error text

## Report template

Copy this back after the run:

```text
Catalog loads: pass/fail
Cancelled purchase: pass/fail
Successful monthly purchase: pass/fail
Restore purchase: pass/fail
Entitlement survives restart: pass/fail
Negative restore: pass/fail
Expiration/cancel sanity check: pass/fail/not run
Notes:
```
