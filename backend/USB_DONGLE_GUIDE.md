# Panduan Flashdisk Dongle KryptoInfo

## Prinsip

Flashdisk biasa berfungsi sebagai tempat menyimpan file private key Ed25519. Flashdisk tidak melakukan proses kriptografi sendiri. Pada tahap backend-only, Node.js CLI membaca file dari flashdisk, membuka enkripsinya secara lokal, dan menandatangani challenge dari API. Backend hanya menyimpan public key.

Ini prototipe file-key, bukan hardware security key anti-kloning. File dapat disalin, walaupun private key di dalamnya dienkripsi dengan passphrase.

## Persiapkan flashdisk

1. Colokkan flashdisk.
2. Buka File Explorer dan periksa drive letter, misalnya `E:`.
3. Buat folder `KryptoInfoDongle`, misalnya `E:\KryptoInfoDongle`.
4. Jangan format flashdisk dan jangan menghapus file lain.
5. Jangan membuat file JSON manual. CLI akan membuatnya.

## Daftarkan akun dan dongle (tanpa frontend)

Pastikan database dan backend sudah aktif. Dari terminal pada folder `backend`, jalankan:

```powershell
npm run dongle -- enroll --usb "E:\KryptoInfoDongle"
```

Ganti drive letter sesuai flashdiskmu. CLI meminta username, Master Password, `ENROLLMENT_CODE` dari `.env`, dan passphrase dongle minimal 10 karakter.

CLI membuat pasangan Ed25519. Public key dikirim ke backend. Private key dienkripsi menggunakan scrypt + AES-256-GCM sebelum disimpan di:

```text
E:\KryptoInfoDongle\kryptoinfo-dongle.json
```

Jangan mengubah isi file. Jangan mengirim file atau passphrase melalui WhatsApp, email, cloud drive, atau Git.

## Uji login

Dengan backend tetap aktif, jalankan:

```powershell
npm run dongle -- test --usb "E:\KryptoInfoDongle"
```

Masukkan username, Master Password, dan passphrase dongle. CLI akan meminta challenge, menandatangani challenge memakai private key yang dibuka secara lokal, lalu menguji session dan endpoint utama.

## Catatan biometrik

CLI memakai descriptor 128 angka yang merupakan **fixture demo**, bukan data dari kamera dan bukan face recognition. Ini hanya agar backend dan alur tiga faktor dapat diuji sebelum frontend tersedia. Jangan menyatakan bahwa pengenalan wajah sudah berfungsi berdasarkan tes CLI ini.

Ketika frontend dibuat, ia perlu terhubung ke alur autentikasi backend. File dongle terenkripsi buatan CLI tidak sama dengan contoh JSON private key plaintext di `FRONTEND_AUTH_CONTRACT.md`. Jangan menurunkan keamanan dengan mengekspor private key plaintext hanya agar cocok dengan contoh tersebut. Integrasi frontend nantinya sebaiknya menggunakan helper lokal yang menandatangani challenge tanpa pernah mengirim private key ke browser.

## Batasan

- Dongle diperiksa saat login. Mencabut flashdisk setelah login belum otomatis memutus session.
- File private key bisa disalin; passphrase melindungi isi file, bukan mencegah penyalinan file.
- Belum ada mekanisme reset/rotasi dongle mandiri. Jika file hilang, akun memerlukan proses registrasi ulang yang dikelola administrator.
- Untuk perangkat USB anti-kloning yang benar-benar menyimpan kunci non-exportable, gunakan FIDO2/WebAuthn security key.
