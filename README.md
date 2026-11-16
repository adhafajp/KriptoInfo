# KryptoInfo (PIKATAN // Brankas Investigasi)
### Three-Layer Secure Digital Vault & Multi-Layer Cryptography Suite

**KryptoInfo** adalah aplikasi web keamanan informasi bertema *Detective Dossier* (**PIKATAN // Brankas Investigasi**) yang dirancang untuk melindungi aset, pesan, gambar, dan log bukti digital menggunakan kombinasi autentikasi tiga lapis (3FA) dan rangkaian algoritma kriptografi berlapis (*defense-in-depth*).

Proyek ini dikembangkan sebagai proyek akhir mata kuliah **Kriptografi**.

---

## 1. Identitas Proyek

| Informasi | Keterangan |
|---|---|
| Nama Proyek | KryptoInfo (`PIKATAN // BRANKAS INVESTIGASI`) |
| Jenis Aplikasi | Web-Based Secure Digital Vault |
| Mata Kuliah | Kriptografi |
| Anggota 1 | Adhafa Joan Putranto (`123240069`) |
| Anggota 2 | Mirwan Qolyubi (`123240116`) |
| Status | Selesai / Siap Demo (v2.0) |

## 2. Tujuan Proyek

KryptoInfo bertujuan menyediakan brankas digital yang menggabungkan autentikasi biometrik + perangkat keras USB + kata sandi dengan pipeline enkripsi berlapis agar:
- Akses ke dalam sistem terlindungi oleh **tiga faktor autentikasi** (`Master Password` + `USB Dongle Ed25519` + `Pengenalan Wajah`).
- Pesan teks, catatan brankas, dan berkas biner diamankan menggunakan enkripsi berlapis modern (**Vigenère + SHAKE-256 + HKDF-SHA512 + AES-256-GCM + ChaCha20-Poly1305 + HMAC-SHA512**).
- Pesan rahasia dapat disisipkan secara terenkripsi ke dalam citra PNG menggunakan **steganografi LSB 4 lapis**.
- Integritas dokumen dan log catatan dilindungi oleh **rantai blok (hash-chain)** bersegel **SHA-256 + SHA3-256 + HMAC-SHA512**.
- Seluruh aktivitas keamanan tercatat rapi dalam **Log Aktivitas Audit**.

---

## 3. Fitur Utama

Fitur KryptoInfo terbagi menjadi dua tahap utama: **Pre-Authentication & Enrollment (`LoginPage`)** dan **Dashboard Brankas Investigasi (`App`)** yang mendukung **Light Mode** maupun **Dark Mode** dengan kontras tinggi.

### A. Fitur Sebelum Masuk (Autentikasi 3FA & Pendaftaran)

#### 1. USB Companion Agent (`http://127.0.0.1:8787`)
- **Deteksi Drive Otomatis & Cache Cepat:** Memindai drive *removable* (USB flash drive) di Windows melalui `.NET DriveInfo` dengan cache cepat sehingga pembacaan status berjalan responsif.
- **Pencarian Folder Multi-Lokasi:** Mencari berkas dongle JSON di direktori *root* flashdisk maupun subfolder `KriptoInfoDongle/`, `KryptoInfoDongle/`, `kriptoinfodongle/`, `kryptoinfodongle/`, `.kryptoinfo/dongles/`, `KriptoInfo/dongles/`, `KryptoInfo/dongles/`, dan `.kryptoinfo/`.
- **Simpan Otomatis Saat Enrollment (`POST /api/save-dongle`):** Saat pendaftaran agen baru berhasil membuat keypair **Ed25519**, frontend otomatis meminta USB Agent menyimpan file dongle (`kryptoinfo-dongle-<username>.json`) langsung ke folder `KriptoInfoDongle/` di flashdisk yang terdeteksi (dengan fallback unduhan browser jika flashdisk belum siap).
- **Status Visual Real-time:** Menampilkan kartu status dengan outline hijau terang **`DRIVE USB TERDETEKSI`** beserta identitas file dan drive begitu dongle terdeteksi.
- **Keamanan Kunci Privat:** Penandatanganan *challenge* dilakukan secara lokal oleh USB Agent; *private key* PKCS#8 Ed25519 **tidak pernah dikirim ke browser atau server**.

#### 2. Biometrik Wajah Real-time (`faceHelper.js` + `@vladmandic/face-api`)
- **Kamera Mirror (`scale-x-[-1]`):** Pratinjau webcam dicerminkan agar natural saat pengguna menyesuaikan posisi wajah.
- **Unified Single-Loop & Kotak Deteksi Wajah:**
  - `TinyFaceDetector` digunakan pada loop pratinjau agar FPS tetap ringan dan mulus, menggambar kotak deteksi wajah secara real-time (`computeDisplayBox`).
  - `ssdMobilenetv1`, `faceLandmark68Net`, dan `faceRecognitionNet` (ResNet-34 128-D L2-normalized descriptor) digunakan untuk ekstraksi fitur akurat saat verifikasi/pendaftaran.
- **Indikator Angka Kedekatan Wajah (`evaluateFaceProximity`):** Menampilkan persentase kedekatan dan estimasi jarak (`cm`) secara real-time, membedakan kondisi *terlalu jauh*, *optimal*, dan *terlalu dekat*, serta mengubah warna status sensor mengikuti tema aktif ketika wajah terdeteksi optimal.
- **Validasi Wajah Tunggal & Ambang Batas Kalibrasi:** Menolak frame tanpa wajah atau berisi lebih dari satu wajah; pencocokan L2-normalized Euclidean distance backend dikalibrasi pada threshold `0.42`.

#### 3. Autentikasi Tiga Lapis (`AKSES BRANKAS`) & Pendaftaran (`PENDAFTARAN AGEN`)
1. **Knowledge Factor — Master Password:** Diverifikasi dengan **Argon2id**.
2. **Possession Factor — USB Dongle Ed25519:** Mekanisme *challenge-response* acak berbatas waktu yang diverifikasi server menggunakan *public key* terdaftar.
3. **Inherence Factor — Biometrik Wajah:** Pencocokan vektor 128 dimensi di backend.
- **Pendaftaran Baru (`PENDAFTARAN AGEN`):** Memerlukan `ENROLLMENT_CODE`, membangkitkan pasangan kunci Ed25519 di klien, mengambil biometrik wajah langsung dari kamera, dan menyimpan berkas dongle ke folder `KriptoInfoDongle` di USB drive.

---

### B. Fitur Setelah Masuk (`PIKATAN // BRANKAS INVESTIGASI`)

Navigasi utama dashboard terdiri atas 5 tab modular plus modal utilitas di header:

#### 1. Pesan (`MessageTab` — 5-Layer Hybrid Cipher)
Mengamankan pesan teks sensitif dengan alur kriptografi 5 lapis berurutan:
1. **Lapis 1:** `Vigenère Polyalphabetic` — substitusi berbasis kata kunci pengguna.
2. **Lapis 2:** `SHAKE-256 Keystream Whitening` — stream whitening acak berbasis salt.
3. **Lapis 3:** `HKDF-SHA512 Key Derivation` — menurunkan sub-kunci terisolasi dengan mengikat *Master Key* server dan kata kunci pengguna.
4. **Lapis 4:** `ChaCha20-Poly1305 AEAD` — enkripsi autentikasi bagian dalam.
5. **Lapis 5:** `AES-256-GCM + HMAC-SHA512` — enkripsi autentikasi luar (*Encrypt-then-MAC*) disertai Multi-Digest (`SHA-256` & `SHA3-256`).
- Menghasilkan token Base64 ringkas ber-magic header `KI5L` sekaligus payload JSON, dan mendukung dekripsi token Base64, payload JSON v2, maupun format kompatibilitas mundur v1.

#### 2. Brankas Dokumen (`VaultTab` — 5-Layer Cascade Cipher)
Menyimpan catatan rahasia (`NOTE`, `CREDENTIAL`, `DOCUMENT`) dan berkas biner terenkripsi (`.enc`) dengan **Zero Plaintext Storage** di MariaDB:
- Mengamankan teks dan berkas menggunakan pipeline **5-Layer Cascade (`chachaEncrypt` / `chachaDecrypt`)**:
  1. `HKDF-SHA512` (isolasi 4 sub-kunci independen dari *Master Key* + salt 16-byte).
  2. `SHAKE-256` (*stream whitening*).
  3. Inner `AES-256-GCM` AEAD.
  4. Outer `ChaCha20-Poly1305` AEAD.
  5. `HMAC-SHA512` *Encrypt-then-MAC* + segel integritas `SHA-256` & `SHA3-256`.
- Mendukung pencarian item, inspeksi metadata lapisan & digest, serta modal khusus dekripsi dan unduh berkas `.enc`.

#### 3. Steganografi (`StegoTab` — 4-Layer Encrypted PNG LSB)
Menyembunyikan pesan rahasia ke dalam bit paling tidak signifikan (*Least Significant Bit*) kanal warna gambar PNG menggunakan 4 lapis proteksi:
1. `Vigenère Master Substitution` (seed deterministik berbasis SHA-256 *Master Key*).
2. `HKDF-SHA512 Key Derivation`.
3. `SHAKE-256 Stream Whitening`.
4. `AES-256-GCM AEAD + PNG LSB` embedding/extraction.
- Dilengkapi pratinjau gambar langsung, indikator kapasitas maksimum bit/karakter LSB pada citra PNG yang diunggah, dan isolasi error saat mengekstrak gambar kosong tanpa payload stego.

#### 4. Integritas Data (`BlockchainTab` — Multi-Seal Hash-Chain)
Buku besar *immutable hash-chain* per pengguna dengan segel kriptografi ganda:
- Setiap blok menyimpan `blockIndex`, `assetId`, `assetHash` (SHA-256 64-hex), `previousHash`, `currentHash`, `timestamp`, serta segel verifikasi **`SHA3-256`** dan **`HMAC-SHA512`** (`hmacSeal`).
- Menyediakan inspektor *preimage*, verifikasi kecocokan dokumen via *Proof-of-Existence*, serta **Verifikasi Rantai Penuh** dari blok *genesis* hingga blok terbaru.

#### 5. Log Aktivitas (`AuditTab`) & Modal Utilitas
- **Log Aktivitas (`AuditTab`):** Menampilkan ringkasan metrik keamanan, filter pencarian dan status, serta 50 catatan aktivitas terbaru (login, enkripsi/dekripsi, steganografi, operasi vault, hingga pencatatan blok) tanpa pernah mencatat kredensial atau plaintext rahasia.
- **Alat Kriptografi (`CryptoToolModal`):** Utilitas perhitungan multi-hash & konversi teks (`SHA-256`, `SHA3-256`, Base64, Hex) langsung dari header.
- **Status Keamanan (`SecurityHealthModal`):** Diagnostik kesiapan layanan backend, database, USB Agent, dan postur autentikasi 3 lapis.

---

## 4. Teknologi yang Digunakan

| Bagian | Teknologi |
|---|---|
| Frontend | React 18.3.1, Vite, Tailwind CSS (`darkMode: 'class'`), Lucide React |
| Pengenalan Wajah | `@vladmandic/face-api` (`TinyFaceDetector`, `ssdMobilenetv1`, `faceLandmark68Net`, `faceRecognitionNet`) |
| Backend | Node.js (>= 20.19.0, ESM) & Express.js |
| Database & ORM | MariaDB (XAMPP) & Prisma ORM |
| Password & Key Derivation | Argon2id, HKDF-SHA512, SHAKE-256 |
| Public-Key Cryptography | Ed25519 (PKCS#8 DER, Challenge-Response) |
| Enkripsi Simetris & Hybrid | Vigenère Cipher, AES-256-GCM, ChaCha20-Poly1305 |
| Integritas & MAC | SHA-256, SHA3-256, HMAC-SHA512 |
| Image Steganography | PNG LSB + `pngjs` + AES-256-GCM |
| USB Agent | Standalone Node HTTP Server (port `8787`), PowerShell `.NET DriveInfo` |

---

## 5. Struktur Folder

```text
ProyekAkhirMain/
├── backend/                      # REST API Express & Prisma ORM (Port 3001)
│   ├── prisma/
│   │   ├── migrations/           # Riwayat migrasi schema database
│   │   └── schema.prisma         # Skema model MariaDB
│   ├── src/
│   │   ├── config/db.js          # Koneksi Prisma + MariaDB
│   │   ├── controllers/          # auth, blockchain, crypto, stego, vault
│   │   ├── crypto/crypto.js      # Primitif Vigenère, HKDF, SHAKE-256, AES-GCM, ChaCha20, HMAC, SHA3
│   │   ├── middleware/           # auth.middleware.js & errorHandler.js
│   │   ├── routes/index.js       # Routing API (/api/*)
│   │   ├── app.js                # Konfigurasi Express app
│   │   └── server.js             # Entry point server backend
│   ├── tests/smoke.test.js       # Unit & smoke test kriptografi/stego/dongle (node:test)
│   ├── tools/dongle-cli.js       # Utilitas CLI manajemen dongle
│   ├── .env.example
│   └── package.json
├── frontend/                     # Aplikasi antarmuka React 18.3.1 + Vite (Port 5173)
│   ├── public/models/            # Bobot neural network face-api
│   ├── src/
│   │   ├── components/           # LoginPage, MessageTab, VaultTab, StegoTab, BlockchainTab, AuditTab, Modals
│   │   ├── context/ThemeContext.jsx
│   │   ├── services/api.js       # Klien HTTP API
│   │   ├── utils/                # cryptoHelper.js (Ed25519) & faceHelper.js (Mirror/HUD/ResNet-34)
│   │   ├── App.jsx               # Root layout & navigasi tab
│   │   ├── index.css             # Variabel tema Light/Dark & komponen Detective Dossier
│   │   ├── main.jsx              # Entry point React
│   │   └── smoke.test.js         # Unit test helper wajah & kriptografi (Vitest)
│   ├── .eslintrc.cjs
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── usb-agent/                    # Daemon lokal pemindaian USB & signing Ed25519 (Port 8787)
│   ├── src/
│   │   ├── discovery.js          # Deteksi drive removable & folder KryptoInfoDongle/KriptoInfoDongle
│   │   ├── dongle.js             # Pembacaan, validasi, penyimpanan & signing PKCS#8 Ed25519
│   │   └── server.js             # HTTP server lokal USB Agent (/api/status, /api/sign, /api/save-dongle)
│   ├── test/dongle.test.js       # Unit test discovery, saveDongleToFolder, & signing (node:test)
│   ├── server.js
│   ├── .env.example
│   └── package.json
├── docs/                         # Dokumentasi arsitektur, model keamanan, setup, & pembagian tugas
├── run-all.bat                   # Launcher cepat Windows (MariaDB + Backend + USB Agent + Frontend)
├── stop-all.bat                  # Script cepat menghentikan layanan port 3001, 8787, 5173
├── AGENTS.md                     # Panduan aturan pengembangan proyek
├── TEST_PLAN.md                  # Rencana dan checklist pengujian
└── README.md                     # Dokumentasi utama proyek
```

---

## 6. Persyaratan Sistem & Konfigurasi Database

### Persyaratan Sistem
- Windows 10 / 11 (untuk deteksi USB DriveInfo & launcher `.bat`).
- Node.js `>= 20.19.0` dan npm.
- XAMPP dengan MariaDB / MySQL aktif pada port `3306`.
- Browser modern dengan akses Webcam (Chrome / Edge).
- USB flash drive standar (untuk penyimpanan dongle Ed25519 pada folder `KriptoInfoDongle`).

### Konfigurasi Database
| Konfigurasi | Nilai Default |
|---|---|
| Host | `127.0.0.1` |
| Port | `3306` |
| Database | `kryptoinfo` |
| Username | `root` |
| Password | Kosong (sesuaikan `DATABASE_URL` di `backend/.env` jika berbeda) |

> **Penting:** Berkas `.env` dan *private key* dongle tidak boleh dimasukkan ke repository Git.

---

## 7. Cara Menjalankan Proyek

### Opsi A — Cara Cepat di Windows (`run-all.bat`)
Setelah `.env`, dependensi (`npm install` di tiap paket), dan database `kryptoinfo` (`npx prisma generate && npx prisma migrate dev`) disiapkan satu kali:
1. Jalankan **`run-all.bat`** di folder root proyek (otomatis mengecek MariaDB port `3306`, menjalankan **Backend API** `3001`, **USB Agent** `8787`, **Frontend** `5173`, lalu membuka browser).
2. Untuk menghentikan seluruh layanan sekaligus, jalankan **`stop-all.bat`**.

### Opsi B — Jalankan Manual di Terminal Terpisah

#### 1. Persiapan Database
Buat database `kryptoinfo` pada MariaDB (XAMPP Control Panel → Start **MySQL** → phpMyAdmin):
```sql
CREATE DATABASE IF NOT EXISTS kryptoinfo;
```

#### 2. Menjalankan Backend API (`Port 3001`)
```bash
cd backend
cp .env.example .env
# Isi ENCRYPTION_KEY (64 karakter hex) dan ENROLLMENT_CODE di backend/.env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

#### 3. Menjalankan USB Companion Agent (`Port 8787`)
```bash
cd usb-agent
cp .env.example .env
npm install
npm run dev
```

#### 4. Menjalankan Frontend (`Port 5173`)
```bash
cd frontend
npm install
npm run dev
```
Buka `http://localhost:5173` melalui browser.

---

## 8. Pengujian Otomatis & Build Verification

Proyek telah dilengkapi unit test, linter, dan production build verification pada seluruh modul:

```bash
# 1. Backend tests (9/9 passed - Vigenère, AES-GCM, ChaCha20 5-Lapis, Hybrid 5-Lapis, Stego, Ed25519)
npm test --prefix backend

# 2. USB Agent tests (7/7 passed - Discovery KriptoInfoDongle/KryptoInfoDongle, saveDongleToFolder, Signing)
npm test --prefix usb-agent

# 3. Frontend lint, unit tests (7/7 passed - faceHelper mirror/proximity, cryptoHelper), & Vite build
npm run lint --prefix frontend
npm test --prefix frontend -- --run
npm run build --prefix frontend
```

---

## 9. Keamanan dan Keterbatasan

- **USB Flash Drive Standar:** Flashdisk biasa bukan *Hardware Security Module* (HSM) atau FIDO2 security key; salinan file JSON dapat diduplikasi secara fisik jika flashdisk tidak diamankan secara fisik.
- **Deteksi Wajah Berbasis Webcam 2D:** Tidak menggunakan sensor kedalaman inframerah khusus sehingga bukan mekanisme *hardware anti-spoofing*.
- **Vigenère Cipher:** Disertakan sebagai lapisan klasik untuk kebutuhan akademik mata kuliah Kriptografi dan selalu dipadukan di atas lapisan modern (`SHAKE-256`, `HKDF-SHA512`, `ChaCha20-Poly1305`, `AES-256-GCM`, `HMAC-SHA512`).
- **Hash-Chain:** Rantai blok merupakan *centralized educational hash-chain* per pengguna di MariaDB, bukan jaringan konsensus terdesentralisasi publik.

---

## 10. Status Pengembangan

- [x] **Perencanaan & Arsitektur Awal**
- [x] **PHASE 1** — Fondasi Proyek (Express Backend + React 18 Vite Frontend + Prisma MariaDB)
- [x] **PHASE 2** — Autentikasi Tiga Lapis (Argon2id + USB Dongle Ed25519 + Face Biometric ResNet-34 + Mirror & Proximity HUD + Auto-Save `KriptoInfoDongle`)
- [x] **PHASE 3** — Modul Kriptografi Multi-Lapis (5-Layer Hybrid Cipher, 5-Layer Vault/File Cascade, SHA-256/SHA3-256/HMAC-SHA512)
- [x] **PHASE 4** — Steganografi Citra PNG (4-Layer Encrypted LSB Embed/Extract & Kapasitas Bit)
- [x] **PHASE 5** — Buku Besar Hash-Chain (Multi-Seal SHA-256 + SHA3-256 + HMAC-SHA512, Proof-of-Existence & Verifikasi Rantai)
- [x] **PHASE 6** — Audit Log, Poles UI/UX Detective Dossier (Light & Dark Contrast), Dokumentasi, & Pengujian Otomatis (`23/23` unit test lintas modul lulus)

---

## 11. Tim Pengembang

**Adhafa Joan Putranto (`123240069`)**
- Arsitektur Backend & Manajemen Database (Prisma + MariaDB)
- Autentikasi 3FA & Implementasi Kriptografi Multi-Lapis
- Pengembangan USB Companion Agent & Integrasi End-to-End

**Mirwan Qolyubi (`123240116`)**
- Pengembangan Antarmuka Frontend (React 18.3.1 + Tailwind)
- Implementasi UI/UX & Integrasi Modul Steganografi
- Pengujian & Dokumentasi Proyek

---

*KryptoInfo (PIKATAN) — Your Digital Assets. Protected by Three Layers & Multi-Layer Cryptography.*
