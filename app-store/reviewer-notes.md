# Arcana Insight — App Review Notes

Use this text in App Store Connect reviewer notes.

## Suggested review note (v2, 2026-07-08 — adds 4.3 differentiation, 5.1.1 purchase
## justification, and the AI-generated-content disclosure)

```text
Arcana is a tarot + horoscope app built around a short daily reflection ritual
(daily card, daily horoscope, zodiac compatibility). All content is framed for
reflection and entertainment — the app makes no predictions or guarantees and no
medical or financial claims; an explicit disclaimer is shown in-app and in the
description.

WHAT IS CUSTOM-BUILT (not a template):
- An interactive tarot "oracle" flow with a woven multi-card AI interpretation
  and an adaptive clarifying question, generated per session.
- A daily ritual loop (card + horoscope + streak progress) with its own content
  system.
- Real astronomy data (moon phase, planetary positions computed with
  astronomy-engine) feeding the horoscope context.

FREE TIER (no account needed):
The reviewer can use the daily card, the daily horoscope (Energy theme), the
78-card library, the zodiac guide, the compatibility overview and one 1-card
tarot reading per day without signing in.

AI-GENERATED CONTENT:
Horoscope, tarot-interpretation and compatibility texts are generated
server-side (OpenAI gpt-4o-mini with a fallback provider), constrained to a
fixed JSON schema and passed through a content-safety filter that blocks
predictive/deterministic, medical and financial wording before anything reaches
the user. This is not an open chatbot: users cannot converse freely with the
model; the only free-text input is an optional tarot question. AI processors
are disclosed in the privacy policy.

SUBSCRIPTION (auto-renewable):
Products: arcana.premium.monthly, arcana.premium.yearly
(RevenueCat entitlement: premium).
The paywall is reachable from the Premium screen, Personal Horoscope,
Saved Readings and Compatibility.

WHY SIGN-IN IS REQUIRED BEFORE PURCHASE:
Premium is account-based — it unlocks saved reading history and syncs the
entitlement across devices, and the subscription is verified server-side against
the user's account. Purchasing anonymously would risk losing the purchase on
reinstall. Sign-in takes seconds (Sign in with Apple or an email one-time code —
no password). A manual "Restore Purchases" button is on the Premium screen;
premium also restores automatically on sign-in.

TO TEST PREMIUM: create an account in-app (Sign in with Apple works in sandbox),
then purchase / restore with a Sandbox account.

ACCOUNT:
- Sign in with Apple is supported (the only third-party login; the alternative
  is a first-party email one-time code).
- No account is required for the free features listed above.
- Account deletion is available in-app:
  Settings -> Account -> Danger Zone -> Delete account.

Privacy Policy URL:
https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html

Support URL:
https://oleksandrhrubyi.github.io/Arcana-Insight/support.html

The app uses standard HTTPS encryption only (ITSAppUsesNonExemptEncryption =
false).
```

## Final pre-submit replacements

Confirm these URLs are live before submission:

- `https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html`
- `https://oleksandrhrubyi.github.io/Arcana-Insight/support.html`

## Notes for the owner

- Do not promise a review account unless you actually prepared one.
- Do not claim purchases work in review unless the sandbox runbook has been executed on a real iPhone.
- If Apple asks for a test account later, provide one separately instead of inventing it in advance.
