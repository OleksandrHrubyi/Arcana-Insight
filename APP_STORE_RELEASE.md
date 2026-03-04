# App Store Release Notes

## Done

- Removed unused Vue components, duplicate scenes, and dead service files.
- Removed the committed Apple private key from the app source tree.
- Removed an embedded token comment from the horoscope page.
- Fixed Quasar/Vite build failure on Node 18 by polyfilling `crypto.hash` in `quasar.config.js`.
- Verified `npm run lint`.
- Verified `npm run build`.

## Required Before Submission

1. Set a real Apple category in `ios/App/App/Info.plist`:
   - `LSApplicationCategoryType` is currently empty.
2. Decide whether the app supports landscape:
   - `UISupportedInterfaceOrientations` currently includes portrait and both landscape modes.
3. Provide production assets:
   - final app icon
   - launch screen / splash review
   - App Store screenshots
4. Configure production AI only if needed:
   - set `VITE_ENABLE_TAROT_AI=true`
   - deploy Supabase function `tarot-reading`
   - add Supabase secret `OPENAI_API_KEY`
5. Review push notifications flow:
   - `register-device` function is still a minimal placeholder and should be replaced with production logic before relying on push delivery
6. Move Apple auth secret generation to local env:
   - use `APPLE_PRIVATE_KEY` or `APPLE_PRIVATE_KEY_PATH`
   - never commit `.p8` files back into the repo

## Recommended

- Replace remaining `console.error` calls with a centralized logger if you want quieter release logs.
- Consider splitting large chunks:
  - `pixi`
  - `i18n`
  - tarot deck data
- Add a privacy review for:
  - Apple Sign In
  - Push Notifications
  - Supabase auth/profile storage

## Useful Commands

```bash
npm run lint
npm run build
npm run ios:assets
npm run ios:sync
npm run ios:open
```

## AI Setup

Frontend:

```env
VITE_ENABLE_TAROT_AI=true
```

Supabase function secrets:

```bash
supabase secrets set OPENAI_API_KEY=...
supabase functions deploy tarot-reading
```
