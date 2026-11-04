# KryptoInfo
### Three-Layer Secure Digital Vault

**KryptoInfo** adalah aplikasi web berbasis keamanan informasi yang dirancang untuk melindungi aset dan informasi digital menggunakan kombinasi autentikasi berlapis dan algoritma kriptografi.

Proyek ini dikembangkan sebagai tugas akhir mata kuliah **Kriptografi**.

---

## 1. Identitas Proyek

| Informasi | Keterangan |
|---|---|
| Nama Proyek | KryptoInfo |
| Jenis Aplikasi | Web-Based Digital Vault |
| Mata Kuliah | Kriptografi |
| Anggota 1 | Adhafa Joan Putranto |
| Anggota 2 | Mirwan Qolyubi |
| NIM Anggota 2 | 123240116 |
| Status | Dalam Pengembangan |

## 2. Tujuan Proyek

KryptoInfo bertujuan membangun aplikasi penyimpanan informasi digital yang menggabungkan autentikasi berlapis, perlindungan data, dan verifikasi integritas aset.

Aplikasi ini dirancang agar pengguna dapat:
- Melindungi akses menggunakan tiga lapisan autentikasi.
- Mengenkripsi pesan dan dokumen.
- Menyembunyikan pesan rahasia dalam gambar.
- Melindungi integritas aset menggunakan hash-chain.
- Memantau aktivitas keamanan aplikasi.

## 3. Fitur Utama

### A. Three-Layer Authentication

1. **USB Dongle Authentication**
   - Menggunakan Ed25519 challenge-response.
   - Menggunakan USB flash drive biasa sebagai media penyimpanan private key.
   - Memanfaatkan aplikasi USB Companion Agent.

2. **Facial Recognition Authentication**
   - Menggunakan webcam laptop.
   - Menggunakan face embedding untuk verifikasi identitas.
   - Pemrosesan biometrik di perangkat lokal.

3. **Master Password**
   - Menggunakan Argon2id untuk password hashing.
   - Validasi dilakukan melalui backend.

### B. Secure Message
- Vigenere Cipher sebagai lapisan kriptografi klasik.
- AES-256-GCM sebagai lapisan enkripsi modern.
- Penyimpanan ciphertext ke database.
- Proses enkripsi dan dekripsi pesan.

### C. Secure File
- Menggunakan ChaCha20-Poly1305.
- Mendukung enkripsi dan dekripsi file.
- Mempertahankan integritas data.
- Menguji kesamaan file hasil dekripsi dengan file asli.

### D. Image Steganography
- Menggunakan metode Least Significant Bit (LSB).
- Mendukung gambar PNG.
- Pesan dienkripsi sebelum disisipkan ke gambar.
- Mendukung ekstraksi dan dekripsi pesan.

### E. Blockchain Asset
- Menggunakan SHA-256.
- Mengimplementasikan educational hash-chain blockchain.
- Memverifikasi integritas file dan hubungan antarblok.
- Mendeteksi perubahan data.

### F. Database Encryption
- Melindungi data sensitif sebelum disimpan.
- Menggunakan pendekatan pengelolaan kunci yang terpisah.
- Menghindari penyimpanan plaintext untuk data sensitif.

### G. Security Activity
- Mencatat aktivitas autentikasi.
- Mencatat aktivitas enkripsi dan dekripsi.
- Mencatat aktivitas pengelolaan aset.
- Tidak mencatat password, private key, atau plaintext rahasia.

## 4. Teknologi yang Digunakan

| Bagian | Teknologi |
|---|---|
| Frontend | React 18.3.1 |
| Build Tool | Vite |
| Routing | React Router |
| Styling | Tailwind CSS / solusi styling yang sesuai |
| Icons | Lucide React |
| Backend | Node.js dan Express.js |
| ORM | Prisma ORM |
| Database | MariaDB (XAMPP) |
| Password Hashing | Argon2id |
| Public-Key Cryptography | Ed25519 |
| Text Encryption | Vigenere dan AES-256-GCM |
| File Encryption | ChaCha20-Poly1305 |
| Image Steganography | PNG LSB |
| Integrity Verification | SHA-256 |

## 5. Arsitektur Aplikasi

KryptoInfo menggunakan arsitektur modular yang terdiri dari:

- **Frontend:** Menyediakan antarmuka pengguna dan interaksi aplikasi.
- **Backend:** Menangani autentikasi, operasi kriptografi, validasi, dan API.
- **Database:** Menyimpan akun, metadata, ciphertext, dan catatan aktivitas.
- **USB Companion Agent:** Mendeteksi USB dan melakukan penandatanganan challenge menggunakan private key.

## 6. Struktur Folder

```text
KryptoInfo/
├── apps/
│   ├── web/
│   │   └── src/
│   ├── api/
│   │   └── src/
│   └── usb-agent/
│       └── src/
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── package.json
├── docs/
├── storage/
│   ├── encrypted/
│   └── stego/
├── tests/
├── .gitignore
└── README.md
```

Catatan: Struktur di atas merupakan gambaran target. Struktur aktual dapat disesuaikan dengan implementasi yang sudah ada.

## 7. Persyaratan Sistem

- Windows 10/11.
- Node.js LTS.
- npm.
- XAMPP dengan MariaDB.
- Browser modern yang mendukung webcam API.
- Webcam laptop.
- USB flash drive biasa.

## 8. Konfigurasi Database

Database menggunakan MariaDB dari XAMPP.

| Konfigurasi | Nilai |
|---|---|
| Host | 127.0.0.1 |
| Port | 3306 |
| Database | kryptoinfo |
| Username | root |
| Password | Kosong |

Konfigurasi lokal disimpan pada file `.env` dan tidak boleh dimasukkan ke repository Git.

## 9. Cara Menjalankan Proyek

Petunjuk ini akan disesuaikan dengan struktur dan script aktual setelah PHASE 1 selesai.

Secara umum:

1. Jalankan Apache dan MySQL/MariaDB melalui XAMPP jika diperlukan.
2. Pastikan database `kryptoinfo` tersedia.
3. Instal dependency pada direktori aplikasi yang sesuai.
4. Konfigurasikan environment variables.
5. Jalankan backend.
6. Jalankan frontend.
7. Buka alamat frontend melalui browser.

Jangan menjalankan migrasi database sebelum memeriksa dampaknya terhadap database yang sudah ada.

## 10. Keamanan dan Keterbatasan

- USB flash drive biasa bukan hardware security module atau FIDO2 security key. Private key yang disimpan di dalamnya berpotensi disalin.
- Liveness detection sederhana bukan sistem anti-spoofing profesional.
- Vigenere Cipher hanya digunakan sebagai demonstrasi akademik, bukan sebagai perlindungan modern yang berdiri sendiri.
- Blockchain yang digunakan merupakan centralized educational hash-chain, bukan blockchain terdesentralisasi.
- Kunci enkripsi harus dikelola terpisah dari password hash.
- Rahasia dan data biometrik tidak boleh dimasukkan ke repository.

## 11. Status Pengembangan

Proyek dikembangkan secara bertahap:

- [x] Perencanaan dan dokumentasi awal
- [x] PHASE 1 — Project Foundation (Backend + Frontend setup, Prisma + MariaDB)
- [x] PHASE 2 — Three-Layer Authentication (Password + USB Ed25519 + Face biometric)
- [x] PHASE 3 — Cryptography Modules (Vigenere → AES-256-GCM → ChaCha20)
- [x] PHASE 4 — Image Steganography (LSB PNG embed/extract dengan AES)
- [x] PHASE 5 — Blockchain Asset (SHA-256 immutable chain + integrity verification)
- [ ] PHASE 6 — Security Testing and Documentation (⏳ Manual testing in progress)

**Update 4 Nov 2026**: Semua fitur backend + frontend complete. Bug stego API diperbaiki. Lihat [TEST_PLAN.md](TEST_PLAN.md) untuk checklist pengujian lengkap.

Checklist akan diperbarui berdasarkan hasil implementasi dan pengujian yang benar-benar dilakukan.

## 12. Tim Pengembang

**Adhafa Joan Putranto**
- Backend development
- Database management
- Authentication
- Cryptographic implementation

**Mirwan Qolyubi (123240116)**
- Frontend development
- UI/UX implementation
- Steganography interface and integration
- Testing and documentation

Kedua anggota bertanggung jawab atas integrasi, pengujian, dan penyelesaian proyek secara keseluruhan.

---

*KryptoInfo — Your Digital Assets. Protected by Three Layers.*