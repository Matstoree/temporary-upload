# Temporary File Uploader (Vercel)

## 1. Perubahan dari versi VPS

Versi ini sudah diadaptasi supaya jalan di Vercel (serverless, tanpa disk permanen):

| Komponen lama (VPS)              | Diganti dengan                          |
|-----------------------------------|------------------------------------------|
| `better-sqlite3` (file lokal)     | **Vercel KV** — metadata file & session   |
| Disk lokal (`storage/`, multer)   | **Vercel Blob** — penyimpanan file        |
| Session admin in-memory           | Disimpan di Vercel KV (TTL 12 jam)        |
| `setInterval` cleanup di proses   | **Vercel Cron** memanggil `/api/cron/cleanup` |
| Monitor CPU/RAM/jaringan server   | Dihapus (tidak relevan di lingkungan serverless) |

Format URL unduhan tetap sama: `BASE_URL/f/:id` (dengan ekstensi opsional, mis. `/f/3YL2vUDn.jpg`).

Upload langsung lewat `POST /api/upload` (multipart) tetap tersedia tapi dibatasi ~4MB, karena itu batas ukuran body permintaan di Vercel Serverless Functions dan tidak bisa diubah dari kode. Untuk file lebih besar, formulir web mengunggah langsung ke Vercel Blob lewat `/api/upload/token` + `/api/upload/complete`, jadi tidak melewati batas tersebut.

## 2. Persiapan di Vercel

1. Buat project baru di Vercel dari repo ini.
2. Di dashboard project, buka tab **Storage** lalu buat:
   - **Blob** store, hubungkan ke project (otomatis menambahkan `BLOB_READ_WRITE_TOKEN`).
   - **KV** store (Upstash Redis), hubungkan ke project (otomatis menambahkan `KV_REST_API_URL`, `KV_REST_API_TOKEN`, dll).
3. Di tab **Settings → Environment Variables**, tambahkan:
   ```
   BASE_URL=https://domain-kamu.vercel.app
   MAX_FILE_SIZE=100MB
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=ganti_dengan_password_kuat
   CRON_SECRET=isi_string_acak (opsional, untuk mengunci endpoint cron)
   ```
4. Deploy.

## 3. Panel Admin

Panel admin ada di `BASE_URL/admin` — dipakai untuk memantau semua file yang diupload dan menghapus file secara manual sebelum expired. Tidak ada endpoint delete publik.

Kredensial diatur lewat environment variable `ADMIN_USERNAME` / `ADMIN_PASSWORD`. Session admin disimpan di Vercel KV dengan masa berlaku 12 jam, dan tetap valid walau permintaan ditangani oleh instance function yang berbeda.

## 4. Pembersihan file kedaluwarsa

File yang sudah lewat masa berlaku otomatis diblokir saat diakses lewat `/f/:id` (dan langsung dihapus saat itu juga). Selain itu, `vercel.json` sudah berisi cron job yang memanggil `GET /api/cron/cleanup` sekali sehari untuk membersihkan file kedaluwarsa yang belum pernah diakses lagi — jadwal ini sengaja dibuat sekali sehari supaya kompatibel dengan batas cron job di paket Vercel Hobby. Ini tidak memengaruhi keamanan akses file, karena pengecekan expired tetap dilakukan setiap kali file diakses.

## 5. Menjalankan secara lokal (opsional)

```bash
npm install
cp .env.example .env
```

Isi `.env` dengan token Blob & KV yang bisa disalin dari dashboard Vercel (tab Storage → masing-masing store → `.env.local` tab), lalu:

```bash
npm run dev
```

Server lokal berjalan di `http://localhost:3000`. Perilaku upload langsung ke Blob (`/api/upload/token`) butuh koneksi ke Blob store yang sama seperti di production, jadi tetap perlu token asli dari Vercel meskipun dijalankan lokal.

## 6. Testing API dengan curl

Upload file kecil (≤4MB) langsung ke server:

```bash
curl -X POST https://domain-kamu.vercel.app/api/upload \
  -F "file=@/path/file.jpg" \
  -F "expiry=1h"
```

Download file (ganti `FILE_ID`):

```bash
curl -O -J https://domain-kamu.vercel.app/f/FILE_ID
```

Upload tanpa file (harus gagal):

```bash
curl -X POST https://domain-kamu.vercel.app/api/upload -F "expiry=1h"
```

Upload dengan expiry tidak valid (harus gagal):

```bash
curl -X POST https://domain-kamu.vercel.app/api/upload -F "file=@/path/file.jpg" -F "expiry=99x"
```

Upload permanen (tidak ada waktu expired):

```bash
curl -X POST https://domain-kamu.vercel.app/api/upload -F "file=@/path/file.jpg" -F "expiry=permanent"
```

Untuk file besar (>4MB), gunakan formulir di halaman utama — endpoint curl di atas akan menolak dengan status 413.

## 7. Daftar Testing Sebelum Dianggap Selesai

- [ ] Upload file JPG lewat formulir web
- [ ] Upload file besar (>4MB) lewat formulir web (harus tetap berhasil lewat jalur Blob langsung)
- [ ] Upload file kecil lewat curl ke `/api/upload`
- [ ] Download file berhasil dan nama file sesuai `original_name`
- [ ] `download_count` bertambah setiap download
- [ ] Expiry 5 menit — file terhapus otomatis setelah diakses lewat `/f/:id` setelah waktunya lewat
- [ ] Expiry 1 jam / 1 hari / permanent
- [ ] Login admin di `/admin` dengan kredensial dari environment variable
- [ ] Login admin gagal dengan password salah
- [ ] Dashboard admin menampilkan daftar file dan bisa dicari
- [ ] Hapus file lewat dashboard admin — file hilang dari Blob & KV
- [ ] Akses `/admin/api/files` tanpa login → 401
- [ ] Upload file terlalu besar ke `/api/upload` (respons 413)
- [ ] Upload tanpa file (respons 400)
- [ ] Akses ID file tidak valid/tidak ada (respons 404)
- [ ] `GET /api/cron/cleanup` berjalan (cek tab Cron Jobs di dashboard Vercel)

## 8. Troubleshooting Umum

**Upload gagal dengan pesan "Gagal menyimpan file ke storage"**
Pastikan Blob store sudah terhubung ke project dan `BLOB_READ_WRITE_TOKEN` ada di Environment Variables.

**Stats/file list kosong padahal sudah upload**
Pastikan KV store sudah terhubung ke project (env `KV_REST_API_URL` / `KV_REST_API_TOKEN` harus ada).

**Login admin selalu diminta ulang**
Cek `ADMIN_USERNAME` / `ADMIN_PASSWORD` sudah diisi di Environment Variables, dan pastikan KV store terhubung (session admin disimpan di sana).

**Upload besar dari formulir web gagal**
Cek console browser — biasanya karena Blob store belum terhubung, atau `MAX_FILE_SIZE` di environment variable lebih kecil dari file yang diunggah.
