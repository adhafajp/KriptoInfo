# KryptoInfo USB Agent — Flexible Discovery

USB Agent versi ini tidak lagi menunjuk satu file melalui `DONGLE_FILE`. Agent memindai beberapa lokasi dan dapat menemukan banyak file dongle JSON sekaligus.

## Yang dipindai

Di Windows, Agent mendeteksi semua drive yang diklasifikasikan Windows sebagai `Removable`, lalu memeriksa file `.json` pada:

- root drive (misalnya `F:\`)
- `F:\KryptoInfoDongle\`
- `F:\.kryptoinfo\dongles\`
- `F:\KryptoInfo\dongles\`

Untuk drive USB yang oleh Windows diklasifikasikan sebagai `Fixed`, atau folder lain, tambahkan lokasinya pada `DONGLE_EXTRA_ROOTS` di `.env`, dipisahkan titik koma. Agent tidak melakukan pencarian rekursif ke seluruh isi drive.

Setiap file JSON hanya dianggap dongle jika mempunyai field `privateKeyPkcs8` yang valid sebagai private key Ed25519 PKCS#8. File JSON biasa diabaikan. Format lama frontend tetap didukung:

```json
{ "privateKeyPkcs8": "BASE64_PKCS8_DER" }
```

Nama file `kryptoinfo-dongle-USERNAME.json` dipakai untuk menampilkan username jika field `username` tidak ada.

## Install

Salin `.env.example` menjadi `.env`, lalu sesuaikan port/origin bila perlu.

```powershell
npm install
npm test
npm start
```

Tidak ada konfigurasi `DONGLE_FILE` lagi.

## API

### GET `/api/status`

Mengembalikan seluruh dongle valid yang ditemukan. Tidak pernah mengirim private key atau absolute file path.

Contoh:
```bash
Invoke-RestMethod http://127.0.0.1:8787/api/status | ConvertTo-Json -Depth 5
```
```json
{
  "success": true,
  "detected": true,
  "count": 2,
  "dongles": [
    {
      "id": "stable-for-current-path",
      "username": "adhafa",
      "fileName": "kryptoinfo-dongle-adhafa.json",
      "drive": "F:",
      "fingerprint": "sha256-public-key-prefix"
    }
  ]
}
```

### POST `/api/sign-challenge`

Body:

```json
{
  "dongleId": "ID_DARI_STATUS",
  "challengeText": "CHALLENGE_DARI_BACKEND"
}
```

Jika hanya satu dongle valid ditemukan, `dongleId` boleh tidak disertakan. Jika lebih dari satu ditemukan, `dongleId` wajib agar Agent tidak memilih kunci yang salah.

Signature ditandatangani atas string challenge UTF-8 dan dikembalikan sebagai Base64URL. Ini sesuai dengan verifikasi backend KryptoInfo saat ini.

## Batasan dan keamanan

- Ini prototipe software dongle pada flashdisk biasa, bukan hardware security key yang tahan-kloning.
- Format JSON saat ini berisi private key PKCS#8 Base64 tanpa passphrase. Siapa pun yang menyalin file dapat menggunakan kuncinya. Jangan commit atau membagikan file dongle.
- Private key dibaca ke memori proses Agent saat signing. Private key tidak pernah dikirim melalui respons API.
- Agent hanya bind ke `127.0.0.1` dan membatasi Origin browser. Ini bukan perlindungan terhadap malware/program lokal lain.
- Auto-discovery Windows memakai klasifikasi `DriveType.Removable`. USB drive yang dilaporkan sebagai `Fixed` perlu ditambahkan melalui `DONGLE_EXTRA_ROOTS`.
- Agent memindai root dan beberapa folder dongle yang telah ditentukan, bukan seluruh disk secara rekursif.
- `id` dongle terikat pada file path lokal saat ini. Setelah huruf drive berubah, ambil ulang `/api/status`.
- Deteksi file yang ada tidak membuktikan flashdisk tidak dapat dikloning.
