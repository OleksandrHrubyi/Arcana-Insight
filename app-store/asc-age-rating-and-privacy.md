# ASC шпаргалка — Age Rating + App Privacy (LR-16)

> Готові відповіді для App Store Connect. Складено з **реального коду** (2026-06-23).
> Англійські підписи опцій = як в ASC UI (щоб клікати один-в-один).
> Принцип: **відповідати чесно**. Нічого не приховувати, нічого зайвого не додавати.

---

## ЧАСТИНА 1 — AGE RATING (віковий рейтинг)

ASC: **App Information → Age Rating → Edit / Set Up Age Rating**.
(Нова система Apple, 2025–2026: рівні **4+ / 9+ / 13+ / 16+ / 18+**.)

Застосунок — таро/гороскопи/астрологія = **розвага**. Немає насильства, сексу, лайки, алкоголю/наркотиків, азартних ігор, жахів, медичних порад, UGC/чатів.

### Відповіді на анкету (усе = None / No)

| Питання анкети | Відповідь |
|---|---|
| Violence — Cartoon or Fantasy | **None** |
| Violence — Realistic | **None** |
| Sexual Content or Nudity | **None** |
| Profanity or Crude Humor | **None** |
| Alcohol, Tobacco, or Drug Use or References | **None** |
| Mature/Suggestive Themes | **None** |
| Horror/Fear Themes | **None** |
| Medical/Treatment Information | **None** |
| Gambling (simulated) | **None** |
| Contests | **None** |
| Unrestricted Web Access | **No** *(зовнішні лінки Privacy/EULA відкриваються у системному браузері, всередині застосунку браузера немає)* |
| Gambling and Contests | **No** |
| **Made for Kids** | **No** |
| User-generated content / messaging між юзерами | **No** *(немає соц-функцій, чату, шерингу)* |

### Очікуваний результат
→ **4+** (чесні відповіді дають саме це).

> ⚠️ **Нюанс реальності:** ревʼюер Apple іноді вручну піднімає fortune-telling/таро-застосунки. Прямого пункту «віщування» в анкеті **немає**, тож підняти самому ти не можеш — лиши **4+**, як дала анкета. Якщо рев'ю присвоїть вище — це нормально, погоджуйся, не сперечайся.
>
> 🔎 **Що НЕ робити:** не став «Medical/Treatment» через те, що гороскоп «радить». Це розвага, не медицина. Не став «Horror» — таро це не жахи.

---

## ЧАСТИНА 2 — APP PRIVACY (nutrition label)

ASC: **App Privacy → Get Started / Edit**.

### Крок 0 — Чи збираєте ви дані?
**Yes, we collect data from this app.**

### Крок 1 — Які типи даних (Data Types) → постав ✅ тільки на ці:

| Apple data type | Збираємо? | Чому (наш код) |
|---|---|---|
| **Contact Info → Name** | ✅ Yes | ім'я в Account/профілі (`full_name`) |
| **Contact Info → Email Address** | ✅ Yes | Supabase Auth (логін) |
| **Identifiers → User ID** | ✅ Yes | Supabase user-id → Firebase `setUserId`, RevenueCat `appUserID` |
| **Identifiers → Device ID** | ✅ Yes | APNs push-токен (`register-device`) для сповіщень |
| **Purchases → Purchase History** | ✅ Yes | RevenueCat (підписки) |
| **Usage Data → Product Interaction** | ✅ Yes | Firebase Analytics (екрани, кліки, воронка) |
| **User Content → Other User Content** | ✅ Yes | текст питання таро (зберігається у `tarot_readings` для premium) |
| **Other Data → Other Data Types** | ✅ Yes | дата народження + місто народження (для гороскопу/асценденту) |

**Усі інші типи — НЕ збираємо** (сміливо лишай порожніми):
Health & Fitness · Financial Info (крім purchases) · **Precise/Coarse Location** *(місто народження вводиться вручну — це не геолокація пристрою)* · Sensitive Info · Contacts · Photos/Videos · Audio · Browsing History · Search History · Diagnostics/Crash *(Crashlytics не підключено — лише Analytics)*.

### Крок 2 — Для КОЖНОГО обраного типу Apple питає 3 речі. Ось відповіді:

> Скрізь однаково: **Linked to identity = Yes**, **Used for tracking = No**.
> Відрізняється лише **Purpose** (мета).

| Data type | Linked to you? | Used for tracking? | Purposes (мета) |
|---|---|---|---|
| Name | **Yes** | **No** | App Functionality |
| Email Address | **Yes** | **No** | App Functionality |
| User ID | **Yes** | **No** | App Functionality, **Analytics** |
| Device ID | **Yes** | **No** | App Functionality *(push-сповіщення)* |
| Purchase History | **Yes** | **No** | App Functionality |
| Product Interaction | **Yes** | **No** | **Analytics** |
| Other User Content (питання таро) | **Yes** | **No** | App Functionality |
| Other Data Types (DOB + місто) | **Yes** | **No** | App Functionality |

> **Used for tracking = No** скрізь — бо в застосунку немає IDFA/ATT/реклами (`NSPrivacyTracking=false`). Це також означає, що **банер App Tracking Transparency не потрібен**.

---

## ЧАСТИНА 3 — Куди йдуть дані (для себе / для політики)

| Сервіс | Що отримує | Примітка |
|---|---|---|
| **Supabase** | email, ім'я, DOB, місто, user-id | наша БД (бекенд) |
| **Firebase Analytics** | user-id, події взаємодії | аналітика, без IDFA |
| **RevenueCat** | user-id, статус підписки | біллінг |
| **Open-Meteo** (geocode) | лише **назву міста** | без DOB, без ідентифікації — анонімний запит |
| **OpenAI / OpenRouter** | знак/місячний знак + (опц.) текст питання таро | генерація тексту; питання — вільний текст користувача |

---

## ✅ Розбіжності закрито (2026-06-23)

1. **Device ID** — ДОДАНО в `ios/App/App/PrivacyInfo.xcprivacy` (Linked=true, Tracking=false, Purpose=AppFunctionality). Маніфест валідний (`plutil -lint OK`).

2. **Текст питання таро** — перевірено: **зберігається** у таблиці `tarot_readings` (`saveReadingToDatabase`, premium-only, рядок користувача) → це User Content. Додано **Other User Content** і в маніфест, і в анкету вище. Сервер `tarot-reading` питання **не** зберігає (лише шле в OpenAI і повертає).

Тепер маніфест декларує **8 типів**: Email, Name(Other? — див. нижче), User ID, Device ID, Product Interaction, Purchase History, Other User Content, Other Data Types. Анкета ASC має збігатися 1:1.

> Дрібниця на майбутнє: ім'я (`full_name`) у маніфесті покрите під `OtherDataTypes` разом із DOB/містом. В анкеті ASC я радив виокремити **Contact Info → Name** для точності — це не конфлікт (обидва Linked/AppFunctionality), просто детальніше. Якщо хочеш ідеальної відповідності 1:1, можна або винести Name окремим типом і в маніфесті, або в анкеті теж лишити ім'я під «Other». Будь-який варіант чесний.

---

## TL;DR (за 30 секунд)
- **Age Rating:** усе **None/No** → **4+**. Made for Kids = No.
- **App Privacy:** збираємо 8 типів (Name, Email, User ID, Device ID, Purchase History, Product Interaction, Other User Content=питання таро, Other=DOB+місто). Скрізь **Linked=Yes, Tracking=No**. ATT-банер не потрібен.
- Маніфест `PrivacyInfo.xcprivacy` оновлено й валідний — збігається з анкетою.
