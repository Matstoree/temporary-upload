const { kv } = require('@vercel/kv');

const FILE_KEY = (id) => `file:${id}`;
const INDEX_KEY = 'files:index';
const EXPIRY_KEY = 'files:expiry';
const STATS_KEY = 'files:stats';

async function insertFile(file) {
  const record = { ...file, download_count: 0 };
  await kv.set(FILE_KEY(file.id), record);
  await kv.zadd(INDEX_KEY, { score: file.uploaded_at, member: file.id });
  if (file.expires_at !== null) {
    await kv.zadd(EXPIRY_KEY, { score: file.expires_at, member: file.id });
  }
  await kv.hincrby(STATS_KEY, 'total_files', 1);
  await kv.hincrby(STATS_KEY, 'total_storage', file.size);
}

async function getFileById(id) {
  return kv.get(FILE_KEY(id));
}

async function deleteFileRecord(id) {
  const file = await getFileById(id);
  await kv.del(FILE_KEY(id));
  await kv.zrem(INDEX_KEY, id);
  await kv.zrem(EXPIRY_KEY, id);
  if (file) {
    await kv.hincrby(STATS_KEY, 'total_files', -1);
    await kv.hincrby(STATS_KEY, 'total_storage', -file.size);
  }
}

async function incrementDownloadCount(id) {
  const file = await getFileById(id);
  if (!file) return;
  file.download_count += 1;
  await kv.set(FILE_KEY(id), file);
  await kv.hincrby(STATS_KEY, 'total_downloads', 1);
}

async function getExpiredFiles() {
  const ids = await kv.zrange(EXPIRY_KEY, 0, Date.now(), { byScore: true });
  const files = await Promise.all(ids.map((id) => getFileById(id)));
  return files.filter(Boolean);
}

async function getStats() {
  const stats = await kv.hgetall(STATS_KEY);
  return {
    total_files: Number(stats?.total_files) || 0,
    total_storage: Number(stats?.total_storage) || 0,
    total_downloads: Number(stats?.total_downloads) || 0
  };
}

async function getRecentFiles(limit) {
  const ids = await kv.zrange(INDEX_KEY, 0, limit - 1, { rev: true });
  const files = await Promise.all(ids.map((id) => getFileById(id)));
  return files.filter(Boolean);
}

async function getAllFiles({ limit = 50, offset = 0, search = '' } = {}) {
  const ids = await kv.zrange(INDEX_KEY, 0, -1, { rev: true });
  const files = (await Promise.all(ids.map((id) => getFileById(id)))).filter(Boolean);
  const filtered = search
    ? files.filter((f) => f.original_name.toLowerCase().includes(search.toLowerCase()))
    : files;
  return filtered.slice(offset, offset + limit);
}

async function countFiles(search = '') {
  if (!search) {
    return kv.zcard(INDEX_KEY);
  }
  const ids = await kv.zrange(INDEX_KEY, 0, -1);
  const files = (await Promise.all(ids.map((id) => getFileById(id)))).filter(Boolean);
  return files.filter((f) => f.original_name.toLowerCase().includes(search.toLowerCase())).length;
}

module.exports = {
  insertFile,
  getFileById,
  deleteFileRecord,
  incrementDownloadCount,
  getExpiredFiles,
  getStats,
  getRecentFiles,
  getAllFiles,
  countFiles
};
