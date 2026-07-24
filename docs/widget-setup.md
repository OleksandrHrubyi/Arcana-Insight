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
   - ❌ ЗНЯТИ «Include Live Activity» і «Include Control» (новий Xcode вмикає їх
     за замовчуванням — нам не потрібні).
   - ❌ «Include Configuration App Intent» лишити знятою (нам треба StaticConfiguration).
   - Project: App, Embed in Application: App. → Finish. Activate scheme — Activate.
2. Xcode створить папку `ArcanaWidget` зі шаблонними .swift-файлами
   (`ArcanaWidgetBundle.swift`, `ArcanaWidget.swift`).
   **Видали ВСІ шаблонні .swift** (Delete → Move to Trash), а замість них:
   правий клік по папці ArcanaWidget → Add Files to "App"… → вибери наш
   `ios/App/ArcanaWidget/ArcanaWidget.swift` (він уже лежить у цій папці на диску) →
   «Add to targets»: галочка ТІЛЬКИ ArcanaWidget (не App). → Add.
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
