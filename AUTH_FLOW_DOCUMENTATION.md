# Документація Auth Flow

## 📋 Огляд

Ваш застосунок використовує **passwordless** авторизацію через:
- Email OTP (One-Time Password)
- Apple Sign In
- Google OAuth

## 🔐 Flows

### 1. Email OTP Login (для існуючих користувачів)

**Файли:**
- `src/components/auth/LoginView.vue`
- `src/components/auth/ConfirmEmailCode.vue`

**Процес:**
1. Користувач вводить email на `/login`
2. `supabase.auth.signInWithOtp()` надсилає 6-значний код на email
3. Редірект на `/confirm-code?email=...`
4. Користувач вводить код
5. `supabase.auth.verifyOtp()` підтверджує код
6. **Автоматично створюється профіль в `app_users`** (якщо не існує)
7. Редірект на `/` (home page)

**Дані в БД:**
```javascript
{
  id: user.id,          // з Supabase Auth
  email: user.email,    // з Supabase Auth
  name: null,           // Login не має name
  date_of_birth: null   // Login не має date_of_birth
}
```

---

### 2. Email OTP Signup (для нових користувачів)

**Файли:**
- `src/components/auth/SignUpScene.vue`
- `src/components/auth/ConfirmEmailCode.vue`

**Процес:**
1. Користувач вводить `name`, `email`, `dateOfBirth` на `/sign-up`
2. `supabase.auth.signInWithOtp()` надсилає код
3. Редірект на `/confirm-code?email=...&name=...&dateOfBirth=...`
4. Користувач вводить код
5. `supabase.auth.verifyOtp()` підтверджує код
6. **Створюється профіль в `app_users`** з даними з query params
7. Редірект на `/`

**Дані в БД:**
```javascript
{
  id: user.id,
  email: user.email,
  name: name,              // з форми SignUp
  date_of_birth: dateOfBirth  // з форми SignUp
}
```

---

### 3. Apple Sign In

**Файли:**
- `src/components/auth/LoginView.vue` (метод `loginWithApple`)
- `src/components/auth/SignUpScene.vue` (метод `loginWithApple`)

**Процес:**
1. Користувач натискає кнопку Apple
2. `SignInWithApple.authorize()` відкриває нативний Apple login
3. `supabase.auth.signInWithIdToken()` обробляє Apple token
4. **Створюється профіль в `app_users`**
5. Редірект на `/`

**Дані в БД:**
```javascript
{
  id: user.id,
  email: user.email,
  name: user.user_metadata?.name || user.user_metadata?.full_name || null
}
```

---

### 4. Google OAuth

**Файли:**
- `src/components/auth/LoginView.vue` (метод `loginWithGoogle`)
- `src/components/auth/SignUpScene.vue` (метод `loginWithGoogle`)
- `src/stores/authStore.js` (callback handler)

**Процес:**
1. Користувач натискає кнопку Google
2. `supabase.auth.signInWithOAuth()` редірект на Google
3. Користувач авторизується на Google
4. Google редірект назад на ваш сайт
5. **`authStore.js` перехоплює `SIGNED_IN` event**
6. **Автоматично створюється профіль в `app_users`**

**Дані в БД:**
```javascript
{
  id: user.id,
  email: user.email,
  name: user.user_metadata?.name || user.user_metadata?.full_name || null
}
```

---

### 5. Password Reset

**Файли:**
- `src/pages/ResetPasswordPage.vue`

**Процес:**
1. Користувач отримує reset link на email (через Supabase Dashboard або іншу функцію)
2. Link містить `#access_token=...&refresh_token=...`
3. `ResetPasswordPage` парсить токени
4. `supabase.auth.setSession()` встановлює сесію
5. Користувач вводить новий пароль
6. `supabase.auth.updateUser({ password })` оновлює пароль
7. **Профіль вже існує** (не потрібно створювати)

---

## 🛡️ Auth State Management

**Файл:** `src/stores/authStore.js`

**Функція `ensureUserProfile()`:**
- Викликається автоматично при `initAuth()` і `SIGNED_IN` event
- Перевіряє чи існує профіль в `app_users`
- Створює профіль якщо не існує
- **Це fallback для будь-яких методів авторизації**

**Коли викликається:**
- При завантаженні застосунку
- При логіні через Google OAuth (callback)
- При логіні через Apple (якщо профіль не був створений)
- При будь-якій зміні auth state

---

## 📊 Таблиця `app_users`

**Структура:**
```sql
CREATE TABLE app_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  date_of_birth TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Політики RLS:**
- User може читати свій профіль: `id = auth.uid()`
- User може оновлювати свій профіль: `id = auth.uid()`
- Service role може створювати/видаляти

---

## ✅ Що було виправлено

### 1. ConfirmEmailCode.vue (лінії 163-189)
- ✅ Додано створення профілю після OTP verification
- ✅ Використовує дані з route query params (name, dateOfBirth)
- ✅ Не блокує логін якщо профіль не створився

### 2. LoginView.vue (лінії 94-102)
- ✅ Додано створення профілю після Apple login
- ✅ Витягує name з `user_metadata`

### 3. SignUpScene.vue (лінії 223-231)
- ✅ Додано створення профілю після Apple signup
- ✅ Витягує name з `user_metadata`

### 4. authStore.js (лінії 16-63)
- ✅ Додано `ensureUserProfile()` функцію
- ✅ Автоматично створює профіль для Google OAuth
- ✅ Fallback для всіх інших методів

---

## 🧪 Тестування

### Email OTP Login:
1. Відкрити `/login`
2. Ввести email
3. Ввести OTP код з email
4. Перевірити що запис з'явився в `app_users`

### Email OTP Signup:
1. Відкрити `/sign-up`
2. Ввести name, email, date of birth
3. Ввести OTP код
4. Перевірити що в `app_users` є name та date_of_birth

### Apple Login:
1. Натиснути кнопку Apple на `/login` або `/sign-up`
2. Авторизуватись через Apple
3. Перевірити що в `app_users` є email та name (якщо Apple надав)

### Google OAuth:
1. Натиснути кнопку Google на `/login` або `/sign-up`
2. Авторизуватись через Google
3. Після redirect перевірити консоль: `[AuthStore] Creating user profile`
4. Перевірити що в `app_users` є email та name

---

## 🚨 Важливі примітки

1. **Створення профілю не блокує логін** - якщо профіль не створився, користувач все одно може увійти
2. **`ensureUserProfile()` є fallback** - навіть якщо профіль не створився в конкретному flow, він буде створений через authStore
3. **Email завжди є** - всі методи авторизації вимагають email
4. **Name опційний** - Login через email не має name, тільки Signup та OAuth
5. **Використовуємо `upsert`** - якщо профіль вже існує, він не перезапишеться

---

## 📝 TODO (майбутнє)

- [ ] Додати сторінку "Forgot Password" для запиту reset link
- [ ] Додати валідацію date_of_birth формату
- [ ] Додати можливість оновлювати профіль після логіну
- [ ] Розглянути використання Database Trigger замість ручного створення профілю
- [ ] Додати error tracking для випадків коли профіль не створився
