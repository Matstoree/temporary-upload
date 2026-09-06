const path = require('path');
const express = require('express');
const helmet = require('helmet');

const uploadRoutes = require('./routes/upload');
const fileRoutes = require('./routes/files');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');
const cronRoutes = require('./routes/cron');
const cookieParser = require('./utils/cookieParser');

const app = express();

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(express.json());
app.use(cookieParser);
app.use(express.static(path.join(__dirname, '..', 'public'), {
  index: false,
  maxAge: '1h',
  setHeaders: (res, filePath) => {
    if (/\.html$/.test(filePath)) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'landing.html'));
});

app.get(['/upload', '/documentation'], (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
});

app.use('/api', uploadRoutes);
app.use('/api', statsRoutes);
app.use('/api/cron', cronRoutes);
app.use('/admin', adminRoutes);
app.use('/', fileRoutes);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint tidak ditemukan' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
});

module.exports = app;
