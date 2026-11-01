# PRODUCT REQUIREMENTS DOCUMENT (PRD)
# KRYPTOINFO
### Three-Layer Secure Digital Vault

**Version:** 1.0  
**Project Status:** In Development  
**Document Type:** Product Requirements Document  
**Project Category:** Academic Cryptography Web Application

---

# 1. PROJECT OVERVIEW

## 1.1 Product Name

KryptoInfo — Three-Layer Secure Digital Vault.

## 1.2 Product Description

KryptoInfo merupakan aplikasi web yang dirancang untuk melindungi informasi dan aset digital melalui kombinasi autentikasi berlapis, algoritma kriptografi, steganografi, serta verifikasi integritas data.

Aplikasi ini dikembangkan sebagai proyek akhir mata kuliah Kriptografi dengan tujuan mengimplementasikan konsep kriptografi klasik dan modern ke dalam sebuah aplikasi yang dapat digunakan dan didemonstrasikan.

KryptoInfo menggabungkan tiga lapisan autentikasi, yaitu USB Dongle Authentication, Facial Recognition Authentication, dan Master Password.

Selain autentikasi, aplikasi menyediakan fitur perlindungan pesan, file, penyimpanan data, penyembunyian pesan dalam gambar, serta verifikasi integritas aset menggunakan pendekatan hash-chain blockchain.

## 1.3 Project Objectives

Tujuan pengembangan KryptoInfo:

1. Mengimplementasikan autentikasi dengan tiga lapisan keamanan.
2. Menerapkan algoritma kriptografi klasik dan modern.
3. Melindungi informasi digital dari akses yang tidak sah.
4. Menyediakan fitur enkripsi dan dekripsi pesan serta file.
5. Mengimplementasikan steganografi untuk menyembunyikan pesan rahasia.
6. Menerapkan hash-chain untuk memverifikasi integritas aset digital.
7. Menghasilkan aplikasi yang fungsional dan dapat diuji sebagai proyek akademik.

## 1.4 Target Users

Target pengguna aplikasi:

- Individu yang membutuhkan penyimpanan informasi digital secara lebih aman.
- Pengguna yang ingin melindungi pesan dan dokumen pribadi.
- Pengguna yang ingin mempelajari penerapan algoritma kriptografi.
- Pengguna yang membutuhkan demonstrasi autentikasi berlapis dan integritas data.

## 1.5 Problem Statement

Informasi dan aset digital dapat menghadapi risiko akses tidak sah, kebocoran informasi, pencurian data, serta manipulasi file.

KryptoInfo dirancang untuk menggabungkan beberapa pendekatan keamanan dalam satu aplikasi, sehingga pengguna dapat mengelola dan melindungi informasi digital melalui autentikasi, enkripsi, steganografi, dan verifikasi integritas.

---

# 2. PRODUCT SCOPE

## 2.1 In Scope

Fitur yang termasuk dalam ruang lingkup pengembangan:

1. Three-Layer Authentication.
2. Secure Message.
3. Secure File.
4. Database Encryption.
5. Image Steganography.
6. Blockchain Asset Integrity Verification.
7. Security Activity Monitoring.
8. Dashboard dan pengelolaan aplikasi.

## 2.2 Out of Scope

Hal-hal yang tidak menjadi target utama proyek:

- Blockchain publik terdesentralisasi.
- Hardware Security Module (HSM).
- Autentikasi FIDO2 menggunakan security key khusus.
- Penyimpanan cloud eksternal.
- Sinkronisasi antarperangkat.
- Sistem biometrik bersertifikasi profesional.
- Layanan keamanan komersial berskala enterprise.

---

# 3. FUNCTIONAL REQUIREMENTS

## FR-01 — Three-Layer Authentication

Sistem harus menyediakan tiga lapisan autentikasi yang dilakukan secara berurutan.

### FR-01.1 USB Dongle Authentication

- Sistem mendeteksi USB flash drive yang terhubung.
- Sistem menggunakan Ed25519 untuk challenge-response.
- Private key disimpan pada USB flash drive.
- Public key didaftarkan pada database.
- Backend menghasilkan challenge yang bersifat acak dan memiliki masa berlaku.
- USB Companion Agent menandatangani challenge.
- Backend memverifikasi tanda tangan menggunakan public key.
- Sistem menolak autentikasi jika verifikasi gagal.

### FR-01.2 Facial Recognition Authentication

- Sistem menyediakan proses registrasi wajah.
- Sistem menggunakan webcam laptop.
- Sistem melakukan face detection dan face embedding.
- Sistem melakukan verifikasi identitas berdasarkan similarity.
- Sistem menyediakan instruksi liveness sederhana.
- Template biometrik disimpan dalam bentuk terlindungi.
- Pengguna dapat menghapus data registrasi wajah.

### FR-01.3 Master Password

- Sistem meminta Master Password setelah dua lapisan sebelumnya berhasil.
- Password disimpan menggunakan Argon2id.
- Verifikasi dilakukan pada backend.
- Sistem memiliki pembatasan percobaan login.
- Sistem mengelola session pengguna.
- Sistem menyediakan logout dan penguncian vault.

## FR-02 — Secure Message

Sistem harus menyediakan fitur enkripsi dan dekripsi pesan menggunakan kombinasi:

- Vigenere Cipher.
- AES-256-GCM.

Fungsi:
- Membuat pesan.
- Memasukkan plaintext.
- Mengenkripsi pesan.
- Menampilkan hasil intermediate Vigenere.
- Menampilkan ciphertext akhir.
- Menyimpan ciphertext.
- Mengambil pesan.
- Mendekripsi pesan.

## FR-03 — Secure File

Sistem harus menyediakan enkripsi dan dekripsi file menggunakan ChaCha20-Poly1305.

Fungsi:
- Upload file.
- Mengenkripsi file.
- Menyimpan hasil enkripsi.
- Menampilkan metadata.
- Download ciphertext.
- Mendekripsi file.
- Mengembalikan file ke format aslinya.
- Mendeteksi modifikasi atau kerusakan data.

## FR-04 — Database Encryption

Sistem harus melindungi data sensitif sebelum disimpan ke database.

Persyaratan:
- Data pesan disimpan sebagai ciphertext.
- Password disimpan sebagai hash.
- IV dan authentication tag dikelola dengan benar.
- Encryption key tidak disimpan sebagai plaintext.
- Key management dipisahkan dari password hashing.
- Data pengguna hanya dapat diakses oleh pemilik yang berwenang.

## FR-05 — Image Steganography

Sistem harus menyediakan penyembunyian pesan menggunakan PNG LSB.

Alur:
1. Pengguna memilih gambar PNG.
2. Pengguna memasukkan pesan rahasia.
3. Pesan dienkripsi menggunakan AES-256-GCM.
4. Ciphertext disisipkan ke dalam gambar menggunakan LSB.
5. Sistem menghasilkan stego image.
6. Pengguna dapat mengunduh gambar.
7. Pengguna dapat mengunggah kembali gambar.
8. Sistem mengekstrak ciphertext.
9. Sistem mendekripsi pesan.
10. Sistem menampilkan pesan asli.

## FR-06 — Blockchain Asset Integrity

Sistem harus menyediakan mekanisme verifikasi integritas aset menggunakan educational hash-chain blockchain.

Setiap blok memiliki:
- Index.
- Timestamp.
- Asset ID.
- Asset metadata.
- Asset SHA-256.
- Previous hash.
- Current hash.

Fungsi:
- Menambahkan aset.
- Melihat daftar aset.
- Melihat blockchain ledger.
- Memverifikasi hash aset.
- Memverifikasi seluruh chain.
- Mendeteksi perubahan data.

## FR-07 — Security Activity

Sistem harus mencatat aktivitas keamanan, termasuk:
- Riwayat login.
- Hasil autentikasi USB.
- Hasil autentikasi wajah.
- Percobaan login gagal.
- Aktivitas enkripsi dan dekripsi.
- Aktivitas steganografi.
- Registrasi aset.
- Verifikasi blockchain.
- Lock dan logout.

Sistem tidak boleh mencatat password, private key, encryption key, raw facial data, atau plaintext pesan rahasia.

## FR-08 — Dashboard

Sistem menyediakan dashboard yang menampilkan:
- Status keamanan vault.
- Status USB.
- Status registrasi biometrik.
- Jumlah pesan terenkripsi.
- Jumlah file terenkripsi.
- Jumlah aset terlindungi.
- Status integritas blockchain.
- Aktivitas terbaru.

---

# 4. NON-FUNCTIONAL REQUIREMENTS

## NFR-01 — Security

- Validasi autentikasi dilakukan pada backend.
- Tidak ada private key atau encryption key di frontend.
- Password tidak disimpan sebagai plaintext.
- Operasi enkripsi menggunakan nonce atau IV yang sesuai.
- Sistem memiliki session management.
- Sistem melakukan validasi input.
- Sistem menerapkan pembatasan percobaan autentikasi.

## NFR-02 — Performance

- Antarmuka harus responsif.
- Operasi enkripsi harus dapat digunakan pada file berukuran wajar untuk demonstrasi.
- Proses biometrik dilakukan secara lokal jika memungkinkan.
- Penggunaan resource laptop harus diperhatikan.

## NFR-03 — Usability

- Antarmuka mudah dipahami.
- Navigasi konsisten.
- Setiap operasi memiliki feedback.
- Pesan error harus jelas.
- Tampilan mendukung desktop dan mobile.

## NFR-04 — Maintainability

- Kode menggunakan struktur modular.
- Frontend dan backend dipisahkan.
- API memiliki struktur yang konsisten.
- Dokumentasi teknis tersedia.
- Setiap fitur memiliki pengujian yang relevan.

## NFR-05 — Privacy

- Kamera hanya diaktifkan dengan izin pengguna.
- Data biometrik diproses secara lokal jika memungkinkan.
- Raw facial image tidak disimpan tanpa kebutuhan.
- Informasi sensitif tidak dimasukkan ke audit log.

---

# 5. TECHNOLOGY STACK

| Layer | Technology |
|---|---|
| Frontend | React 18.3.1 |
| Build Tool | Vite |
| Routing | React Router |
| Styling | Tailwind CSS / suitable styling |
| Icons | Lucide React |
| Backend | Node.js |
| API Framework | Express.js |
| ORM | Prisma |
| Database | MariaDB XAMPP |
| USB Authentication | Ed25519 |
| Password Hashing | Argon2id |
| Classical Cipher | Vigenere |
| Text Encryption | AES-256-GCM |
| File Encryption | ChaCha20-Poly1305 |
| Steganography | PNG LSB |
| Hashing | SHA-256 |

---

# 6. USER INTERFACE REQUIREMENTS

Aplikasi harus memiliki halaman:

1. Welcome / Lock Screen.
2. USB Verification.
3. Facial Authentication.
4. Master Password.
5. Account Enrollment.
6. Dashboard.
7. Secure Message.
8. Secure File.
9. Stego Image.
10. Blockchain Asset.
11. Security Activity.
12. Settings.

### Design Direction

- Premium cybersecurity dashboard.
- Dark theme.
- Deep navy atau charcoal background.
- Electric blue dan cyan accents.
- Modern typography.
- Lucide icons.
- Subtle animations.
- Responsive layout.
- Professional visual hierarchy.

---

# 7. DEVELOPMENT PHASES

Pengembangan dilakukan secara bertahap.

| Phase | Scope | Deliverable |
|---|---|---|
| 0 | Environment inspection and planning | Dokumentasi dan arsitektur |
| 1 | Project foundation | Frontend, backend, database, dashboard |
| 2 | Authentication | USB, facial recognition, master password |
| 3 | Cryptography | Secure message, secure file, database encryption |
| 4 | Steganography | PNG LSB dan AES-GCM |
| 5 | Blockchain | Asset hash dan hash-chain verification |
| 6 | Testing and documentation | Pengujian, audit, dan laporan akhir |

Setiap fase harus diverifikasi sebelum melanjutkan ke fase berikutnya.

---

# 8. TEAM RESPONSIBILITIES

## Adhafa Joan Putranto

Primary responsibility:
- Backend development.
- Database architecture.
- Prisma ORM.
- Authentication backend.
- USB Companion Agent.
- Cryptographic implementation.
- Blockchain logic.
- Backend testing.

## Mirwan Qolyubi — 123240116

Primary responsibility:
- Frontend development.
- UI/UX design.
- React implementation.
- Dashboard and application pages.
- Frontend integration.
- Steganography interface.
- Frontend testing.
- User documentation.

## Shared Responsibilities

Kedua anggota bertanggung jawab atas:
- System integration.
- Code review.
- End-to-end testing.
- Bug fixing.
- Technical documentation.
- Project demonstration.
- Final presentation.

---

# 9. ACCEPTANCE CRITERIA

Proyek dinyatakan memenuhi kebutuhan apabila:

### Authentication
- USB tanpa private key yang valid ditolak.
- Challenge yang kedaluwarsa ditolak.
- Wajah yang tidak cocok ditolak.
- Password yang salah ditolak.
- Autentikasi lengkap berhasil membuka vault.
- USB dilepas menyebabkan vault terkunci sesuai kebijakan session.

### Cryptography
- Vigenere dapat mengenkripsi dan mendekripsi pesan.
- AES-GCM berhasil memverifikasi authentication tag.
- ChaCha20-Poly1305 berhasil memulihkan file asli.
- Ciphertext yang dimodifikasi ditolak.

### Steganography
- Pesan berhasil disisipkan ke PNG.
- Pesan berhasil diekstrak.
- Pesan hasil dekripsi sama dengan pesan asli.
- Gambar dengan kapasitas tidak cukup ditolak.

### Blockchain
- Genesis block valid.
- Blok baru memiliki previous hash yang sesuai.
- Aset asli berhasil diverifikasi.
- Perubahan aset dapat terdeteksi.
- Manipulasi blok dapat terdeteksi melalui validasi chain.

### Database
- Password tersimpan sebagai hash.
- Pesan sensitif tidak disimpan sebagai plaintext.
- Data pengguna terisolasi.
- Akses tidak sah ditolak.

Seluruh kriteria harus dibuktikan melalui pengujian nyata, bukan hanya tampilan antarmuka.

---

# 10. RISKS AND LIMITATIONS

| Risiko | Penanganan |
|---|---|
| Private key USB dapat disalin | Dokumentasikan keterbatasan USB biasa |
| Face recognition kurang akurat | Uji threshold dan kondisi webcam |
| Liveness sederhana dapat dilewati | Nyatakan sebagai demonstrasi akademik |
| File terlalu besar | Terapkan batas ukuran yang wajar |
| Kesalahan pengelolaan kunci | Gunakan pemisahan key dan dokumentasi |
| Data steganografi rusak | Gunakan PNG lossless dan validasi payload |
| Manipulasi blockchain | Lakukan verifikasi hash seluruh chain |

---

# 11. PROJECT DELIVERABLES

Hasil akhir proyek mencakup:

1. Aplikasi web KryptoInfo.
2. Source code frontend.
3. Source code backend.
4. USB Companion Agent.
5. Database schema.
6. Dokumentasi arsitektur.
7. Dokumentasi keamanan.
8. Dokumentasi algoritma kriptografi.
9. ERD.
10. Automated testing.
11. README dan installation guide.
12. Dokumentasi pengujian.
13. Laporan proyek akademik.
14. Materi demonstrasi dan presentasi.

---

# 12. PROJECT SUCCESS DEFINITION

KryptoInfo dianggap berhasil apabila seluruh fitur yang termasuk dalam ruang lingkup dapat diimplementasikan, diuji, didokumentasikan, dan didemonstrasikan sesuai kemampuan perangkat keras yang tersedia.

Keberhasilan proyek tidak hanya dinilai dari tampilan aplikasi, tetapi juga dari kebenaran implementasi algoritma, keamanan pengelolaan data, pengujian, serta kemampuan anggota tim menjelaskan proses kerja sistem.

---

**KryptoInfo — Your Digital Assets. Protected by Three Layers.**