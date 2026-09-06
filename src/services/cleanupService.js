const { getExpiredFiles, deleteFileRecord } = require('../database');
const { deleteBlob } = require('./uploadService');

async function runCleanup() {
  const expiredFiles = await getExpiredFiles();
  let cleaned = 0;

  for (const file of expiredFiles) {
    await deleteBlob(file.blob_url).catch((err) => {
      console.error(`Gagal menghapus file storage ${file.id}:`, err.message);
    });
    await deleteFileRecord(file.id);
    cleaned += 1;
  }

  return cleaned;
}

module.exports = { runCleanup };
