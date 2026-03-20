# Saved Readings Setup Guide

## ✅ Що вже готово

1. **SavedReadingsPage.vue** — сторінка для перегляду історії розкладів
2. **Route додано** — `/readings`
3. **Menu інтеграція** — пункт "My readings" / "Мої розклади"
4. **i18n переклади** — en/uk
5. **Save logic** — автоматичне збереження після AI interpretation
6. **Auth handling** — відображення різних станів для logged in/out користувачів

## 🚀 Що треба зробити для запуску

### 1. Створити Supabase таблицю

Відкрий Supabase SQL Editor і запусти:

```sql
-- Create tarot_readings table
CREATE TABLE IF NOT EXISTS public.tarot_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  spread_type INTEGER NOT NULL,
  cards JSONB NOT NULL,
  question TEXT,
  interpretation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_tarot_readings_user_id ON public.tarot_readings(user_id);
CREATE INDEX idx_tarot_readings_created_at ON public.tarot_readings(created_at DESC);

-- Enable RLS
ALTER TABLE public.tarot_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own readings"
  ON public.tarot_readings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own readings"
  ON public.tarot_readings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own readings"
  ON public.tarot_readings
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own readings"
  ON public.tarot_readings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_tarot_readings_updated_at
  BEFORE UPDATE ON public.tarot_readings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Перевірити роботу

1. **Запусти dev server:**
   ```bash
   quasar dev
   ```

2. **Залогінься** (якщо ще не залогінений)

3. **Зроби tarot reading:**
   - Відкрий Tarot сторінку
   - Вибери кількість карт (1, 3 або 5)
   - Торкнися колоди
   - Вибери всі карти
   - Прийми AI interpretation

4. **Перевір збереження:**
   - В консолі браузера має з'явитися: `Reading saved successfully`
   - Перейди в Menu → My readings
   - Має відобразитися твій розклад

### 3. Перевірити в Supabase

Відкрий Table Editor в Supabase:
- Таблиця: `tarot_readings`
- Має бути запис з твоїм `user_id`

## 🔍 Як це працює

### Автоматичне збереження

Після успішного AI interpretation (TarotOraclePage.vue:1296-1299):

```javascript
// Save reading to Supabase
try {
  await saveReadingToDatabase(data, payload)
} catch (error) {
  console.error('Failed to save reading to database:', error)
}
```

### Що зберігається

- `user_id` — ID користувача
- `spread_type` — кількість карт (1, 3, 5)
- `cards` — масив карт з `id` та `reversed`
- `question` — питання користувача (якщо є)
- `interpretation` — текст AI інтерпретації
- `created_at` — дата створення

### Auth handling

- **Logged in** → reading зберігається автоматично
- **Not logged in** → skip save, показується повідомлення в консолі

## 📱 User Flow

### Залогінений користувач:
1. Робить tarot reading
2. Отримує AI interpretation
3. Reading автоматично зберігається в БД ✅
4. Може переглянути в Menu → My readings
5. Може видалити reading

### Незалогінений користувач:
1. Робить tarot reading
2. Отримує AI interpretation
3. Reading НЕ зберігається (тільки в sessionStorage для поточної сесії)
4. Якщо відкриє My readings → побачить "Sign in to see your readings"

## 🐛 Troubleshooting

### Reading не зберігається

1. **Перевір консоль браузера:**
   - Має бути `Reading saved successfully`
   - Або `User not logged in, skipping save to database`
   - Або error message

2. **Перевір Supabase:**
   - Чи створена таблиця `tarot_readings`?
   - Чи ввімкнено RLS policies?
   - Чи є connection до Supabase?

3. **Перевір auth:**
   ```javascript
   const { data: { user } } = await supabase.auth.getUser()
   console.log('Current user:', user)
   ```

### RLS Policy помилка

Якщо бачиш `new row violates row-level security policy`:
- Перевір, що RLS policies створені
- Перевір, що `auth.uid()` повертає правильний user ID

### Readings не відображаються на сторінці

1. Перевір консоль → `Load readings error`
2. Перевір, що в БД є записи з твоїм `user_id`
3. Перевір Network tab → запит до `/rest/v1/tarot_readings`

## ✨ Готово!

Тепер після кожного tarot reading з AI interpretation, результат автоматично зберігається в історію користувача.
