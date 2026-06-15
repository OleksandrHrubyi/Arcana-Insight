---
name: arcana-daily-ritual-ux
description: Use when changing daily-card, streak, completion, rewards, continue-state, or retention UX in Arcana Insight. Keeps the daily loop visible, actionable, and product-like rather than decorative or hidden in side content.
---

# Arcana Daily Ritual UX

Use this skill for any work around the daily loop.

## Real Product Model

The current daily activity model lives in `src/helpers/dailyRitual.js`.

Real tracked activities:

- `daily_card`
- `horoscope`
- `tarot`

Design status around these real states. Do not invent abstract completion systems that disconnect from the product logic.

## Daily Loop Contract

The user should quickly understand:

- what is done today
- what remains
- what to do next
- what reward or streak state they are protecting

If the screen cannot answer those in one glance, the UX is too vague.

## UX Rules

1. Make progress visible.
   Streak, completion, and daily journey should read as product state, not astrology content.

2. Do not hide key status in a horizontal scroller.
   Important daily state belongs in the first view, especially on home.

3. Primary action should adapt.
   If one daily task is complete, the next incomplete task should become the obvious continuation path.

4. Resume matters.
   If the user started a reading or ritual flow, help them continue from home instead of restarting the loop conceptually.

5. Consolidate instead of stacking.
   Prefer one strong daily-status surface over multiple small cards fighting for attention.

6. Do not create a required pseudo-home detour.
   A `My Day`-style concept can exist as depth, but home should still function as the main dashboard.

## Reward and Retention Rules

- reward state should feel earned and clear
- progress labels should be concrete
- do not use guilt-heavy streak messaging
- do not bury completion state below decorative content

## Completion Check

- daily progress reflects real tracked activities
- one next action is obvious
- completion state is visible without hunting
- status blocks do not duplicate navigation or compete with the hero
