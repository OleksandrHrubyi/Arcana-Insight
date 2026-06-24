# Monetization Analysis — Free vs Premium (2026-06-24)

Two read-only agents mapped the exact free/premium split + monetization mechanics. Below: technical correctness, then an honest strategy take (freemium vs paid-upfront) with a recommendation.

## A. Technical correctness — CLEAN ✅
- **Gating is consistent.** Every premium feature is gated the same way wherever it appears. No leak (free→premium) and no over-restriction (free feature wrongly blocked).
- **The 3 paid AI surfaces are gated client AND server** (tarot-reading, compatibility, personal-horoscope): client shows lock/upsell, server returns 403 when `RC_ENFORCE_PREMIUM=true` (verified set in prod). The client flag is localStorage (user-editable), so server enforcement is the real cost-abuse gate — and it's ON.
- **Saved readings**: free readings aren't even persisted, so there's nothing to leak.
- Previously-fixed bugs (logout leak, horoscope swipe→paywall, post-purchase button, personal-horoscope loop) confirmed clean.
- **No remaining gating bugs.**

### The matrix (free vs premium)
| Feature | Free | Premium |
|---|---|---|
| Tarot spread | 1 card | 1/3/5 cards |
| Tarot/day | 1 | unlimited |
| Tarot interpretation | deterministic "basic" | **AI narrative** + clarifier |
| Saved history | locked (not saved) | full |
| Horoscope | Energy theme | + Love + Career |
| Personal horoscope (AI) | locked | full |
| Compatibility | deterministic synastry + 1 teaser dimension | + all dimensions + **AI narrative** |
| Card library / zodiac guide / daily card / streak / push | full | full |

**Free-tier daily reality:** 1 single-card tarot (basic interp, not saved), full energy horoscope, unlimited deterministic compatibility, browse cards/zodiac, daily card, streak, push.

---

## B. Strategy — is freemium right, or should it be paid-upfront?

### Verdict: KEEP FREEMIUM. Paid-upfront would be a serious mistake for this category.

**Why paid-upfront is wrong here:**
1. **Discovery dies.** Paid apps get ~10–50× fewer installs. Tarot/horoscope is curiosity- and impulse-driven — people download to *try*, not to pre-commit money to an unknown brand.
2. **Zero trust at launch.** A brand-new mystic app, no reviews, asking for money before it even opens → near-zero conversion. Freemium lets the product earn trust first.
3. **The entire category is freemium-subscription.** Co–Star, The Pattern, Nebula, Chani, Sanctuary, Labyrinthos — all free-to-install + subscription. There is no successful paid-upfront tarot app at scale. The market has already answered this question.
4. **LTV.** Recurring subscriptions beat a one-time price for lifetime value in a habit/ritual app. You *want* the daily-return loop (which you have) feeding renewals.

So the model is correct. The worry "users won't buy premium" is real — but the fix is **calibration + trial + letting them taste the magic**, not switching to paid.

### The real conversion problem (and it IS a problem)
**A free user never experiences the premium "wow" (AI).** They only ever see the deterministic *basic* tarot interpretation and the energy horoscope. They literally cannot feel the difference between free and premium — so "why pay?" is a fair question from their side. This is the #1 thing suppressing conversion, and it's fixable.

### Recommendations (ranked by impact)
1. **Let users taste AI once — the biggest lever.** ✅ **SHIPPED (2026-06-24).** Every signed-in non-premium account gets ONE full AI tarot interpretation on its first reading, then reverts to the basic reading + paywall. Server-enforced via `ai_free_grants` (migration `202606241400`; `tarot-reading` consumes/refunds the grant, returns `meta.freeAiGift`). Client attempts it silently and falls back to basic on any failure (local `arcana_free_ai_tarot_used_v1` mirror avoids re-attempts; server is source of truth). The gift is **never** shown on the immersive oracle scene — only an oracle-voice note on the interpretation result page (`tarotInterpretation.freeGift.note`), plus the existing post-session upsell. Requires sign-in (AI needs auth), which doubles as a sign-up nudge.
2. **Configure a free trial (3 or 7 days) on the yearly plan.** The code already supports/displays a trial — but it must be set up in App Store Connect / RevenueCat. A trial typically 2–3× conversion in this category. This is currently "supported but likely not configured" — set it up.
3. **Keep the 8 contextual paywalls** — they're well-placed (after a free reading, hitting the daily limit, tapping a locked theme). Don't add pre-value walls.
4. **Pricing/anchoring is good** (yearly default + highlighted + "≈ $X/mo"). Ensure the monthly price is high enough to make yearly look like an obvious deal (the anchor does the selling).
5. **Lean on retention, not pressure.** Your daily card + streak + weekday push rotation already build the habit loop — that's what converts freemium over weeks, not aggressive walls. Keep it.

### Honest risk framing
- Freemium conversion in this category is typically **1–5%** of actives. That can *feel* low, but with retention + install volume it's how these apps make money. Paid-upfront would trade a 1–5% conversion on a large base for a near-zero base.
- The danger is **not** the model — it's being one more undifferentiated mystic app. Your edge has to be content quality (the AI readings) + the daily ritual. So: show the AI quality early (rec #1), and keep the daily loop tight.

### Bottom line
Freemium is the right call — don't go paid-upfront. The two changes that will move revenue most: **(1) give a free taste of an AI reading**, and **(2) turn on a free trial**. Everything else (gating, paywall placement, pricing, retention) is already in good shape.
