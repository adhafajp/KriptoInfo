# Environment Check — KryptoVault

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
| MySQL CLI | — | ❌ Tidak ditemukan di PATH |

---

## Git Repository

| Item | Nilai |
|------|-------|
| Status | Initialized |
| Branch | `main` |
| Commit awal | `49bcf56` — `chore: initialize KryptoVault` |
| Remote | Belum dikonfigurasi |

---

## MySQL

MySQL CLI (`mysql`) **tidak ditemukan di PATH**. Ini bisa berarti:

1. MySQL belum terinstal.
2. MySQL terinstal tetapi belum ditambahkan ke PATH.
3. Menggunakan XAMPP/WAMP/Laragon — periksa folder instalasi masing-masing.

### Rekomendasi
- Jika menggunakan **XAMPP**: tambahkan `C:\xampp\mysql\bin` ke system PATH.
- Jika menggunakan **MySQL Installer**: tambahkan `C:\Program Files\MySQL\MySQL Server 8.x\bin` ke system PATH.
- Jika menggunakan **Laragon**: tambahkan path MySQL Laragon ke system PATH.
- Alternatif: gunakan **MySQL Workbench** atau **DBeaver** sebagai GUI client.

---

## Catatan Tambahan

- **USB Drive**: Tidak ada pengecekan USB yang dilakukan (sesuai aturan keamanan — tidak menyentuh USB tanpa persetujuan eksplisit).
- **Environment Variables**: Tidak ada file `.env` yang dibuat pada tahap ini (akan dibuat saat implementasi backend).
- **Docker**: Tidak diperiksa (opsional — MySQL bisa dijalankan via Docker jika diperlukan).
