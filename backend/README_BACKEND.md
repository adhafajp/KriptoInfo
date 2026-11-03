# KryptoInfo Backend — versi sederhana untuk prototipe akademik

> **Backend dapat dijalankan dan diuji tanpa frontend.** Gunakan `tools/dongle-cli.js` untuk membuat dongle Ed25519 pada flashdisk, melakukan enrollment/login, dan menguji endpoint backend. Panduan lengkap: [`BACKEND_ONLY_GUIDE.md`](./BACKEND_ONLY_GUIDE.md).


## Yang sudah disiapkan
- Master Password disimpan menggunakan Argon2id.
- Dongle flashdisk: CLI membuat private key Ed25519 yang dienkripsi dengan passphrase di USB; backend menyimpan public key dan memverifikasi signature challenge sekali pakai.
- Face verification: backend membandingkan descriptor 128 angka yang diterima dari klien dengan template terenkripsi di database. CLI memakai fixture demo, bukan kamera.
- Session cookie HttpOnly dan endpoint logout.
- Vigenere + AES-256-GCM untuk pesan.
- ChaCha20-Poly1305 untuk file.
- PNG LSB untuk steganografi dengan payload AES-256-GCM.
- Vault menyimpan ciphertext dan membatasi akses berdasarkan user login.
- SHA-256 hash chain sederhana per pengguna.

## Batasan penting untuk demo
Browser tidak bisa mencegah halaman publik terbuka. Yang dikunci adalah dashboard dan seluruh API vault/fitur; tanpa autentikasi, API mengembalikan HTTP 401. Pada tahap backend-only, CLI membaca file dongle dari flashdisk dan menandatangani challenge. File dapat disalin, jadi ini bukan dongle hardware anti-kloning/FIDO2. Face descriptor asli tetap memerlukan modul pengenalan wajah di klien; CLI menggunakan fixture khusus pengujian.

## Persiapan
1. Pastikan Node.js minimal 20.19 dan XAMPP MariaDB aktif.
2. Buat database `kryptoinfo` melalui phpMyAdmin.
3. Salin `.env.example` menjadi `.env`.
4. Isi `ENCRYPTION_KEY` dengan 32 byte random (64 karakter hex), contoh perintah:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
5. Ganti `ENROLLMENT_CODE` dengan nilai rahasia sendiri.
6. Jalankan:
   `npm install`
   `npx prisma validate`
   `npx prisma generate`
   `npx prisma migrate dev --name init`
   `npm run dev`
7. Buka `http://localhost:3001/api/health`.

Jangan membagikan `.env`, private key USB, password, atau ENROLLMENT_CODE. Jangan commit file tersebut ke Git.

## Alur dongle Ed25519
Pada pengujian backend-only, CLI membuat pasangan kunci Ed25519. Private key dienkripsi dengan scrypt + AES-256-GCM di flashdisk, sementara public key dikirim ke endpoint enrollment. Pada login CLI:
1. `POST /api/auth/challenge` dengan `{ "username": "..." }`.
2. CLI membuka private key dengan passphrase secara lokal lalu menandatangani string `challenge` (UTF-8) memakai Ed25519.
3. `POST /api/auth/login` membawa `username`, `password`, `challengeId`, `signature` (Base64URL), dan `faceDescriptor` (array 128 angka).
4. Backend memverifikasi faktor yang dikirim lalu mengirim cookie sesi HttpOnly.

Web Crypto Ed25519 membutuhkan browser modern dan secure context; localhost dapat digunakan untuk development. Referensi: MDN SubtleCrypto Ed25519 dan Prisma ORM v7 driver adapter.

## Kontrak face recognition
Frontend perlu menghasilkan descriptor wajah berupa array 128 angka saat enrollment dan login. Kirim descriptor enrollment pada `POST /api/auth/enroll`, dan descriptor saat login pada `POST /api/auth/login`. Backend menghitung jarak Euclidean; nilai ambang diatur lewat `FACE_MATCH_THRESHOLD`. Ambang perlu diuji dengan model yang dipilih. Jangan mengirim atau menyimpan foto wajah mentah.

## API ringkas
- `POST /api/auth/enroll` — header `X-Enrollment-Code`; body `username,password,publicKey,faceDescriptor`.
- `POST /api/auth/challenge` — body `username`.
- `POST /api/auth/login` — body `username,password,challengeId,signature,faceDescriptor`.
- `GET /api/auth/me`, `POST /api/auth/logout`.
- `POST /api/crypto/message/encrypt`, `POST /api/crypto/message/decrypt`.
- `POST /api/crypto/file/encrypt`, `POST /api/crypto/file/decrypt`.
- `POST /api/vault`, `GET /api/vault`, `GET /api/vault/:id`, `DELETE /api/vault/:id`.
- `POST /api/stego/embed`, `POST /api/stego/extract` (multipart/form-data, field `image`; embed juga butuh field `text`).
- `POST /api/blockchain`, `GET /api/blockchain`, `GET /api/blockchain/verify`.
- `GET /api/audit`, `GET /api/health`.

Frontend wajib mengirim fetch dengan `credentials: 'include'` agar cookie sesi ikut terkirim.

Contoh kontrak integrasi browser tahap berikutnya tersedia di `FRONTEND_AUTH_CONTRACT.md`. Perhatikan catatan kompatibilitas format dongle pada dokumen tersebut.

## Panduan flashdisk dongle
Baca `USB_DONGLE_GUIDE.md` sebelum enrollment pertama. Jangan format flashdisk; buat folder `KryptoInfoDongle`, lalu pindahkan file private-key hasil enrollment ke sana.

## Menguji backend tanpa frontend

Jalankan backend dan database, lalu gunakan terminal kedua:

```powershell
npm run dongle -- health
npm run dongle -- enroll --usb "E:\KryptoInfoDongle"
npm run dongle -- test --usb "E:\KryptoInfoDongle"
```

Ganti path sesuai drive flashdisk. Mode CLI memakai face descriptor fixture untuk pengujian API; itu bukan face recognition sungguhan. Rincian dan batasan ada di [`BACKEND_ONLY_GUIDE.md`](./BACKEND_ONLY_GUIDE.md).
