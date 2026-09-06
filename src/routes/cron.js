const express = require('express');
const { runCleanup } = require('../services/cleanupService');

const router = express.Router();

router.get('/cleanup', async (req, res) => {
  if (process.env.CRON_SECRET) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
  }

  const cleaned = await runCleanup();
  return res.json({ success: true, cleaned });
});

module.exports = router;
