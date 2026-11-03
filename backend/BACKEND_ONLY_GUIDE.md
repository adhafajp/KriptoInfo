# Menjalankan dan Menguji Backend KryptoInfo Tanpa Frontend

Backend tidak membutuhkan frontend untuk dijalankan atau diuji. Frontend nantinya hanya menjadi salah satu klien REST API. Untuk tahap sekarang, gunakan CLI yang tersedia di `tools/dongle-cli.js`.

## A. Siapkan database dan backend

1. Jalankan MariaDB/MySQL dari XAMPP.
2. Buat database `kryptoinfo` di phpMyAdmin.
3. Salin `.env.example` menjadi `.env`.
4. Buat `ENCRYPTION_KEY` 32 byte / 64 karakter hex:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

5. Isi `ENROLLMENT_CODE` dengan kode rahasia sendiri.
6. Install dan siapkan Prisma:

   ```bash
   npm install
   npx prisma validate
   npx prisma generate
   npx prisma migrate dev --name init
   ```

7. Jalankan API:

   ```bash
   npm run dev
   ```

8. Di terminal kedua, cek koneksi:

   ```bash
   npm run dongle -- health
   ```

## B. Siapkan flashdisk

1. Colokkan flashdisk.
2. Buat folder bernama `KryptoInfoDongle` pada flashdisk. Contoh Windows: `E:\KryptoInfoDongle`.
3. Jangan format flashdisk dan jangan menghapus file lain.
4. Jangan membuat file `kryptoinfo-dongle.json` secara manual. CLI yang akan membuatnya.

## C. Enrollment (buat akun dan daftarkan dongle)

Jalankan dari folder backend:

```powershell
npm run dongle -- enroll --usb "E:\KryptoInfoDongle"
```

Ganti `E:\KryptoInfoDongle` dengan lokasi folder flashdisk milikmu. CLI akan meminta:
- username baru;
- Master Password (sesuai kebijakan password backend);
- nilai `ENROLLMENT_CODE` dari `.env`;
- passphrase khusus untuk mengenkripsi private key di flashdisk (minimal 10 karakter).

CLI membuat pasangan kunci Ed25519. Public key dikirim ke API, sedangkan private key dienkripsi dengan scrypt + AES-256-GCM lalu disimpan di:

```text
E:\KryptoInfoDongle\kryptoinfo-dongle.json
```

Backend hanya menyimpan public key. Passphrase dongle tidak dikirim ke backend.

## D. Uji login dan fitur backend

Dengan backend masih berjalan, jalankan:

```powershell
npm run dongle -- test --usb "E:\KryptoInfoDongle"
```

CLI akan meminta username, Master Password, dan passphrase dongle. CLI kemudian:
1. membaca file private key dari flashdisk;
2. mendekripsi private key secara lokal;
3. meminta challenge satu kali dari backend;
4. menandatangani challenge Ed25519;
5. melakukan login dan menerima session cookie;
6. menguji proteksi API (401 tanpa sesi) serta penolakan challenge replay;
7. menguji enkripsi pesan, enkripsi file, vault, blockchain, dan steganografi PNG;
8. logout.

CLI tidak menyimpan password atau passphrase di file konfigurasi.

## E. Batasan face recognition pada mode backend-only

Karena belum ada frontend/kamera atau modul face recognition, CLI menggunakan descriptor 128 angka yang bersifat fixture/demo agar alur API tiga faktor dapat diuji. Ini **bukan pengenalan wajah** dan tidak boleh dipresentasikan sebagai biometrik asli. Backend saat ini menerima descriptor dari klien dan mencocokkannya dengan template terenkripsi. Saat modul face recognition dibuat, klien harus mengganti fixture ini dengan descriptor hasil model wajah yang sama saat enrollment dan login.

## F. Keamanan dan pemakaian

- Jangan commit `.env` atau `kryptoinfo-dongle.json` ke Git.
- Jangan kirim file dongle atau passphrase melalui chat/email/cloud.
- Simpan salinan recovery file dongle di media aman lain; jika hilang, pemulihan memerlukan proses registrasi ulang yang dikelola admin.
- File private key pada flashdisk telah dienkripsi dengan passphrase, tetapi ini tetap bukan security key anti-kloning.
- CLI memverifikasi dongle hanya saat login. Pencabutan flashdisk setelah login belum otomatis memutus sesi.
- Gunakan HTTPS dan pengaturan produksi sebelum deployment publik.

## G. Endpoint API

Semua endpoint tersedia tanpa frontend. Gunakan CLI untuk autentikasi, atau Postman/Insomnia untuk mengirim request:

- `GET /api/health`
- `POST /api/auth/enroll`
- `POST /api/auth/challenge`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/crypto/message/encrypt`
- `POST /api/crypto/message/decrypt`
- `POST /api/crypto/file/encrypt`
- `POST /api/crypto/file/decrypt`
- `POST/GET/DELETE /api/vault`
- `POST/GET /api/blockchain`, `GET /api/blockchain/verify`
- `POST /api/stego/embed`, `POST /api/stego/extract`
- `GET /api/audit`
