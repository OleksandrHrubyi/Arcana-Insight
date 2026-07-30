# App Store Connect — metadata (EN primary)

Paste-ready copy for ASC. Char limits noted; all within bounds. Tone: grounded,
factual astronomy framing, no fortune-telling/guarantee claims, no superlatives.

> **v1.0.1 ASTRONOMY REPOSITIONING (4.3(b), owner-approved 2026-07-28):** primary
> identity is a **real night-sky / Moon instrument** (tonight's Moon, best time to
> observe, planet visibility, ISS passes, sky events — all computed on-device with
> real ephemeris) plus a daily reflection **journal**. Tarot/horoscope/zodiac words
> must NOT appear in the App Name, Subtitle, Promotional Text, or the description's
> first two paragraphs — they live in keywords and a secondary "when you want more"
> section only, reached from the Menu. The Arcana brand word STAYS (owner decision
> 2026-07-24); only the descriptor changes to lead with the sky.
>
> **Category:** change primary from Lifestyle to **Reference** (or Education).
> Astronomy tools live there and it reinforces the non-divination identity.
> Suggested secondary: **Lifestyle**.

---

## App information

**App Name** (≤30) — 24
```
Arcana: Night Sky & Moon
```
> Alt if you want the journal in the title: `Arcana: Sky, Moon & Journal` (27).
> uk localization: `Arcana: Небо і Місяць`

**Subtitle** (≤30) — 29
```
Moon, planets & tonight's sky
```

**Promotional Text** (≤170, updatable without review) — ~156
```
See tonight's Moon and sky for your location: phase, best time to observe, planets, ISS passes and upcoming events — real astronomy, computed on your device.
```

**Keywords** (≤100, comma-separated, no spaces after commas) — 94
```
moon phase,stargazing,astronomy,night sky,planets,moon calendar,tarot,horoscope,journal,meteor
```
> Astronomy terms lead. Divination terms kept only as (invisible) search keywords.

**Support URL**
```
https://oleksandrhrubyi.github.io/Arcana-Insight/support.html
```

**Marketing URL** (optional)
```
https://oleksandrhrubyi.github.io/Arcana-Insight/support.html
```

**Privacy Policy URL**
```
https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html
```

---

## Description (≤4000)

```
Arcana turns tonight's real sky into something you can use. Open it and see the Moon exactly as it is right now — its phase, how lit it is, when it rises and sets — over a real photograph of the night sky, all computed on your device for your location.

TONIGHT'S SKY, FOR REAL
• Best time to observe — Arcana finds tonight's genuinely dark window (astronomical twilight minus moonlight) and shows the cloud forecast, so you know when it's actually worth going out.
• The Moon — live phase and illumination, distance in kilometres, apparent size, and the next perigee and apogee (super and micro moons).
• Planets tonight — which are up, where to look (compass point and altitude), how bright they are, and when each one is highest and sets.
• The ISS — real pass predictions for your exact location: when it appears, which way it crosses, how high, and for how long.
• Sky events — eclipses, meteor-shower peaks, solstices and equinoxes, each with a reminder you can switch on.
• On the horizon — sunrise, sunset, moonrise and moonset with their exact compass bearings, plus a Moon calendar you can page through month by month.

Everything is calculated on-device with a real astronomy engine — accurate ephemeris, no account required, works offline, and follows your location.

HOME-SCREEN WIDGET
Keep tonight's Moon phase on your home screen at a glance.

A DAILY REFLECTION JOURNAL
One quiet minute a day: note how you feel and answer a single grounded question, written from what the sky is doing today. Entries stay private on your device and build into a journal you can look back on.

WHEN YOU WANT MORE
Optional extras, tucked away in the Menu: a card of the day, a daily horoscope for your sign, compatibility between two charts, and a full 78-card library.

NO PREDICTIONS
Arcana shows what the sky is doing and asks reflective questions. It never predicts your future — it's a tool for observing, learning and reflecting.

ARCANA PREMIUM
Unlock the full practice:
• Saved history to revisit your reflections and readings over time
• Daily Love and Career horoscope themes
• Full compatibility reports with a complete score breakdown
• Unlimited guided sessions, plus 3-card and 5-card spreads

Look up tonight. Arcana helps you see the sky for what it really is — and take a quiet minute for yourself.

— Subscription —
Arcana Premium is an auto-renewable subscription.
• Options: Monthly or Yearly. Price is shown in the app before purchase.
• Payment is charged to your Apple ID at confirmation of purchase.
• The subscription renews automatically unless canceled at least 24 hours before the end of the current period.
• Manage or cancel anytime in your App Store account settings.

Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html
```

---

## What's New (v1.0.1) (≤4000)

```
Arcana is now built around the real night sky.

• A new astronomy home: tonight's Moon — phase, illumination, rise and set — over a real photo of the sky, for your location
• Sky tab: best time to observe tonight, live Moon data (distance, apparent size, next perigee/apogee), planet visibility with rise/set/highest times, ISS pass predictions, and a sky-events feed (eclipses, meteor peaks, solstices) with reminders
• Sunrise/sunset and moonrise/moonset compass bearings, plus a month Moon calendar
• A home-screen Moon-phase widget
• A daily reflection journal: your mood plus one grounded question from today's sky

Everything is computed on your device — accurate, offline, no account needed.
```

---

## Subscriptions (Monetization)

**Subscription Group — Display Name**
```
Arcana Premium
```

### arcana.premium.monthly
- **Reference Name** (internal): `Arcana Premium Monthly`
- **Display Name** (≤30) — 23
```
Arcana Premium · Monthly
```
- **Description** (≤45) — 43
```
Saved history, all themes, full readings
```

### arcana.premium.yearly
- **Reference Name** (internal): `Arcana Premium Yearly`
- **Display Name** (≤30) — 22
```
Arcana Premium · Yearly
```
- **Description** (≤45) — 41
```
Everything in Premium, billed once a year
```

> Each subscription needs: localized name, price tier, and one **review screenshot**.
> Optional: attach a 3–7 day intro free trial (LR-21).

---

## Screenshot plan (NEW astronomy-first set — regenerate; old journal-first set is stale)

Lead with the instrument. Suggested 8-shot order + captions:
1. Home — "Tonight's Moon, for your sky"           (SkyHomePage — moon over Milky Way)
2. Sky · Best time to observe — "Know when to look up"   (observing-window card)
3. Sky · Moon tonight + calendar — "The Moon, to the kilometre"
4. Sky · Upcoming events — "Never miss an eclipse or meteor peak"  (events + bell)
5. Sky · Planets + ISS — "See what's up, and when"   (visible planets w/ times, ISS)
6. Journal — "A quiet minute with today's sky"       (daily reflection)
7. Card of the day / Horoscope — "Go deeper when you want to"  (secondary)
8. Premium — "The full practice, unlocked"

> Generator: `tests/visual/appstore-shots.spec.js` now shoots this astronomy-first
> set → `app-store/screenshots/{6.9in_1320x2868,6.5in_1242x2688}/{1-home,
> 2-sky-observe,3-sky-moon,4-sky-events,5-sky-visible,6-journal,7-menu,8-premium}.png`
> (regenerated 2026-07-30). Rerun: serve dist/spa on :9010, then
> `PLAYWRIGHT_BASE_URL=http://127.0.0.1:9010 npx playwright test tests/visual/appstore-shots.spec.js`.
> The 8-premium shot's "Purchases unavailable" sticky bar is a web-build artifact
> (no RevenueCat) — retake that one on a real device if you want live pricing.

---

## App Review notes (for the reviewer)
```
Arcana was previously rejected under Guideline 4.3(b). It has been rebuilt around real astronomy.

The app now opens on an astronomy home — tonight's Moon (phase, illumination, rise/set) over a real photo of the night sky, computed for the user's location. The "Sky" tab (bottom navigation) is a genuine observing instrument, all computed ON-DEVICE with the open-source astronomy-engine library (real ephemeris — functionality, not content):
• Best time to observe: tonight's astronomical-dark window minus moonlight, plus a cloud forecast.
• Live Moon data: phase, distance (km), apparent size, next perigee/apogee.
• Planet visibility: which planets are up, compass/altitude, magnitude, and each one's rise/set and meridian-transit (highest) time.
• ISS pass predictions (SGP4) for the user's location.
• A sky-events feed — eclipses, meteor-shower peaks, solstices/equinoxes — each with an optional local-notification reminder.
• Sunrise/sunset and moonrise/moonset compass bearings, and a month Moon calendar.
There is also a home-screen Moon-phase widget and a daily reflection journal (mood + one reflective question derived from today's sky).

Tarot and horoscope are secondary, optional features reached only from the Menu — never the home screen and never a primary navigation tab. The app makes no predictions; all journal prompts are reflective questions.

HOW TO TEST (no account needed):
1. Complete onboarding → you land on the astronomy home.
2. Tap "Sky" in the bottom nav for the full observing tool; tap the event chip on the home to jump to sky events.
3. Tap "Journal" for the daily reflection.
Everything above works signed-out. Account is via email code or Apple Sign In. Premium is an auto-renewable subscription (Monthly/Yearly) — please use a Sandbox account to test purchase/restore.
```

---

## Age rating
- Recommended: **4+** (no divination in the primary experience; astronomy/journal).
  Reviewers may raise it given the optional tarot/horoscope in Menu — 9+/12+ is
  acceptable. Answer the questionnaire honestly.
- App Privacy mapping: Email + Date of Birth = Linked to you; Firebase = Usage Data
  (analytics); RevenueCat = Purchases. Keep consistent with PrivacyInfo.xcprivacy.

---
---

# Українська локалізація (locale: uk)

Додай як окрему локаль у App Store Connect. App Review notes — спільні (англ., вище).

## App information

**App Name** (≤30) — 21
```
Arcana: Небо і Місяць
```

**Subtitle** (≤30) — 25
```
Місяць, планети й небо вночі
```

**Promotional Text** (≤170) — ~150
```
Дивись небо і Місяць саме над тобою: фаза, коли найкраще спостерігати, планети, прольоти МКС і найближчі події — справжня астрономія на твоєму пристрої.
```

**Keywords** (≤100) — ~93
```
фази місяця,астрономія,нічне небо,планети,зорі,таро,гороскоп,щоденник,календар місяця,метеори
```

**Support / Marketing / Privacy URL** — ті самі, що в EN.

---

## Description (≤4000)

```
Arcana перетворює справжнє небо над тобою на щось корисне. Відкрий — і побач Місяць таким, яким він є просто зараз: його фазу, наскільки він освітлений, коли сходить і заходить — на тлі справжнього фото нічного неба, розрахованого на твоєму пристрої для твоєї локації.

НЕБО СЬОГОДНІ — ПО-СПРАВЖНЬОМУ
• Коли найкраще спостерігати — Arcana знаходить справді темне вікно ночі (астрономічні сутінки мінус світло Місяця) і показує прогноз хмарності, щоб ти знав, коли справді варто вийти.
• Місяць — фаза й освітленість наживо, відстань у кілометрах, видимий розмір і найближчі перигей та апогей (супер- і мікромісяць).
• Планети сьогодні — які видно, куди дивитися (сторона світу й висота), наскільки яскраві та коли кожна найвище й заходить.
• МКС — реальні прогнози прольотів для твоєї локації: коли з'явиться, звідки й куди летить, як високо і скільки триває.
• Події неба — затемнення, піки метеорних потоків, сонцестояння й рівнодення, з нагадуванням для кожної.
• Над горизонтом — схід і захід Сонця й Місяця з точними азимутами, а також місячний календар, який можна гортати по місяцях.

Усе обчислюється на пристрої справжнім астрономічним рушієм — точні ефемериди, без акаунта, працює офлайн і зважає на твою локацію.

ВІДЖЕТ НА ЕКРАН
Тримай фазу Місяця сьогодні прямо на домашньому екрані.

ЩОДЕННИК РЕФЛЕКСІЇ
Одна тиха хвилина на день: відзнач настрій і дай відповідь на одне приземлене питання, написане з того, яким є небо сьогодні. Записи лишаються приватними на пристрої й складаються у щоденник.

КОЛИ ЗАХОЧЕШ БІЛЬШЕ
Необов'язкові додатки в меню: карта дня, щоденний гороскоп для твого знака, сумісність двох карт і повна бібліотека з 78 карт.

БЕЗ ПЕРЕДБАЧЕНЬ
Arcana показує, що робить небо, і ставить питання для роздумів. Вона ніколи не передбачає майбутнє — це інструмент, щоб спостерігати, вчитися й міркувати.

ARCANA PREMIUM
Відкрий повну практику:
• Збережена історія, щоб повертатися до рефлексій і розкладів
• Щоденні теми гороскопу «Кохання» і «Кар'єра»
• Повні звіти сумісності з детальним розкладом балів
• Необмежені сесії, розклади на 3 та 5 карт

Підніми погляд угору. Arcana допомагає побачити небо таким, яке воно є — і знайти тиху хвилину для себе.

— Підписка —
Arcana Premium — це автоматично поновлювана підписка.
• Варіанти: місячна або річна. Ціна показана в застосунку до покупки.
• Оплата списується з твого Apple ID при підтвердженні покупки.
• Підписка поновлюється автоматично, якщо не скасувати щонайменше за 24 години до кінця поточного періоду.
• Керувати чи скасувати можна будь-коли в налаштуваннях App Store.

Умови використання (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Політика конфіденційності: https://oleksandrhrubyi.github.io/Arcana-Insight/privacy-policy.html
```

---

## What's New (v1.0.1) (≤4000)

```
Тепер Arcana побудована навколо справжнього нічного неба.

• Нова астрономічна головна: Місяць сьогодні — фаза, освітленість, схід і захід — на тлі справжнього фото неба, для твоєї локації
• Вкладка «Небо»: коли найкраще спостерігати сьогодні, дані Місяця наживо (відстань, видимий розмір, наступний перигей/апогей), видимість планет із часом сходу/заходу/кульмінації, прогнози прольотів МКС і стрічка подій (затемнення, піки метеорів, сонцестояння) з нагадуваннями
• Азимути сходу/заходу Сонця й Місяця та місячний календар
• Віджет фази Місяця на домашній екран
• Щоденник рефлексії: настрій і одне приземлене питання з неба сьогодні

Усе обчислюється на пристрої — точно, офлайн, без акаунта.
```

---

## Subscriptions (локалізація uk)

**Subscription Group — Display Name**
```
Arcana Premium
```

### arcana.premium.monthly
- **Display Name** (≤30) — 24
```
Arcana Premium · Місячна
```
- **Description** (≤45) — 33
```
Історія, всі теми, повні розклади
```

### arcana.premium.yearly
- **Display Name** (≤30) — 22
```
Arcana Premium · Річна
```
- **Description** (≤45) — 33
```
Усе з Premium, оплата раз на рік
```

---

## Screenshot captions (uk)
1. Головна — «Місяць сьогодні, над твоїм небом»
2. Небо · Коли спостерігати — «Знай, коли підняти погляд»
3. Небо · Місяць + календар — «Місяць — до кілометра»
4. Небо · Події — «Не пропусти затемнення чи метеори»
5. Небо · Планети + МКС — «Що видно і коли»
6. Щоденник — «Тиха хвилина з небом сьогодні»
7. Карта дня / Гороскоп — «Глибше, коли захочеш»
8. Premium — «Повна практика, відкрита»
