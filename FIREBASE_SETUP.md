# Firebase Analytics Setup Instructions

## ✅ Що вже зроблено:

1. ✅ Встановлено пакети `@capacitor-firebase/analytics` та `firebase`
2. ✅ Створено analytics service (`src/services/analytics.js`)
3. ✅ Додано boot файл для ініціалізації
4. ✅ Додано автоматичний tracking для всіх page views
5. ✅ Додано tracking для login/signup подій

## 📋 Що потрібно зробити:

### 1. Створити Firebase Project

1. Відкрийте https://console.firebase.google.com/
2. Натисніть **"Add project"** або виберіть існуючий проєкт
3. Введіть назву проєкту (наприклад, "Arcana Insight")
4. Увімкніть або вимкніть Google Analytics (рекомендую увімкнути)
5. Натисніть **"Create project"**

### 2. Додати iOS застосунок

1. У Firebase Console виберіть ваш проєкт
2. Натисніть на іконку iOS (⚙️ Settings > Project settings > Add app > iOS)
3. Заповніть форму:
   - **iOS bundle ID**: `com.hrubyi.arcana`
   - **App nickname**: Arcana Insight (опціонально)
   - **App Store ID**: залишити пустим поки що
4. Натисніть **"Register app"**

### 3. Завантажити конфігураційний файл

1. Завантажте файл **GoogleService-Info.plist**
2. Помістіть його в:
   ```
   ios/App/App/GoogleService-Info.plist
   ```
3. Відкрийте Xcode:
   ```bash
   npm run iosopen
   ```
4. Перетягніть файл `GoogleService-Info.plist` у папку `App` в Xcode
5. Переконайтесь, що в діалозі вибрано:
   - ✅ Copy items if needed
   - ✅ Target: App

### 4. Оновити Podfile (iOS)

Відкрийте файл `ios/App/Podfile` і додайте Firebase pods:

```ruby
target 'App' do
  capacitor_pods
  # Add your Pods here

  # Firebase Analytics
  pod 'FirebaseAnalytics'
  pod 'Firebase/Analytics'
end
```

Потім виконайте:
```bash
cd ios/App
pod install
cd ../..
```

### 5. Синхронізувати Capacitor

```bash
npm run iossync
```

### 6. Build та тестування

```bash
npm run party
```

Запустіть застосунок на симуляторі або пристрої та перевірте консоль на наявність:
```
[Analytics] Firebase Analytics initialized
[Analytics] Screen view: menu
```

### 7. Перевірити дані в Firebase Console

1. Відкрийте Firebase Console > Analytics > Events
2. Через 24-48 годин побачите дані (реалтайм данні доступні в DebugView)

## 🔥 Для тестування в реальному часі (DebugView):

### iOS Simulator:
```bash
# В терміналі виконайте:
xcrun simctl spawn booted log config --mode "level:debug" --subsystem com.google.firebase.analytics
```

### iOS Device:
1. В Xcode: Product > Scheme > Edit Scheme
2. Run > Arguments
3. Додайте аргумент: `-FIRAnalyticsDebugEnabled`

Потім відкрийте Firebase Console > Analytics > DebugView для перегляду подій в реальному часі.

## 📊 Які події вже відстежуються:

### Автоматичні:
- `screen_view` - кожна зміна сторінки
- Всі Firebase автоматичні події (app_open, first_open, session_start, etc.)

### Власні:
- `login` - успішний логін (method: apple/google/email)
- `sign_up` - реєстрація (method: apple/google/email)
- `login_email_sent` - відправка OTP на email

## 🎯 Додаткові події, які можна додати:

У вашому коді можна використовувати:

```javascript
import { analytics } from 'src/services/analytics'

// Перегляд карти таро
await analytics.logSelectContent('tarot_card', cardId)

// Поділитися розкладом
await analytics.logShare('tarot_reading', readingId)

// Пошук
await analytics.logSearch(searchTerm)

// Будь-яка власна подія
await analytics.logEvent('custom_event_name', {
  param1: 'value1',
  param2: 'value2'
})

// Встановити user ID (після логіну)
await analytics.setUserId(user.id)

// Встановити user properties
await analytics.setUserProperty('user_tier', 'premium')
```

## ⚠️ Важливо:

- Analytics працює **тільки на нативних платформах** (iOS/Android)
- На веб-версії events не будуть відправлятися
- Перші дані з'являться в консолі через 24-48 годин
- Для реалтайм тестування використовуйте DebugView
- Не забудьте додати `GoogleService-Info.plist` в `.gitignore` для безпеки

## 🔗 Корисні посилання:

- Firebase Console: https://console.firebase.google.com/
- Analytics Events Reference: https://firebase.google.com/docs/reference/android/com/google/firebase/analytics/FirebaseAnalytics.Event
- Capacitor Firebase Docs: https://github.com/capawesome-team/capacitor-firebase
