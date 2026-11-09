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
| NIM Anggota 1 | 123240069 |
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

Fitur KryptoInfo dibagi menjadi dua tahapan operasional: **Fitur Sebelum Masuk (Pre-Authentication & Enrollment)** dan **Fitur Setelah Masuk (Dashboard Digital Vault)**.

---

### A. Fitur Sebelum Masuk (Autentikasi & Pendaftaran)

Sebelum masuk ke dalam dashboard, sistem menyediakan antarmuka autentikasi tiga lapis dan modul pendaftaran pengguna baru:

#### 1. Pemindaian & Deteksi USB Otomatis (USB Companion Agent)
- **Deteksi Drive Removable Windows:** USB Agent secara otomatis memindai drive bertipe *Removable* (flashdisk) yang tercolok ke sistem operasi menggunakan utilitas PowerShell `.NET DriveInfo`.
- **Pemindaian Lokasi Dongle:** Agen mencari file kunci dongle berformat JSON pada:
  - Direktori *root* flashdisk.
  - Subfolder: `KryptoInfoDongle/`, `.kryptoinfo/dongles/`, dan `KryptoInfo/dongles/`.
- **Validasi Integritas Kunci:** Memastikan file dongle berukuran wajar (≤ 64 KB), berupa JSON valid, menyimpan private key bertipe PKCS#8 DER Base64, dan berjenis algoritma **Ed25519**.
- **Indikator Real-time di UI:** Frontend secara otomatis melakukan *polling* setiap 2,5 detik ke USB Agent (`http://127.0.0.1:8787/api/status`). Kartu status menampilkan indikator hijau bila dongle valid terdeteksi lengkap beserta nama file dan drive-nya, atau kuning bila belum dicolokkan.

#### 2. Pemindaian & Verifikasi Wajah (Face Recognition via Webcam)
- **Akses Kamera Lokal:** Membuka webcam laptop/komputer pengguna dengan resolusi ideal 720p 30fps.
- **Model Biometrik Deep Learning:** Memuat tiga neural network via `@vladmandic/face-api`:
  - `ssdMobilenetv1` (pendeteksi bounding box wajah dengan akurasi tinggi).
  - `faceLandmark68Net` (pemetaan 68 titik landmark fitur wajah).
  - `faceRecognitionNet` (ekstraksi representasi fitur ke dalam vektor numerik 128 dimensi).
- **Validasi Wajah Tunggal:** Sistem menolak proses jika wajah tidak terdeteksi atau jika ada lebih dari satu orang di depan kamera.
- **Verifikasi Biometrik:** Pada saat login, vektor 128 angka dari webcam dicocokkan dengan *template* wajah saat enrollment menggunakan perhitungan *Euclidean distance*. Toleransi ambang batas (threshold) diatur ketat (default ≤ 0.60).

#### 3. Autentikasi Tiga Lapis (Three-Layer Authentication)
Untuk mendapatkan akses login, seluruh faktor berikut wajib lolos verifikasi:
1. **Faktor 1 (Knowledge): Master Password**
   - Password diverifikasi menggunakan algoritma **Argon2id** pada backend.
2. **Faktor 2 (Possession): USB Dongle Kriptografis (Ed25519 Challenge-Response)**
   - Backend menerbitkan *cryptographic nonce/challenge* acak yang memiliki batas waktu kedaluwarsa.
   - Frontend meminta USB Agent lokal menandatangani *challenge* menggunakan *private key* di flashdisk.
   - Private key **tidak pernah dikirim ke browser atau jaringan**. Backend memverifikasi tanda tangan digital menggunakan *public key* yang tersimpan di database.
3. **Faktor 3 (Inherence): Biometrik Wajah**
   - Vektor deskriptor wajah dikirim dan dicocokkan dengan data biometrik terdaftar di server.

#### 4. Pendaftaran Pengguna Baru (Enrollment)
- Memerlukan **Enrollment Code** rahasia yang dikonfigurasi pada server untuk mencegah pendaftaran liar.
- Mengambil deskriptor wajah asli via webcam secara langsung.
- Menghasilkan pasangan kunci **Ed25519** baru langsung di peramban pengguna. Public key didaftarkan ke server, sedangkan private key otomatis diunduh sebagai file dongle (`kryptoinfo-dongle-<username>.json`) untuk disimpan ke dalam flashdisk.

---

### B. Fitur Setelah Masuk (Dashboard Digital Vault)

Setelah ketiga faktor autentikasi berhasil diverifikasi, pengguna masuk ke dashboard dengan navigasi empat modul utama:

#### 1. Pesan Rahasia (Message Tab)
- **Enkripsi Berlapis (Hybrid):** Menggabungkan kriptografi klasik dan modern:
  - **Lapisan 1 (Klasik): Vigenere Cipher** — melakukan substitusi polyalphabetic berdasarkan kata kunci yang dimasukkan pengguna.
  - **Lapisan 2 (Modern): AES-256-GCM** — mengenkripsi hasil substitusi menggunakan AES mode Galois/Counter dengan random IV 12-byte dan authenticated tag 16-byte untuk menjamin kerahasiaan sekaligus integritas data.
- **Dekripsi Pesan:** Mengonversi payload JSON terenkripsi kembali ke plaintext asli setelah memverifikasi authentication tag dan membalik substitusi Vigenere.
- **Uji Integritas Otomatis:** Jika payload JSON dimanipulasi sekecil apa pun, dekripsi AES-GCM akan menolaknya.

#### 2. Brankas Digital (Vault Storage Tab)
- **Penyimpanan Terpusat & Terenkripsi:** Menyimpan catatan penting, kredensial login/akun, atau dokumen ringkas ke dalam database MariaDB.
- **Zero Plaintext Storage:** Data dienkripsi secara lokal sebelum dikirim ke database. Kolom database `encryptedData` hanya menyimpan struktur ciphertext aman.
- **Kategori Item:** Pengguna dapat mengelompokkan item ke dalam kategori `NOTE`, `CREDENTIAL`, atau `DOCUMENT`.
- **Manajemen Brankas Lengkap:**
  - Menambah item baru dengan enkripsi Vigenere + AES-256-GCM.
  - Menampilkan daftar seluruh item milik pengguna yang sedang login.
  - Membaca ciphertext dan mendekripsi konten asli sesuai kebutuhan dengan memasukkan kunci Vigenere yang cocok.
  - Menghapus item brankas secara aman.

#### 3. Steganografi Gambar (Stego Tab)
- **Teknik Least Significant Bit (LSB):** Menyisipkan bit pesan rahasia ke dalam bit paling tidak signifikan dari channel warna gambar PNG.
- **Penyisipan Terenkripsi:** Pesan terlebih dahulu dienkripsi menggunakan AES-256-GCM sebelum disematkan ke dalam piksel gambar, sehingga pihak yang berhasil mengekstrak bit tetap tidak dapat membaca isi pesan tanpa kunci.
- **Fitur Embed:** Unggah gambar PNG asli, ketik pesan rahasia, dan unduh file PNG hasil steganografi (`stego-output.png`). Tampilan visual gambar tampak identik dengan gambar asli.
- **Fitur Extract:** Unggah gambar PNG stego untuk mengekstrak pesan tersembunyi secara otomatis dan menampilkannya pada layar.

#### 4. Blockchain & Verifikasi Integritas Aset (Blockchain Tab)
- **Educational Immutable Hash-Chain:** Mengimplementasikan rantai blok terdesain khusus yang terikat ke setiap akun pengguna.
- **Hashing SHA-256:** Setiap blok menyimpan:
  - Indeks blok (`blockIndex`).
  - Metadata atau identifier aset (`assetId` / `metadata`).
  - Hash konten aset (`assetHash`).
  - Hash blok sebelumnya (`previousHash`).
  - Hash blok saat ini (`currentHash` = SHA-256 dari seluruh komponen blok).
  - Stempel waktu (`timestamp`).
- **Pencatatan Blok Baru:** Pengguna dapat memasukkan data atau log transaksi untuk dicatat secara permanen ke dalam rantai.
- **Verifikasi Integritas Rantai (One-Click Chain Verification):** Menelusuri seluruh rantai dari blok pertama (genesis) hingga blok terkini, menghitung ulang nilai hash secara berantai, dan mendeteksi apakah data pada suatu blok pernah dirusak atau diubah.

#### 5. Fitur Pendukung di Backend
- **Enkripsi File (ChaCha20-Poly1305):** Endpoint API backend `/api/crypto/file/encrypt` dan `/api/crypto/file/decrypt` untuk pengamanan file biner bervolume tinggi menggunakan cipher stream berkecepatan tinggi dengan autentikasi Poly1305.
- **Audit Aktivitas Keamanan (System Audit Log):** Endpoint `/api/audit` mencatat riwayat aktivitas autentikasi, enkripsi/dekripsi, serta manipulasi blok tanpa pernah mencatat kredensial, kunci privat, atau plaintext sensitif.

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
ProyekKriptoWithFrontend/
├── backend/                  # REST API Express & Prisma ORM (Port 3001)
│   ├── prisma/
│   │   ├── migrations/       # Riwayat migrasi database SQL
│   │   └── schema.prisma     # Skema model MariaDB
│   ├── src/
│   │   ├── config/           # Koneksi database MariaDB & Prisma
│   │   ├── controllers/      # Controller auth, crypto, vault, stego, blockchain
│   │   ├── crypto/           # Implementasi AES, ChaCha20, Vigenere, SHA-256
│   │   ├── middleware/       # Autentikasi sesi & error handler
│   │   ├── routes/           # Routing API Express (/api/*)
│   │   ├── app.js            # Konfigurasi aplikasi Express
│   │   └── server.js         # Entry point server backend
│   ├── tests/                # Pengujian otomatis (node:test)
│   ├── tools/                # Utilitas CLI dongle
│   ├── .env.example          # Contoh variabel lingkungan backend
│   └── package.json
├── frontend/                 # Aplikasi antarmuka React 18 + Vite (Port 5173/5174)
│   ├── public/
│   │   └── models/           # Bobot neural network face-api
│   ├── src/
│   │   ├── components/       # LoginPage, MessageTab, VaultTab, StegoTab, BlockchainTab
│   │   ├── services/         # Klien HTTP Axios / API connector
│   │   ├── utils/            # Helper face-api (kamera) dan crypto (Ed25519)
│   │   ├── App.jsx           # Root layout dan routing tab
│   │   └── main.jsx          # Entry point Vite React
│   ├── .eslintrc.cjs
│   ├── vite.config.js
│   └── package.json
├── usb-agent/                # Daemon lokal pemindaian USB & signing (Port 8787)
│   ├── src/
│   │   ├── discovery.js      # Deteksi drive removable & folder USB
│   │   ├── dongle.js         # Pembacaan PKCS#8 & signing Ed25519
│   │   └── server.js         # HTTP server lokal USB Agent
│   ├── test/                 # Pengujian unit discovery & signing
│   ├── .env.example
│   └── package.json
├── docs/                     # Dokumentasi teknis proyek
├── AGENTS.md                 # Petunjuk agen AI pengembang
├── TEST_PLAN.md              # Rencana dan checklist pengujian
└── README.md                 # Dokumentasi utama proyek
```

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

Jalankan ketiga modul secara bersamaan di terminal terpisah:

### Langkah 1: Persiapan Database
1. Buka XAMPP Control Panel, lalu klik **Start** pada modul **MySQL**.
2. Buat database baru bernama `kryptoinfo` melalui phpMyAdmin (`http://localhost/phpmyadmin`) atau MySQL CLI:
   ```sql
   CREATE DATABASE kryptoinfo;
   ```

### Langkah 2: Menjalankan Backend API
```bash
cd backend
# Salin file environment jika belum ada
cp .env.example .env

# Lengkapi ENCRYPTION_KEY (64 karakter hex) dan ENROLLMENT_CODE di .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```
Backend akan aktif di `http://localhost:3001`.

### Langkah 3: Menjalankan USB Companion Agent
Buka terminal baru:
```bash
cd usb-agent
cp .env.example .env
npm install
npm run dev
```
USB Agent akan aktif di `http://127.0.0.1:8787`.

### Langkah 4: Menjalankan Frontend
Buka terminal baru:
```bash
cd frontend
npm install
npm run dev
```
Akses antarmuka web melalui browser pada alamat `http://localhost:5173` (atau port yang ditampilkan Vite).

---

## 10. Pengujian Otomatis

Proyek dilengkapi serangkaian pengujian unit dan integrasi:

```bash
# Pengujian modul kriptografi & steganografi backend
cd backend
npm test

# Pengujian pemindaian dongle & signing USB Agent
cd usb-agent
npm test

# Pengujian smoke test frontend
cd frontend
npm test
```

## 11. Keamanan dan Keterbatasan

- USB flash drive biasa bukan hardware security module atau FIDO2 security key. Private key yang disimpan di dalamnya berpotensi disalin.
- Liveness detection sederhana bukan sistem anti-spoofing profesional.
- Vigenere Cipher hanya digunakan sebagai demonstrasi akademik, bukan sebagai perlindungan modern yang berdiri sendiri.
- Blockchain yang digunakan merupakan centralized educational hash-chain, bukan blockchain terdesentralisasi.
- Kunci enkripsi harus dikelola terpisah dari password hash.
- Rahasia dan data biometrik tidak boleh dimasukkan ke repository.

## 12. Status Pengembangan

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

## 13. Tim Pengembang

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
