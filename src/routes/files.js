const express = require('express');
const { Readable } = require('stream');

const { getFileById, deleteFileRecord, incrementDownloadCount } = require('../database');
const { deleteBlob } = require('../services/uploadService');

const router = express.Router();

const UNSAFE_INLINE_TYPES = new Set(['image/svg+xml']);
const PREVIEWABLE_TYPES = /^(image|video|audio)\//;

router.get('/f/:id', async (req, res) => {
  const rawId = req.params.id;
  const dotIndex = rawId.indexOf('.');
  const id = dotIndex === -1 ? rawId : rawId.slice(0, dotIndex);

  const file = await getFileById(id);

  if (!file) {
    return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
  }

  if (file.expires_at !== null && file.expires_at <= Date.now()) {
    await deleteBlob(file.blob_url).catch(() => {});
    await deleteFileRecord(file.id);
    return res.status(404).json({ success: false, message: 'File sudah kedaluwarsa' });
  }

  let blobRes;
  try {
    blobRes = await fetch(file.blob_url);
  } catch (err) {
    return res.status(502).json({ success: false, message: 'Gagal mengambil file dari storage' });
  }

  if (blobRes.status === 404) {
    await deleteFileRecord(file.id);
    return res.status(404).json({ success: false, message: 'File tidak ditemukan' });
  }
  if (!blobRes.ok || !blobRes.body) {
    return res.status(502).json({ success: false, message: 'Gagal mengambil file dari storage' });
  }

  await incrementDownloadCount(file.id);

  const isPreviewable =
    file.mime_type &&
    !UNSAFE_INLINE_TYPES.has(file.mime_type) &&
    (PREVIEWABLE_TYPES.test(file.mime_type) || file.mime_type === 'application/pdf');

  if (file.mime_type) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', file.mime_type);
  }
  if (typeof file.size === 'number') {
    res.setHeader('Content-Length', file.size);
  }

  const disposition = isPreviewable && req.query.download !== '1' ? 'inline' : 'attachment';
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.original_name)}"`);

  Readable.fromWeb(blobRes.body).pipe(res);
});

module.exports = router;
