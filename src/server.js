require('dotenv').config();

const app = require('./app');
const { runCleanup } = require('./services/cleanupService');

const PORT = process.env.PORT || 3000;

const interval = parseInt(process.env.CLEANUP_INTERVAL, 10) || 60000;
runCleanup().catch((err) => console.error('Cleanup error:', err));
setInterval(() => {
  runCleanup().catch((err) => console.error('Cleanup error:', err));
}, interval);

app.listen(PORT, () => {
  console.log(`Temporary file uploader (mode lokal) berjalan di port ${PORT}`);
});
