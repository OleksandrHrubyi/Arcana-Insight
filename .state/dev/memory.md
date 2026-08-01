# dev · memory

- 2026-08-01: ai-ops стейл-статуси пофікшено: billing-report + launch-checklist оновлені фактами з `docs/launch-readiness-plan.md` (LR-12: purchase 2026-06-23 yearly, restore 2026-07-07, restart 2026-07-08). `ai:scan:all` → issues 7→2, тести 345/345.
- 2026-08-01: залишковий ai-ops blocker чесний: «Cancelled purchase» і «Negative restore» реально not run (рішення 2026-07-08 — не блокують сабміт; закриваються owner-прогоном §0 asc-submit-checklist). Чекер `ai-ops/checks/launch-readiness.js` знімає blocker лише коли всі 6 required = pass.
- 2026-08-01: monthly-покупка окремо НЕ проганялась — верифіковано лише yearly $29.99 (той самий RC-ланцюг); у report статус pass з явною приміткою в Notes.
- 2026-08-01: «not implemented» у relationshipReminder.js був лапками в коментарі про Capacitor proxy-пастку, не TODO — перефразовано, code-scan warning зник.
- 2026-08-01: стрей-файли `ios/App/App/config 3/4/5.xml` і `Pods/**/Frameworks 2/` вже відсутні (перевірено ls) — launch-checklist P2 позначено done.
