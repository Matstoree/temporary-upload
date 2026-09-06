const express = require('express');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { head } = require('@vercel/blob');
const { handleUpload } = require('@vercel/blob/client');

const { upload, MAX_FILE_SIZE, sanitizeOriginalName, uploadBufferToBlob } = require('../services/uploadService');
const { insertFile, getFileById } = require('../database');
const { isValidExpiry, calculateExpiresAt } = require('../utils/expiry');
const generateShortId = require('../utils/generateShortId');

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak upload, coba lagi nanti' }
});

async function generateUniqueId() {
  let id = generateShortId();
  let attempts = 0;
  while ((await getFileById(id)) && attempts < 5) {
    id = generateShortId();
    attempts += 1;
  }
  return id;
}

function buildDownloadUrl(req, originalName, id) {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  const ext = path.extname(originalName).toLowerCase();
  const safeExt = /^\.[a-z0-9]{1,10}$/.test(ext) ? ext : '';
  return `${baseUrl}/f/${id}${safeExt}`;
}

router.post('/upload', uploadLimiter, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ success: false, message: 'Ukuran file melebihi batas untuk upload langsung. Gunakan formulir di halaman utama untuk file besar.' });
      }
      return res.status(400).json({ success: false, message: 'Upload gagal: ' + err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File tidak ditemukan' });
    }

    const expiry = req.body.expiry;
    if (!isValidExpiry(expiry)) {
      return res.status(400).json({ success: false, message: 'Expiry tidak valid' });
    }

    const originalName = sanitizeOriginalName(req.file.originalname);

    let blob;
    try {
      blob = await uploadBufferToBlob(req.file.buffer, originalName, req.file.mimetype);
    } catch (blobErr) {
      return res.status(500).json({ success: false, message: 'Gagal menyimpan file ke storage' });
    }

    const id = await generateUniqueId();
    const expiresAt = calculateExpiresAt(expiry);
    const uploadedAt = Date.now();

    try {
      await insertFile({
        id,
        original_name: originalName,
        blob_url: blob.url,
        mime_type: req.file.mimetype,
        size: req.file.size,
        uploaded_at: uploadedAt,
        expires_at: expiresAt
      });
    } catch (dbErr) {
      return res.status(500).json({ success: false, message: 'Gagal menyimpan metadata file' });
    }

    return res.json({
      success: true,
      id,
      filename: originalName,
      size: req.file.size,
      expiry,
      url: buildDownloadUrl(req, originalName, id)
    });
  });
});

router.post('/upload/token', uploadLimiter, async (req, res) => {
  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({
        addRandomSuffix: true,
        maximumSizeInBytes: MAX_FILE_SIZE
      }),
      onUploadCompleted: async () => {}
    });
    return res.json(jsonResponse);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

router.post('/upload/complete', uploadLimiter, async (req, res) => {
  const { url, originalName, expiry } = req.body || {};

  if (!url || !originalName) {
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
  }
  if (!isValidExpiry(expiry)) {
    return res.status(400).json({ success: false, message: 'Expiry tidak valid' });
  }

  let blobInfo;
  try {
    blobInfo = await head(url);
  } catch (err) {
    return res.status(400).json({ success: false, message: 'File tidak ditemukan di storage' });
  }

  const id = await generateUniqueId();
  const safeName = sanitizeOriginalName(originalName);
  const expiresAt = calculateExpiresAt(expiry);
  const uploadedAt = Date.now();

  try {
    await insertFile({
      id,
      original_name: safeName,
      blob_url: url,
      mime_type: blobInfo.contentType,
      size: blobInfo.size,
      uploaded_at: uploadedAt,
      expires_at: expiresAt
    });
  } catch (dbErr) {
    return res.status(500).json({ success: false, message: 'Gagal menyimpan metadata file' });
  }

  return res.json({
    success: true,
    id,
    filename: safeName,
    size: blobInfo.size,
    expiry,
    url: buildDownloadUrl(req, safeName, id)
  });
});

module.exports = router;
