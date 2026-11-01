---
name: crypto-security-engineer
description: >
  Prosedur untuk implementasi algoritma kriptografi, pengelolaan encryption key,
  nonce/IV, validasi authentication tag, pengujian enkripsi/dekripsi, dan security review
  pada proyek KryptoVault.
---

# Crypto Security Engineer

Skill ini digunakan saat mengimplementasikan atau memodifikasi fitur kriptografi pada proyek KryptoVault. Ikuti seluruh prosedur di bawah ini secara berurutan.

---

## 1. Implementasi Algoritma Kriptografi

### Pemilihan Algoritma
- Gunakan **AES-256-GCM** sebagai algoritma enkripsi utama (authenticated encryption).
- Jangan menggunakan algoritma yang sudah deprecated (DES, 3DES, RC4, ECB mode).
- Semua operasi kriptografi harus dilakukan di **backend** (Node.js), bukan di frontend.
- Gunakan library `crypto` bawaan Node.js, kecuali ada kebutuhan spesifik yang memerlukan library tambahan.

### Prosedur Implementasi
1. Tentukan algoritma dan mode operasi yang akan digunakan.
2. Dokumentasikan alasan pemilihan algoritma di komentar kode.
3. Buat fungsi `encrypt()` dan `decrypt()` secara terpisah dan modular.
4. Tambahkan penanganan error yang jelas untuk setiap operasi kriptografi.
5. Jangan pernah meng-hardcode key di dalam source code.

---

## 2. Pengelolaan Encryption Key

### Aturan Key Management
- Simpan encryption key di **environment variable** (`.env`) atau key management system.
- Jangan pernah menyimpan key di frontend, database, atau version control.
- Gunakan key yang di-generate secara kriptografis aman (`crypto.randomBytes(32)`).
- Rotasi key harus didukung oleh arsitektur (simpan key ID bersama ciphertext).

### Prosedur
1. Generate key menggunakan `crypto.randomBytes(32)` untuk AES-256.
2. Simpan key di file `.env` dengan nama yang deskriptif (contoh: `ENCRYPTION_KEY`).
3. Pastikan `.env` tercantum di `.gitignore`.
4. Dokumentasikan format key yang diharapkan (hex, base64, dll).
5. Implementasikan validasi panjang dan format key sebelum digunakan.

---

## 3. Nonce dan Initialization Vector (IV)

### Aturan IV/Nonce
- Setiap operasi enkripsi **harus** menggunakan IV/nonce yang unik.
- Gunakan `crypto.randomBytes(12)` untuk GCM nonce (96-bit).
- Jangan pernah menggunakan IV/nonce yang sama dengan key yang sama.
- Simpan IV bersama ciphertext (prepend atau sebagai field terpisah).

### Prosedur
1. Generate IV/nonce baru untuk setiap pemanggilan `encrypt()`.
2. Gabungkan IV dengan ciphertext saat penyimpanan: `IV || ciphertext || authTag`.
3. Saat dekripsi, ekstrak IV dari data yang tersimpan sebelum mendekripsi.
4. Dokumentasikan format penyimpanan (offset byte untuk setiap komponen).

---

## 4. Validasi Authentication Tag

### Aturan Auth Tag (untuk AES-GCM)
- Selalu validasi authentication tag sebelum mempercayai hasil dekripsi.
- Gunakan panjang auth tag minimal **128-bit** (16 bytes).
- Jangan abaikan error dari `decipher.final()` — ini menandakan autentikasi gagal.

### Prosedur
1. Simpan auth tag bersama ciphertext: `IV (12B) || ciphertext || authTag (16B)`.
2. Saat dekripsi, set auth tag menggunakan `decipher.setAuthTag()`.
3. Tangkap error dari `decipher.final()` — jika gagal, data telah diubah (tampered).
4. Log kegagalan autentikasi tanpa mengekspos detail kriptografi ke client.
5. Kembalikan pesan error generik ke client: "Dekripsi gagal."

---

## 5. Pengujian Enkripsi dan Dekripsi

### Test Case Wajib
- **Happy path**: Enkripsi dan dekripsi data berhasil mengembalikan plaintext asli.
- **Key salah**: Dekripsi dengan key berbeda harus gagal.
- **Data rusak**: Modifikasi ciphertext harus menyebabkan auth tag validation gagal.
- **IV reuse detection**: Verifikasi bahwa setiap enkripsi menghasilkan IV unik.
- **Empty input**: Tangani input kosong dengan error yang sesuai.
- **Large input**: Uji dengan data berukuran besar (>1MB).

### Prosedur
1. Buat file test di folder `backend/tests/crypto/`.
2. Gunakan framework testing (Jest atau Mocha).
3. Jalankan semua test case dan pastikan 100% pass sebelum merge.
4. Tambahkan test case baru untuk setiap bug kriptografi yang ditemukan.

---

## 6. Security Review

### Checklist Review
- [ ] Tidak ada key atau secret yang di-hardcode di source code.
- [ ] Semua key disimpan di environment variable.
- [ ] IV/nonce di-generate secara acak untuk setiap operasi enkripsi.
- [ ] Authentication tag divalidasi saat dekripsi.
- [ ] Error kriptografi tidak mengekspos detail sensitif ke client.
- [ ] Algoritma yang digunakan sesuai standar (AES-256-GCM).
- [ ] Tidak ada operasi kriptografi di sisi frontend.
- [ ] `.env` tercantum di `.gitignore`.
- [ ] Semua test case kriptografi pass.
- [ ] Logging tidak menyimpan plaintext, key, atau IV.

### Prosedur Review
1. Jalankan checklist di atas sebelum setiap PR yang menyentuh kode kriptografi.
2. Dokumentasikan hasil review di komentar PR.
3. Jika ada item yang gagal, jangan merge sampai diperbaiki.
4. Lakukan review ulang setelah perbaikan.
