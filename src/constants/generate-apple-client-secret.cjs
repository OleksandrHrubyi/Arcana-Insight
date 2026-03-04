
// src/constants/generate-apple-client-secret.cjs

const jwt = require('jsonwebtoken');
const fs = require('fs');

const TEAM_ID = process.env.APPLE_TEAM_ID || '5J6P4Q932X';
const KEY_ID = process.env.APPLE_KEY_ID || 'DUKZLD2Z98';
const CLIENT_ID = process.env.APPLE_CLIENT_ID || 'com.hrubyi.arcana.supabase';

const privateKeyPath = process.env.APPLE_PRIVATE_KEY_PATH;
const privateKey = process.env.APPLE_PRIVATE_KEY || (
  privateKeyPath ? fs.readFileSync(privateKeyPath, 'utf8') : null
);

if (!privateKey) {
  throw new Error('Set APPLE_PRIVATE_KEY or APPLE_PRIVATE_KEY_PATH before generating the Apple client secret.');
}

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
