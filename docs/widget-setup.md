# RP-16 — Віджет ArcanaWidget: кроки в Xcode (owner)

Код готовий у репо; Xcode-таргет створюється руками (правити pbxproj під extension-таргет
занадто ризиковано). Кроки займають ~5 хвилин.

## Що вже зроблено в коді (нічого з цього не повторювати)

- `ios/App/App/WidgetBridgePlugin.swift|.m` — апка пише снапшот (небо · питання дня ·
  прогрес N/4, все вже локалізоване) в App Group `group.com.hrubyi.arcana` і смикає
  WidgetKit reload. Зареєстровано в app-таргеті.
- `ios/App/ArcanaWidget/ArcanaWidget.swift` — ГОТОВИЙ повний код віджета
  (small + medium, градієнт бренду, stale-стан «питання чекає в застосунку»).
- `App.entitlements` — App Group уже вписаний для основного таргета.
- JS: снапшот пушиться при відкритті журналу і після збереження запису.

## Кроки в Xcode

1. **File → New → Target… → Widget Extension.**
   - Product Name: `ArcanaWidget` (точно так).
   - ❌ ЗНЯТИ галочку «Include Configuration App Intent» (нам треба StaticConfiguration).
   - Embed in Application: App. → Finish. На питання про activate scheme — Activate.
2. Xcode створить папку `ArcanaWidget` зі своїм шаблонним свіфт-файлом
   (`ArcanaWidget.swift`, можливо `ArcanaWidgetBundle.swift`, `ArcanaWidgetLiveActivity.swift`).
   **Видали ВЕСЬ шаблонний .swift-вміст** (Move to Trash), а замість нього
   Add Files… → додай НАШ `ios/App/ArcanaWidget/ArcanaWidget.swift` у таргет ArcanaWidget.
   (Assets.xcassets та Info.plist шаблону залиш.)
3. **App Groups для ОБОХ таргетів:**
   - Таргет App → Signing & Capabilities → **+ App Groups** → додай/постав галочку
     `group.com.hrubyi.arcana` (має підхопити той, що вже в entitlements).
   - Таргет ArcanaWidget → те саме: + App Groups → `group.com.hrubyi.arcana`.
4. Таргет ArcanaWidget → General → Minimum Deployment: **iOS 14.0** (або як у апки).
5. Обери scheme **App** → збірка на пристрій → додай віджет на домашній екран
   (довгий тап → «+» → Arcana). Відкрий апку → журнал → віджет має показати
   сьогоднішнє небо і питання.

## Перевірка

- Віджет до першого відкриття апки за день показує «Today's question is waiting…» —
  це задуманий stale-стан.
- Після відкриття журналу: рядок неба + питання + крапки прогресу.
- Збережи запис → перша крапка заповниться (reload прилітає одразу).
