# Telegram Authentication Setup

## 📋 Крок 1: Створити Telegram Bot

### 1.1 Відкрити BotFather
1. Відкрийте Telegram
2. Знайдіть `@BotFather`
3. Натисніть `/start`

### 1.2 Створити нового бота
```
/newbot
```

Введіть:
- **Name**: Arcana Insight Auth (або будь-яка назва)
- **Username**: arcana_insight_auth_bot (має закінчуватись на `_bot`)

BotFather видасть вам **Bot Token**:
```
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

⚠️ **ЗБЕРЕЖІТЬ ЦЕЙ TOKEN!**

### 1.3 Налаштувати домен для Login Widget
```
/setdomain
```

Виберіть вашого бота, потім введіть домен:
```
rgqfkdhzllhmagrcasav.supabase.co
```

Або якщо у вас є власний домен:
```
your-domain.com
```

---

## 📋 Крок 2: Додати Bot Token в Supabase

### 2.1 Відкрити Supabase Dashboard
https://supabase.com/dashboard/project/rgqfkdhzllhmagrcasav/settings/vault

### 2.2 Додати Secret
1. Перейдіть до **Settings** → **Vault** (або **Edge Functions** → **Secrets**)
2. Додайте новий secret:
   - **Name**: `TELEGRAM_BOT_TOKEN`
   - **Value**: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz` (ваш token)

---

## 📋 Крок 3: Deploy Edge Function

Після того як я створю код, виконайте:

```bash
npx supabase functions deploy telegram-auth --project-ref rgqfkdhzllhmagrcasav
```

---

## 🔐 Як працює Telegram Auth

### Для веб (браузер):
1. Користувач натискає кнопку Telegram
2. Відкривається Telegram Login Widget (popup)
3. Користувач авторизується в Telegram
4. Telegram повертає дані: `id`, `first_name`, `username`, `photo_url`, `auth_date`, `hash`
5. Ваш код відправляє ці дані на Edge Function
6. Edge Function перевіряє `hash` (щоб переконатись що дані від Telegram)
7. Створюється користувач в Supabase Auth
8. Користувач залогінений

### Для iOS/Android (нативний):
1. Користувач натискає кнопку Telegram
2. Відкривається Telegram app через deep link
3. (Потребує більш складної реалізації - можна зробити пізніше)

---

## ⚙️ Додаткові налаштування (опціонально)

### Додати аватар боту:
```
/setuserpic
```

### Додати опис боту:
```
/setdescription
```
Текст:
```
Authorization bot for Arcana Insight app
```

### Додати короткий опис:
```
/setabouttext
```
Текст:
```
Sign in to Arcana Insight
```

---

## 🧪 Тестування

### Локальне тестування:
1. Запустити dev сервер: `npm run dev`
2. Відкрити `/login`
3. Натиснути кнопку Telegram
4. Авторизуватись через Telegram
5. Перевірити що користувач створений в Supabase

### Production:
Після deploy на production оновіть домен в BotFather на ваш production домен.

---

## 🔒 Безпека

- ✅ Bot Token зберігається в Supabase Secrets (не в коді)
- ✅ Hash перевірка запобігає підробці даних
- ✅ Не зберігаємо чутливі дані в localStorage
- ✅ Використовуємо HTTPS тільки

---

## 📝 Примітки

- Telegram не надає email (на відміну від Google/Apple)
- Можна отримати тільки: `id`, `first_name`, `last_name`, `username`, `photo_url`
- В базі даних email буде: `telegram_{telegram_id}@arcana-insight.app` (фейковий email)
- Користувач може додати email пізніше в налаштуваннях
