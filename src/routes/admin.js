const express = require('express');
const rateLimit = require('express-rate-limit');

const { getFileById, deleteFileRecord, getAllFiles, countFiles } = require('../database');
const { deleteBlob } = require('../services/uploadService');
const {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  checkCredentials,
  createSession,
  isValidSession,
  destroySession
} = require('../services/adminAuth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak percobaan login, coba lagi nanti' }
});

async function requireAdmin(req, res, next) {
  const token = req.cookies ? req.cookies[SESSION_COOKIE_NAME] : null;
  if (!(await isValidSession(token))) {
    return res.status(401).json({ success: false, message: 'Belum login sebagai admin' });
  }
  next();
}

router.post('/api/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username dan password wajib diisi' });
  }
  if (!checkCredentials(username, password)) {
    return res.status(401).json({ success: false, message: 'Username atau password salah' });
  }

  const token = await createSession();
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: req.protocol === 'https',
    maxAge: SESSION_TTL_MS
  });

  return res.json({ success: true, message: 'Login berhasil' });
});

router.post('/api/logout', async (req, res) => {
  const token = req.cookies ? req.cookies[SESSION_COOKIE_NAME] : null;
  await destroySession(token);
  res.clearCookie(SESSION_COOKIE_NAME);
  return res.json({ success: true, message: 'Logout berhasil' });
});

router.get('/api/session', async (req, res) => {
  const token = req.cookies ? req.cookies[SESSION_COOKIE_NAME] : null;
  return res.json({ success: true, authenticated: await isValidSession(token) });
});

router.get('/api/files', requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const search = (req.query.search || '').trim();

  const files = await getAllFiles({ limit, offset, search });
  const total = await countFiles(search);

  return res.json({ success: true, files, total, limit, offset });
});

router.delete('/api/files/:id', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const file = await getFileById(id);

  if (!file) {
    return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
  }

  await deleteBlob(file.blob_url).catch((err) => {
    console.error('Gagal menghapus file di storage:', err.message);
  });
  await deleteFileRecord(id);

  return res.json({ success: true, message: 'File dihapus oleh admin' });
});

module.exports = router;
