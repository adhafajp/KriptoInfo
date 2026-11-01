# Environment Check — KryptoInfo

> Dokumen ini mencatat hasil inspeksi lingkungan pengembangan.
> Tanggal inspeksi: 1 November 2026

---

## Sistem Operasi

| Item | Nilai |
|------|-------|
| OS | Microsoft Windows 11 Home Single Language |
| Versi | 10.0.26200 Build 26200 |
| Arsitektur | x64-based PC |

---

## Tools yang Tersedia

| Tool | Versi | Status |
|------|-------|--------|
| Git | 2.47.1.windows.1 | ✅ Tersedia |
| Node.js | v24.15.0 | ✅ Tersedia |
| npm | 10.9.0 | ✅ Tersedia |
| XAMPP MariaDB | 10.4.32-MariaDB | ✅ Berjalan aktif pada port 3306 (`E:\xampp\mysql\`) |
| Apache & phpMyAdmin | 2.4.58 / phpMyAdmin aktif | ✅ Berjalan aktif (`http://localhost/phpmyadmin/` - HTTP 200) |
| MySQL CLI di PATH | 10.4.32 (di `E:\xampp\mysql\bin`) | ⚠️ Belum ada di System PATH (dapat ditambahkan opsional) |

---

## Git Repository

| Item | Nilai |
|------|-------|
| Status | Initialized |
| Branch | `main` |
| Commit awal | `49bcf56` — `chore: initialize KryptoInfo` |
| Remote | Belum dikonfigurasi |

---

## Database (XAMPP MariaDB)

- **Engine**: MariaDB (Distribusi 10.4.32-MariaDB untuk Win64 AMD64)
- **Port**: `3306` (Status TCP Loopback: `TcpTestSucceeded : True`)
- **Lokasi Instalasi**: `E:\xampp\mysql\bin\mysqld.exe`
- **Dashboard GUI**: phpMyAdmin aktif dan merespons pada `http://localhost/phpmyadmin/` (HTTP 200 OK).
- **Protokol**: Kompatibel penuh dengan protokol MySQL (Wire-compatible).

### Kompatibilitas dengan Prisma ORM v7
- **Provider**: `mysql`
- **Dukungan Prisma**: Prisma ORM v7 mendukung MariaDB secara resmi dan stabil menggunakan driver adapter (`@prisma/adapter-mariadb` atau `@prisma/adapter-mysql2`).
- **Rekomendasi Versi**: Gunakan **Prisma ORM v7** (versi stabil terkini untuk MariaDB, karena Prisma ORM v8 belum merilis library resmi untuk MariaDB).
- **Format URL**: `mysql://root:@127.0.0.1:3306/kryptoinfo`

---

## Status Database KryptoInfo

1. **Database Siap**: Database `kryptoinfo` telah dibuat oleh pengguna di phpMyAdmin.
2. **Akun Database**: Menggunakan akun bawaan XAMPP (`root`, tanpa password). Tidak membuat user baru dan tidak menjalankan perintah hak akses tambahan.
3. **Kredensial**: Dikonfigurasikan di file `.env` di backend (`DATABASE_URL="mysql://root:@127.0.0.1:3306/kryptoinfo"`).
4. **Integritas**: Tidak mengubah konfigurasi XAMPP, port 3306 tetap, dan tidak menghapus database/tabel yang sudah ada.

---

---

## Pemeriksaan Hardware Tambahan

### 1. Kamera / Webcam
- **Perangkat**: `ACER HD User Facing`
- **Manufaktur**: SunplusIT
- **Status**: `OK` (Present: `True`)
- **Fungsi**: Siap digunakan untuk fitur biometrik / visual jika diintegrasikan di kemudian hari.

### 2. USB Storage & Dongle Fisik
- **Status Deteksi**: Tidak ada flash drive USB eksternal yang terpasang saat ini.
- **Drive Fisik Terdeteksi**:
  - `\\.\PHYSICALDRIVE0`: NVMe WD PC SN740 512GB (Drive C: Acer)
  - `\\.\PHYSICALDRIVE1`: NVMe VISIPRO 1TB (Drive D: MULTI & Drive E: DLL)
- **Kesiapan USB Agent**: Selama pengujian tanpa USB fisik, sistem dapat memanfaatkan mode *Virtual USB Dongle* tanpa melanggar aturan keamanan USB fisik.

---

## File Konfigurasi Environment

- `backend/.env`: ✅ Telah dibuat (berisi `DATABASE_URL="mysql://root:@127.0.0.1:3306/kryptoinfo"`, `PORT=3001`, `NODE_ENV=development`, serta dev encryption key). Otomatis diabaikan oleh `.gitignore`.
- `backend/.env.example`: ✅ Telah dibuat sebagai template.
