# PEMBAGIAN TUGAS PROYEK KRYPTOINFO

## Identitas Tim

| Anggota | Nama | NIM |
|---|---|---|
| 1 | Adhafa Joan Putranto | 123240069 |
| 2 | Mirwan Qolyubi | 123240116 |

## 1. Pembagian Tanggung Jawab Utama

### A. Adhafa Joan Putranto — Backend & Cryptography Engineer

Bertanggung jawab atas pengembangan backend, database, autentikasi, dan implementasi algoritma kriptografi.

**Tugas utama:**

1. Backend Architecture
   - Struktur Express.js.
   - REST API.
   - Controllers, routes, services, dan middleware.
   - Error handling.

2. Database
   - Prisma ORM.
   - MariaDB XAMPP.
   - Database schema.
   - Relasi dan migration.
   - Pengamanan data sensitif.

3. Authentication
   - USB challenge-response Ed25519.
   - USB Companion Agent.
   - Master Password dengan Argon2id.
   - Session management.
   - Validasi autentikasi backend.

4. Cryptography
   - Vigenere Cipher.
   - AES-256-GCM.
   - ChaCha20-Poly1305.
   - Pengelolaan encryption key.

5. Blockchain
   - SHA-256.
   - Pembuatan hash-chain.
   - Verifikasi integritas blok dan aset.

6. Backend Testing
   - API testing.
   - Database testing.
   - Authentication testing.
   - Cryptographic testing.

### B. Mirwan Qolyubi — Frontend & Application Interface Engineer

Bertanggung jawab atas antarmuka aplikasi, pengalaman pengguna, visualisasi proses kriptografi, dan integrasi fitur dari frontend.

**Tugas utama:**

1. UI/UX Design
   - Identitas visual KryptoInfo.
   - Dark cybersecurity dashboard.
   - Sidebar dan topbar.
   - Reusable components.
   - Responsive layout.

2. Frontend Development
   - React 18.3.1.
   - Vite.
   - React Router.
   - Halaman dashboard.
   - Halaman login dan enrollment.
   - Halaman secure message.
   - Halaman secure file.
   - Halaman steganography.
   - Halaman blockchain.
   - Halaman activity dan settings.

3. Frontend Integration
   - Menghubungkan frontend dengan REST API.
   - Menampilkan status autentikasi.
   - Mengelola state antarmuka.
   - Menampilkan respons dan error API.

4. Steganography Interface
   - Upload gambar PNG.
   - Input pesan rahasia.
   - Menampilkan hasil stego image.
   - Download dan upload kembali gambar.
   - Menampilkan hasil ekstraksi.

5. Frontend Testing
   - Navigasi.
   - Validasi input.
   - Upload dan download file.
   - Responsive testing.
   - Integrasi API.

6. Dokumentasi
   - Dokumentasi tampilan.
   - Panduan penggunaan aplikasi.
   - Screenshot demonstrasi.

## 2. Pembagian Berdasarkan PHASE

| PHASE | Adhafa | Mirwan |
|---|---|---|
| 0. Planning | Arsitektur backend dan keamanan | Rancangan UI dan alur pengguna |
| 1. Foundation | Express, Prisma, MariaDB | React, Vite, dashboard |
| 2. Authentication | USB Agent, Argon2id, validasi backend | UI login, webcam, enrollment |
| 3. Cryptography | Implementasi AES, Vigenere, ChaCha20 | Interface secure message dan file |
| 4. Steganography | API dan enkripsi payload | UI dan alur upload/extract |
| 5. Blockchain | Hash-chain dan verifikasi | Dashboard ledger dan visualisasi |
| 6. Testing | Backend, database, keamanan | Frontend, usability, integrasi |

## 3. Tanggung Jawab Bersama

Kedua anggota wajib:
- Memahami alur kerja keseluruhan aplikasi.
- Mengikuti standar penamaan file dan struktur folder.
- Melakukan integrasi antarbagian.
- Melakukan code review.
- Menguji fitur yang telah dibuat.
- Memperbaiki bug.
- Menyiapkan demonstrasi proyek.
- Memahami algoritma kriptografi yang digunakan untuk presentasi.

## 4. Aturan Kolaborasi

1. Jangan mengedit file yang sedang dikerjakan anggota lain tanpa koordinasi.
2. Setiap fitur harus memiliki API contract yang jelas sebelum integrasi.
3. Gunakan Git dan GitHub untuk menyimpan perubahan.
4. Gunakan branch terpisah untuk pekerjaan masing-masing.
5. Lakukan commit secara berkala dengan pesan yang jelas.
6. Jangan commit `.env`, private key, data biometrik, atau file rahasia.
7. Setiap fitur harus diuji sebelum dinyatakan selesai.
8. Perubahan database harus dikoordinasikan oleh Adhafa.
9. Perubahan kontrak API harus diberitahukan kepada anggota lain.
10. Integrasikan fitur secara bertahap, jangan menunggu seluruh fitur selesai.

## 5. Standar Penyelesaian Tugas

Sebuah tugas dianggap selesai apabila:

- Kode sudah dibuat.
- Tidak terdapat error yang belum diselesaikan.
- Fitur dapat dijalankan.
- Pengujian dasar sudah dilakukan.
- Hasilnya dapat diperlihatkan.
- Dokumentasi atau instruksi penggunaan tersedia.

## 6. Alur Integrasi

1. Anggota yang mengerjakan fitur menentukan kebutuhan dan kontraknya.
2. Anggota terkait mengembangkan bagian masing-masing.
3. Kode disimpan melalui Git.
4. Kedua anggota mengintegrasikan perubahan.
5. Fitur diuji bersama.
6. Bug diperbaiki.
7. Fitur dinyatakan selesai setelah diverifikasi.

## 7. Prinsip Kerja Tim

Pembagian tugas bukan berarti setiap anggota hanya perlu memahami bagian sendiri. Kedua anggota tetap harus memahami konsep autentikasi, algoritma kriptografi, database, dan alur kerja aplikasi secara keseluruhan.

Tujuan akhirnya adalah menghasilkan KryptoInfo yang berfungsi, aman sesuai ruang lingkup akademik, dan dapat dipertanggungjawabkan saat demonstrasi serta presentasi.