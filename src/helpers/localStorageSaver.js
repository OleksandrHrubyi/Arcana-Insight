import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'horoscopes_v1';

export async function saveLocal(payload) {
  await Preferences.set({
    key: STORAGE_KEY,
    value: JSON.stringify(payload),
  });
}

export async function loadLocal() {
  const { value } = await Preferences.get({ key: STORAGE_KEY });
  if (!value) return null;
  try { return JSON.parse(value); } catch { return null; }
}
