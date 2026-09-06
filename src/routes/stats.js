const express = require('express');
const { getStats, getRecentFiles } = require('../database');

const router = express.Router();

router.get('/stats', async (req, res) => {
  const stats = await getStats();
  res.json({
    success: true,
    total_files: stats.total_files,
    total_storage: stats.total_storage,
    total_downloads: stats.total_downloads
  });
});

router.get('/recent-files', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
  const files = await getRecentFiles(limit);
  res.json({ success: true, files });
});

module.exports = router;
