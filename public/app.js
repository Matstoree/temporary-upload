import { upload as uploadToBlob } from 'https://esm.sh/@vercel/blob@0.27.1/client';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const selectedFile = document.getElementById('selectedFile');
const selectedName = document.getElementById('selectedName');
const selectedSize = document.getElementById('selectedSize');
const clearFileBtn = document.getElementById('clearFileBtn');
const expirySelect = document.getElementById('expiry');
const uploadBtn = document.getElementById('uploadBtn');
const progressWrap = document.getElementById('progressWrap');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const errorMessage = document.getElementById('errorMessage');

const uploadPanel = document.getElementById('uploadPanel');
const resultPanel = document.getElementById('resultPanel');
const resFilename = document.getElementById('resFilename');
const resSize = document.getElementById('resSize');
const resExpiry = document.getElementById('resExpiry');
const resUrl = document.getElementById('resUrl');
const copyBtn = document.getElementById('copyBtn');
const openBtn = document.getElementById('openBtn');
const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');

const statFiles = document.getElementById('statFiles');
const statStorage = document.getElementById('statStorage');
const recentList = document.getElementById('recentList');

const themeToggle = document.getElementById('themeToggle');
const iconMoon = document.getElementById('iconMoon');
const iconSun = document.getElementById('iconSun');

const uploadView = document.getElementById('uploadView');
const docsView = document.getElementById('docs');
const navLinks = document.querySelectorAll('.nav-links a[data-view]');

const navMenu = document.getElementById('navLinks');
const navToggle = document.getElementById('navToggle');
const iconBurger = document.getElementById('iconBurger');
const iconClose = document.getElementById('iconClose');

function closeNavMenu() {
  navMenu.classList.remove('open');
  navToggle.setAttribute('aria-expanded', 'false');
  iconBurger.classList.remove('hidden');
  iconClose.classList.add('hidden');
}

navToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = navMenu.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
  iconBurger.classList.toggle('hidden', isOpen);
  iconClose.classList.toggle('hidden', !isOpen);
});

document.addEventListener('click', (e) => {
  if (!navMenu.classList.contains('open')) return;
  if (navMenu.contains(e.target) || navToggle.contains(e.target)) return;
  closeNavMenu();
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 640) closeNavMenu();
});

function pathForView(view) {
  return view === 'docs' ? '/documentation' : '/upload';
}

function viewForPath(pathname) {
  return pathname === '/documentation' ? 'docs' : 'upload';
}

function showView(view, updateUrl) {
  uploadView.classList.toggle('hidden', view !== 'upload');
  docsView.classList.toggle('hidden', view !== 'docs');
  navLinks.forEach((link) => link.classList.toggle('active', link.dataset.view === view));
  if (updateUrl) {
    history.pushState({ view }, '', pathForView(view));
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    showView(link.dataset.view, true);
    closeNavMenu();
  });
});

window.addEventListener('popstate', () => {
  showView(viewForPath(location.pathname), false);
});

showView(viewForPath(location.pathname), false);

let currentFile = null;

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function clearError() {
  errorMessage.classList.add('hidden');
  errorMessage.textContent = '';
}

function setFile(file) {
  currentFile = file;
  selectedName.textContent = file.name;
  selectedSize.textContent = formatSize(file.size);
  selectedFile.classList.remove('hidden');
  clearError();
}

function resetFileSelection() {
  currentFile = null;
  fileInput.value = '';
  selectedFile.classList.add('hidden');
}

browseBtn.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('click', (e) => {
  if (e.target === browseBtn) return;
  fileInput.click();
});
dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) setFile(fileInput.files[0]);
});

['dragenter', 'dragover'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
});
['dragleave', 'drop'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
});
dropzone.addEventListener('drop', (e) => {
  if (e.dataTransfer.files.length) setFile(e.dataTransfer.files[0]);
});

clearFileBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  resetFileSelection();
});

function setUploading(state) {
  uploadBtn.disabled = state;
  progressWrap.classList.toggle('hidden', !state);
  if (state) {
    progressFill.style.width = '0%';
    progressLabel.textContent = 'Mengunggah… 0%';
  }
}

uploadBtn.addEventListener('click', async () => {
  clearError();

  if (!currentFile) {
    showError('Pilih file untuk diunggah terlebih dahulu.');
    return;
  }

  setUploading(true);

  try {
    const blobResult = await uploadToBlob(currentFile.name, currentFile, {
      access: 'public',
      handleUploadUrl: '/api/upload/token',
      onUploadProgress: (progress) => {
        const percent = Math.round(progress.percentage);
        progressFill.style.width = percent + '%';
        progressLabel.textContent = 'Mengunggah… ' + percent + '%';
      }
    });

    const res = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: blobResult.url,
        originalName: currentFile.name,
        expiry: expirySelect.value
      })
    });

    let data;
    try {
      data = await res.json();
    } catch (err) {
      setUploading(false);
      showError('Server mengirim respons yang tidak terduga. Coba lagi.');
      return;
    }

    setUploading(false);

    if (!data.success) {
      showError(data.message || 'Upload gagal. Coba lagi.');
      return;
    }

    showResult(data);
    loadStats();
    loadRecentFiles();
  } catch (err) {
    setUploading(false);
    showError('Tidak bisa menghubungi server. Periksa koneksi kamu dan coba lagi.');
  }
});

function showResult(data) {
  resFilename.textContent = data.filename;
  resSize.textContent = formatSize(data.size);
  resExpiry.textContent = expiryLabel(data.expiry);
  resUrl.value = data.url;

  uploadPanel.classList.add('hidden');
  resultPanel.classList.remove('hidden');
}

function expiryLabel(value) {
  const map = {
    '5m': '5 Menit', '15m': '15 Menit', '30m': '30 Menit',
    '1h': '1 Jam', '1d': '1 Hari', '3d': '3 Hari', '1w': '1 Minggu',
    permanent: 'Permanen'
  };
  return map[value] || value;
}

copyBtn.addEventListener('click', () => {
  resUrl.select();
  navigator.clipboard.writeText(resUrl.value);
  copyBtn.textContent = 'Tersalin';
  setTimeout(() => { copyBtn.textContent = 'Salin'; }, 1500);
});

openBtn.addEventListener('click', () => {
  window.open(resUrl.value, '_blank');
});

uploadAnotherBtn.addEventListener('click', () => {
  resetFileSelection();
  resultPanel.classList.add('hidden');
  uploadPanel.classList.remove('hidden');
  clearError();
});

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (!data.success) {
      console.error('GET /api/stats gagal:', data.message);
      setStatsUnavailable();
      return;
    }
    statFiles.classList.remove('skeleton');
    statStorage.classList.remove('skeleton');
    statFiles.textContent = data.total_files;
    statStorage.textContent = formatSize(data.total_storage);
  } catch (err) {
    console.error('GET /api/stats error:', err);
    setStatsUnavailable();
  }
}

function setStatsUnavailable() {
  statFiles.classList.remove('skeleton');
  statStorage.classList.remove('skeleton');
  statFiles.textContent = '—';
  statStorage.textContent = '—';
}

async function loadRecentFiles() {
  try {
    const res = await fetch('/api/recent-files?limit=8');
    const data = await res.json();
    if (!data.success) {
      console.error('GET /api/recent-files gagal:', data.message);
      return;
    }
    renderRecentFiles(data.files);
  } catch (err) {
    console.error('GET /api/recent-files error:', err);
  }
}

function remainingLabel(expiresAt) {
  if (expiresAt === null) return { text: 'Permanen', percent: 100 };
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return { text: 'Kedaluwarsa', percent: 0 };
  const detik = Math.floor(remaining / 1000) % 60;
  const menit = Math.floor(remaining / (1000 * 60)) % 60;
  const jam = Math.floor(remaining / (1000 * 60 * 60)) % 24;
  const hari = Math.floor(remaining / (1000 * 60 * 60 * 24));
  let text = '';
  if (hari) text = hari + ' hr ' + jam + ' jam lagi';
  else if (jam) text = jam + ' jam ' + menit + ' mnt lagi';
  else if (menit) text = menit + ' mnt ' + detik + ' dtk lagi';
  else text = detik + ' dtk lagi';
  return { text, remaining };
}

function renderRecentFiles(files) {
  if (!files.length) {
    recentList.innerHTML = '<p class="empty-state">Belum ada file yang diunggah — jadilah yang pertama.</p>';
    return;
  }

  recentList.innerHTML = '';
  files.forEach((file) => {
    const row = document.createElement('div');
    row.className = 'recent-item';
    row.dataset.uploadedAt = file.uploaded_at;
    row.dataset.expiresAt = file.expires_at === null ? '' : file.expires_at;

    row.innerHTML = `
      <div class="recent-item-top">
        <span class="recent-name">${escapeHtml(file.original_name)}</span>
        <span class="recent-meta">${formatSize(file.size)} · ${file.download_count} DL</span>
      </div>
      <div class="fuse-track"><div class="fuse-fill" style="width:100%"></div></div>
    `;
    recentList.appendChild(row);
  });

  updateFuseBars();
}

function updateFuseBars() {
  document.querySelectorAll('.recent-item').forEach((row) => {
    const uploadedAt = parseInt(row.dataset.uploadedAt, 10);
    const expiresAtRaw = row.dataset.expiresAt;
    const fill = row.querySelector('.fuse-fill');

    if (expiresAtRaw === '') {
      fill.style.width = '100%';
      return;
    }

    const expiresAt = parseInt(expiresAtRaw, 10);
    const total = expiresAt - uploadedAt;
    const remaining = expiresAt - Date.now();
    const percent = Math.max(0, Math.min(100, (remaining / total) * 100));

    fill.style.width = percent + '%';
    fill.classList.toggle('expiring', percent < 20);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  iconMoon.classList.toggle('hidden', theme === 'light');
  iconSun.classList.toggle('hidden', theme === 'dark');
}

const savedTheme = localStorage.getItem('tfu_theme');
if (savedTheme) applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('tfu_theme', next);
});

loadStats();
loadRecentFiles();
setInterval(updateFuseBars, 1000);
setInterval(loadRecentFiles, 10000);
setInterval(loadStats, 10000);
