// src/boot/push.js
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from 'boot/supabase';

let listenersInited = false;

export async function initPushListeners() {
  if (!Capacitor.isNativePlatform()) return;
  if (listenersInited) return;
  listenersInited = true;

  console.log('[push] init listeners');

  await PushNotifications.addListener('registration', async (token) => {
    const value = token?.value;
    console.log('🔥 PUSH TOKEN:', value);

    if (!value) return;

    localStorage.setItem('push_token', value);

    const { error } = await supabase.from('push_devices').upsert(
      {
        token: value,
        platform: Capacitor.getPlatform(),
        enabled: true,
      },
      { onConflict: 'token' }
    );

    if (error) console.log('[push] upsert error:', error);
  });

  await PushNotifications.addListener('registrationError', (err) => {
    console.error('[push] registrationError', err);
  });
}

export async function enablePush(locale) {
  if (!Capacitor.isNativePlatform()) return null;

  const perm = await PushNotifications.requestPermissions();
  console.log('[push] permission:', perm);

  if (perm.receive !== 'granted') return null;

  await PushNotifications.register();
  console.log('[push] register() called');
  console.log(locale, 'locale');
  // locale можна оновити пізніше, коли token вже в localStorage
  return true;
}
