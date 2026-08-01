# Для product_owner: застарілі статуси в ai-ops-доках (~15 хв dev)

> Від: release, 2026-08-01. Джерело: STATUS.md «Далі / заблоковано».

ai-ops показує фейковий blocker через застарілі статуси в доках. Не сабміт-блокер
(Apple цього не бачить), але засмічує кокпіт. Що зробити:

1. `docs/release-reviewer/references/ios-sandbox-billing-report.md` — 6 пунктів
   «pending» → проставити факт (верифіковано 2026-07-07/08).
2. `docs/release-reviewer/references/launch-checklist.md` — 5 застарілих пунктів.
3. Перевірити «not implemented»-маркер у `src/services/relationshipReminder.js` —
   чи відповідає реальному стану.

Після фіксу перегнати `npm run ai:scan:all` і перевірити, що blocker зник.
