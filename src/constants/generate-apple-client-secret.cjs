
// src/constants/generate-apple-client-secret.cjs

const jwt = require('jsonwebtoken');
const fs = require('fs');

const TEAM_ID = '5J6P4Q932X';              // напр. 5J6P4Q93ZX
const KEY_ID = 'DUKZLD2Z98';                // напр. DUKZLD2Z98
const CLIENT_ID = 'com.hrubyi.arcana.supabase';  // твій Service ID

// шлях до .p8 файлу від кореня проєкту
const privateKey = fs.readFileSync('./src/constants/AuthKey_DUKZLD2Z98.p8', 'utf8');

const now = Math.floor(Date.now() / 1000);
// ~5 місяців (Apple дозволяє до 6)
const exp = now + 60 * 60 * 24 * 30 * 5;

const payload = {
  iss: TEAM_ID,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: CLIENT_ID,
};

const token = jwt.sign(payload, privateKey, {
  algorithm: 'ES256',
  keyid: KEY_ID,
});

console.log('\nApple Client Secret (JWT):\n');
console.log(token);
console.log('\nСкопіюй це значення в Supabase → Apple → Secret Key (for OAuth)\n');
