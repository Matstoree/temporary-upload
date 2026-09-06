const crypto = require('crypto');
const { kv } = require('@vercel/kv');

const SESSION_COOKIE_NAME = 'tfu_admin_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const SESSION_KEY = (token) => `admin:session:${token}`;

function safeCompare(a, b) {
  const bufA = Buffer.from(String(a || ''));
  const bufB = Buffer.from(String(b || ''));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufB, bufB);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function checkCredentials(username, password) {
  const validUser = process.env.ADMIN_USERNAME || '';
  const validPass = process.env.ADMIN_PASSWORD || '';

  if (!validUser || !validPass) {
    console.warn('ADMIN_USERNAME/ADMIN_PASSWORD belum diset — login admin dinonaktifkan');
    return false;
  }

  return safeCompare(username, validUser) && safeCompare(password, validPass);
}

async function createSession() {
  const token = crypto.randomBytes(32).toString('hex');
  await kv.set(SESSION_KEY(token), true, { px: SESSION_TTL_MS });
  return token;
}

async function isValidSession(token) {
  if (!token) return false;
  return Boolean(await kv.get(SESSION_KEY(token)));
}

async function destroySession(token) {
  if (token) await kv.del(SESSION_KEY(token));
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  checkCredentials,
  createSession,
  isValidSession,
  destroySession
};
