# KryptoVault — Security Model & Threat Assessment

> Dokumen Model Keamanan dan Analisis Ancaman KryptoVault  
> Versi: 1.0.0 | Status: Active Security Standard

---

## 1. Prinsip Keamanan Inti (Core Security Principles)

1. **Zero Exposure to Frontend**: Kunci privat (*private key*), kunci simetris (*master encryption key*), maupun derivasi kunci internal server tidak boleh dikirimkan atau diproses di peramban pengguna (frontend).
2. **Authenticated Encryption (AEAD)**: Semua data rahasia dienkripsi dengan algoritma yang menjamin kerahasiaan (*confidentiality*) dan integritas (*authenticity*) secara bersamaan menggunakan **AES-256-GCM**.
3. **Defense in Depth**: Keamanan tidak bertumpu pada satu lapisan saja, melainkan pada lapisan jaringan, validasi input server, otentikasi multi-faktor fisik, dan isolasi kriptografi.
4. **Physical Token Isolation & USB Safety**: Perangkat USB pengguna diperlakukan secara aman dan berhati-hati. Agen USB tidak memiliki izin untuk memformat, membuat partisi, menghapus, atau menimpa drive USB.
5. **Fail-Secure Defaults**: Jika terjadi error pada validasi tag, korupsi data, atau kegagalan verifikasi tanda tangan, sistem harus menolak akses secara aman (*abort and log*), bukan mengabaikan pengecualian.

---

## 2. Model Ancaman (Threat Model & Attacker Profiles)

| ID Ancaman | Skenario Ancaman | Profil Penyerang | Dampak Potensial | Mitigasi KryptoVault |
|---|---|---|---|---|
| **T-01** | *Eavesdropping / Man-in-the-Middle (MitM)* pada jaringan | Penyerang jaringan lokal / sniffing paket | Pencurian kredensial atau berkas plaintext | Enkripsi transport TLS/HTTPS + Enkripsi payload AES-256-GCM. |
| **T-02** | Pencurian Dump Database MySQL (*Stolen DB Dump*) | Penyerang dengan akses ke storage DB | Kebocoran berkas dan password pengguna | Password di-hash dengan Salt (Argon2/bcrypt). Berkas tersimpan dalam bentuk ciphertext AES-GCM; kunci enkripsi disimpan di `.env` server terpisah, bukan di tabel DB. |
| **T-03** | Modifikasi / Tampering Berkas Tersimpan (*Bit-flipping Attack*) | Penyerang memanipulasi ciphertext di disk | Eksekusi malware atau korupsi data rahasia | Verifikasi **Authentication Tag (16 bytes)** pada AES-GCM. Jika 1 bit berubah, `decipher.final()` akan gagal dan transaksi ditolak. |
| **T-04** | *Replay Attack* pada Otentikasi USB | Penyerang merekam komunikasi token USB | Bypass otentikasi dongle fisik | Protokol **Challenge-Response**: Server mengirimkan nonce acak 32-byte berkala dengan masa berlaku pendek (*timestamped challenge*). Respons hanya sah untuk 1 kali penggunaan. |
| **T-05** | *Brute-Force & Credential Stuffing* | Penyerang mencoba ribuan kombinasi password | Kompromi akun pengguna | Rate-limiting di layer API (`express-rate-limit`), hashing lambat dengan cost tinggi (Argon2/bcrypt), dan syarat USB 2FA. |
| **T-06** | *Timing Attacks* pada Verifikasi Token / Tag | Analisis waktu respons untuk menebak signature | Kebocoran kunci / pemalsuan signature | Penggunaan `crypto.timingSafeEqual()` untuk semua komparasi hash, HMAC, dan token. |
| **T-07** | *Accidental USB Destruction* (Kerusakan USB Pengguna) | Bug software menghapus data flash drive | Kerusakan perangkat atau data penting pengguna | Aturan mutlak: USB Agent beroperasi di file workspace terisolasi (misal `.kryptovault/token.key`), tidak ada syscall `format`, `diskpart`, atau raw disk write. |

---

## 3. Spesifikasi Kriptografi

### 3.1. Enkripsi Simetris (File Vault)
- **Algoritma**: AES (Advanced Encryption Standard).
- **Mode Operasi**: GCM (Galois/Counter Mode) — AEAD.
- **Panjang Kunci**: 256 bit (32 bytes).
- **Initialization Vector (IV) / Nonce**:
  - Panjang: 96 bit (12 bytes) sesuai rekomendasi NIST SP 800-38D.
  - Generator: Cryptographically Secure Pseudo-Random Number Generator (`crypto.randomBytes(12)`).
  - **Larangan Keras**: IV tidak boleh diulang dengan kunci yang sama (*nonce reuse forbidden*).
- **Authentication Tag**:
  - Panjang: 128 bit (16 bytes).
  - Wajib diekstrak dan disimpan berdampingan dengan ciphertext.
  - Wajib divalidasi dengan `decipher.setAuthTag(tag)` sebelum dekripsi diselesaikan.

### 3.2. Format Penyimpanan Ciphertext
Struktur payload enkripsi pada penyimpanan berkas atau database:
```
+-------------------+-----------------------------+-----------------------+
|  IV (12 Bytes)    |  Ciphertext (N Bytes)       |  Auth Tag (16 Bytes)  |
+-------------------+-----------------------------+-----------------------+
```

### 3.3. Key Derivation & Password Security
- **Algoritma Password Hashing**: Argon2id atau bcrypt (work factor minimal 12).
- **Salt**: Minimum 16 bytes acak CSPRNG unik per pengguna.
- **Master Key**:
  - Diberikan melalui variabel lingkungan `ENCRYPTION_KEY` berukuran 256-bit (64 karakter heksadesimal).
  - Dapat diperluas menggunakan HKDF (HMAC-based Extract-and-Expand Key Derivation Function) untuk derivasi sub-kunci per-pengguna/per-berkas jika diperlukan.

---

## 4. Protokol Keamanan USB Agent & Dongle

### 4.1. Filosofi Desain USB
USB fisik bertindak sebagai faktor otentikasi kepemilikan fisik (*Something You Have*). USB tidak digunakan untuk menyimpan database utama, melainkan sebagai tempat menyimpan kunci otentikasi privat / token sertifikat.

### 4.2. Mekanisme Challenge-Response
1. **Permintaan Tantangan**: Frontend meminta login untuk user `X`.
2. **Generasi Nonce**: Backend menghasilkan `nonce = crypto.randomBytes(32)` dan menyimpannya di cache sesi dengan TTL 60 detik.
3. **Penyampaian ke Agent**: Nonce dikirimkan ke USB Agent melalui HTTP loopback (`http://127.0.0.1:port`).
4. **Penandatanganan (Signing)**: USB Agent membaca identitas dongle terpasang dan menghitung `signature = HMAC-SHA256(dongle_secret, nonce)`.
5. **Verifikasi Server**: Backend menerima signature, mengambil rahasia dongle yang terdaftar untuk user `X`, menghitung verifikasi HMAC secara lokal menggunakan `crypto.timingSafeEqual`.
6. **Konsumsi Nonce**: Nonce langsung dihanguskan (*single-use*) untuk mencegah replay attack.

### 4.3. USB Safety & Fallback Development
- **Aturan Keamanan Fisik**: Tidak menyentuh struktur partisi atau file di luar direktori spesifik KryptoVault.
- **Development Key**: Menyediakan *Virtual USB Mode* untuk lingkungan testing otomatis (CI/CD atau unit testing) agar developer tanpa dongle fisik dapat menguji fungsionalitas secara deterministik tanpa menurunkan standar keamanan.

---

## 5. Keamanan Aplikasi & Session Management

1. **Token Sesi**:
   - JWT (JSON Web Token) dengan algoritma `HS256` atau `RS256`, ditandatangani dengan `JWT_SECRET`.
   - Masa berlaku pendek (*access token* 15 menit, *refresh token* terotasi).
   - Ditransmisikan melalui HTTP-only, Secure, SameSite=Strict cookies untuk mencegah akses via skrip jahat (XSS).
2. **Perlindungan Injeksi**:
   - SQL Injection dicegah 100% menggunakan *Prepared Statements* / parameterized queries (`mysql2/promise`).
   - XSS dicegah dengan sanitasi output React dan header `Content-Security-Policy`.
   - Path Traversal pada upload berkas dicegah dengan menamai ulang file di disk menggunakan UUID v4 acak (`crypto.randomUUID()`).
3. **Logging & Sanitasi Informasi**:
   - Log aplikasi dilarang mencatat: password plaintext, encryption key, IV, authentication tag mentah, atau isi plaintext berkas.
   - Semua kegagalan kriptografi dicatat dengan format: `[WARN] Decryption failed: tag verification mismatch for file_id=...`
