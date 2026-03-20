# Виправлення помилки Authorization Token

## Проблема
Authorization token містить символ нового рядка `\n`, що призводить до помилки:
```
Invalid header value: "Bearer fb9947eb68f65b64e55b1b8346c0dd0fdbebd15\n4a244179115f32c0d23d54648"
```

## Рішення

### 1. Виправлено Edge Function (delete-account)
Додано очищення auth header від `\n` та зайвих пробілів у файлі:
`supabase/functions/delete-account/index.ts:22-23`

### 2. Треба задеплоїти функцію:
```bash
npx supabase login
npx supabase functions deploy delete-account --project-ref rgqfkdhzllhmagrcasav
```

### 3. Якщо помилка залишається - очистити localStorage:

**У браузері (для тестування на веб):**
1. Відкрити DevTools (F12)
2. Application/Storage → Local Storage
3. Видалити всі ключі що починаються з `sb-`
4. Перелогінитися

**На iOS симуляторі/пристрої:**
1. Видалити застосунок
2. Встановити знову
3. Перелогінитися

**Або програмно очистити при запуску (тимчасове рішення):**

В `src/boot/supabase.js` або `src/App.vue` mounted:
```javascript
// Тимчасово очистити токени з \n
const session = await supabase.auth.getSession()
if (session?.data?.session?.access_token?.includes('\n')) {
  console.log('[Auth] Detected corrupted token, clearing...')
  await supabase.auth.signOut()
  localStorage.clear()
  window.location.reload()
}
```

## Причина проблеми
Токен було збережено з `\n` символом, можливо через:
- Копіювання токену з файлу, який мав перенос рядка
- Баг в старій версії Supabase client
- Ручне редагування localStorage

## Перевірка
Після деплою функції та очищення storage, спробувати видалити акаунт знову.
Помилка `Invalid header value` повинна зникнути.
