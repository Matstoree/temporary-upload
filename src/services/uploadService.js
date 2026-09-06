const path = require('path');
const multer = require('multer');
const { put, del } = require('@vercel/blob');
const parseSize = require('../utils/parseSize');

const MAX_FILE_SIZE = parseSize(process.env.MAX_FILE_SIZE);
const DIRECT_UPLOAD_LIMIT = Math.min(MAX_FILE_SIZE, 4 * 1024 * 1024);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (!file.originalname || file.originalname.trim() === '') {
      return cb(new Error('INVALID_FILENAME'));
    }
    cb(null, true);
  },
  limits: {
    fileSize: DIRECT_UPLOAD_LIMIT
  }
});

function sanitizeOriginalName(name) {
  const base = path.basename(name);
  return base.replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 255);
}

async function uploadBufferToBlob(buffer, filename, contentType) {
  return put(filename, buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType
  });
}

async function deleteBlob(url) {
  await del(url);
}

module.exports = {
  upload,
  MAX_FILE_SIZE,
  DIRECT_UPLOAD_LIMIT,
  sanitizeOriginalName,
  uploadBufferToBlob,
  deleteBlob
};
