# Arcana Insight — AI Dev Infrastructure Plan

> Мета: AI система яка допомагає соло-розробнику швидше доробити і запустити апку.
> Статус: Планування. Реалізація по фазах.

---

## Архітектура

```
Джерела даних
  ↓
Claude API + CLAUDE.md (мозок / оркестратор)
  ↓
AI Агенти (кожен — окремий скрипт)
  ↓
Виходи (список задач / алерти / фікси)
  ↓
Visual Dashboard (командний центр)
```

---

## Джерела даних

| Джерело | Що дає | Коли |
|---------|--------|------|
| Кодобаза (src/, supabase/) | Vue/TS файли, edge functions, i18n, конфіги | Завжди |
| Jest тести (tests/) | 30+ тест-файлів, результати, coverage | Завжди |
| Supabase Edge Function logs | Помилки, таймаути, AI failures | Фаза 2 |
| Firebase Analytics | Events, retention, funnels | Після релізу |
| RevenueCat | Конверсія, підписки, trial | Після релізу |

---

## Агенти

### Фаза 1 — зараз, до релізу

#### 🔍 Code Scanner
- **Що робить:** Щодня сканує весь проект
- **Знаходить:** TODO, закоментований код, дублі файлів, незакриті i18n ключі, порожні сторінки-заглушки, `display: none` блоки
- **Тригер:** cron щоранку (або вручну)
- **Вихід:** JSON файл зі списком проблем → Dashboard + CLAUDE.md
- **Реалізація:** Node.js скрипт → Claude API

#### 🧪 Test Analyzer
- **Що робить:** Запускає Jest, читає результати, пояснює що і чому впало
- **Знаходить:** Падаючі тести, відсутні тести для нових фіч, coverage gaps
- **Тригер:** Після змін у файлах / вручну
- **Вихід:** Пояснення на людській мові + готовий фікс
- **Реалізація:** `npm test` → результат → Claude API

#### 📋 Daily Briefing
- **Що робить:** Щоранку синтезує стан проекту і видає план на день
- **Враховує:** Результати Code Scanner + Test Analyzer + CLAUDE.md пріоритети
- **Тригер:** cron 9:00 щодня
- **Вихід:** "Сьогодні зроби: 1. ... 2. ... 3. ... Це блокує реліз. Це може почекати."
- **Реалізація:** Node.js скрипт → Claude API → markdown файл

---

### Фаза 2 — паралельно під час розробки

#### 🪲 Log Watcher
- **Що робить:** Витягує логи Supabase Edge Functions через Supabase API
- **Слідкує за:** tarot-reading, personal-horoscope, generate-horoscopes, ritual-*, push-worker
- **Знаходить:** Помилки, таймаути, AI failures (OpenAI/OpenRouter)
- **Тригер:** cron кожну годину
- **Вихід:** Пояснення помилки + причина + рекомендоване виправлення
- **Реалізація:** Supabase logs API → Claude API

#### 🏗 Build Monitor
- **Що робить:** Перевіряє що Quasar build і Capacitor sync проходять
- **Тригер:** Після змін у коді (git hook або вручну)
- **Вихід:** ✅ OK / ❌ зламалось + що саме + як виправити
- **Реалізація:** `quasar build` → парсинг output → Claude API якщо є помилки

---

### Фаза 3 — після релізу

#### 📊 Analytics Agent
- **Що робить:** Firebase + RevenueCat аналіз
- **Знаходить:** Де юзери йдуть, що не конвертує, які фічі не використовують
- **Тригер:** cron щодня / щотижня
- **Вихід:** Тижневий звіт з рекомендаціями

---

## Visual Dashboard

Простий HTML файл (`ai-ops/dashboard.html`) який:
- Читає JSON файли що генерують агенти
- Показує одним поглядом: стан тестів, помилки, задачі на сьогодні, % готовності до релізу
- Запускається локально в браузері (або як Cowork artifact)

**Панелі:**
- 🎯 Launch Progress — % готовності, дні до липня
- 📋 Today's Focus — 3-5 задач від Daily Briefing
- 🧪 Test Status — pass/fail, coverage
- 🪲 Recent Errors — останні помилки з edge functions
- 🔍 Code Issues — список проблем від Code Scanner

---

## Файлова структура

```
ai-ops/
  agents/
    code-scanner.js      ← Фаза 1
    test-analyzer.js     ← Фаза 1
    daily-briefing.js    ← Фаза 1
    log-watcher.js       ← Фаза 2
    build-monitor.js     ← Фаза 2
    analytics-agent.js   ← Фаза 3
  output/
    scan-results.json    ← результати Code Scanner
    test-results.json    ← результати Test Analyzer
    briefing.md          ← щоденний план
    log-errors.json      ← помилки з Supabase
  dashboard.html         ← Visual Dashboard
  config.js              ← Claude API key, налаштування
  README.md              ← як запускати
```

---

## Технічний стек агентів

| Компонент | Технологія |
|-----------|-----------|
| Скрипти агентів | Node.js |
| AI | Claude API (claude-sonnet) |
| Пам'ять проекту | CLAUDE.md |
| Scheduler | node-cron або launchd (macOS) |
| Dashboard | Vanilla HTML + JS (читає JSON) |
| Алерти | Telegram Bot API (опціонально) |

---

## Порядок реалізації

- [ ] **Крок 1:** Code Scanner — базовий скрипт сканування кодобази
- [ ] **Крок 2:** Daily Briefing — щоденний план на основі сканера
- [ ] **Крок 3:** Test Analyzer — автозапуск Jest + аналіз результатів
- [ ] **Крок 4:** Dashboard — HTML дашборд що читає output агентів
- [ ] **Крок 5:** Log Watcher — підключення Supabase logs
- [ ] **Крок 6:** Build Monitor — перевірка білду
- [ ] **Крок 7:** Analytics Agent — після релізу

---

## Статус

| Агент | Статус |
|-------|--------|
| Code Scanner | 🔲 Не розпочато |
| Test Analyzer | 🔲 Не розпочато |
| Daily Briefing | 🔲 Не розпочато |
| Log Watcher | 🔲 Не розпочато |
| Build Monitor | 🔲 Не розпочато |
| Dashboard | 🔲 Не розпочато |
| Analytics Agent | ⏳ Після релізу |

