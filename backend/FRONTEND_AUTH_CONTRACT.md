# Kontrak Integrasi Frontend — KryptoInfo

> **Catatan kompatibilitas:** dokumen ini menjelaskan contoh alur browser untuk integrasi frontend di tahap berikutnya. File dongle yang dibuat oleh `npm run dongle -- enroll` saat ini menggunakan format private key terenkripsi (scrypt + AES-256-GCM), sehingga tidak cocok langsung dengan contoh `privateKeyPkcs8` plaintext di bawah. Jangan mengekspor private key plaintext hanya untuk menyamakan format. Saat frontend tersedia, integrasikan dengan helper lokal yang membaca flashdisk dan menandatangani challenge; private key tidak boleh dikirim ke API.
>
> Untuk mengembangkan dan menguji backend tanpa frontend sekarang, ikuti `BACKEND_ONLY_GUIDE.md` dan gunakan CLI.


Semua contoh memakai `http://localhost:3001` dan `fetch(..., { credentials: 'include' })`.

## 1. Enrollment satu kali

Frontend membuat pasangan kunci Ed25519 melalui Web Crypto API. `publicKey` dikirim ke backend sebagai SPKI DER Base64; private key disimpan sebagai PKCS8 Base64 dalam file JSON yang dipindahkan pengguna ke flashdisk.

```js
const toBase64 = buffer => btoa(String.fromCharCode(...new Uint8Array(buffer)));

const pair = await crypto.subtle.generateKey(
  { name: 'Ed25519' }, true, ['sign', 'verify']
);
const publicKey = toBase64(await crypto.subtle.exportKey('spki', pair.publicKey));
const privateKeyPkcs8 = toBase64(await crypto.subtle.exportKey('pkcs8', pair.privateKey));

// Unduh file ini, lalu pindahkan ke flashdisk.
const keyFile = new Blob(
  [JSON.stringify({ privateKeyPkcs8 }, null, 2)],
  { type: 'application/json' }
);
const link = document.createElement('a');
link.href = URL.createObjectURL(keyFile);
link.download = 'kryptoinfo-dongle.json';
link.click();
URL.revokeObjectURL(link.href);

// faceDescriptor berasal dari modul pengenalan wajah frontend (array 128 angka).
await fetch('http://localhost:3001/api/auth/enroll', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-Enrollment-Code': enrollmentCode
  },
  body: JSON.stringify({ username, password, publicKey, faceDescriptor })
});
```

## 2. Login tiga faktor

```js
const toBytes = base64 => Uint8Array.from(atob(base64), c => c.charCodeAt(0));
const toBase64Url = buffer => {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

// Langkah 1: minta challenge.
const challengeResponse = await fetch('http://localhost:3001/api/auth/challenge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username })
});
const { data } = await challengeResponse.json();

// Langkah 2: pengguna memilih kryptoinfo-dongle.json dari flashdisk.
const dongleData = JSON.parse(await selectedUsbFile.text());
const privateKey = await crypto.subtle.importKey(
  'pkcs8', toBytes(dongleData.privateKeyPkcs8),
  { name: 'Ed25519' }, false, ['sign']
);
const signature = toBase64Url(await crypto.subtle.sign(
  { name: 'Ed25519' }, privateKey, new TextEncoder().encode(data.challenge)
));

// Langkah 3: kirim password, signature dongle, dan descriptor wajah.
const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username, password,
    challengeId: data.challengeId,
    signature,
    faceDescriptor // array 128 angka dari kamera saat login
  })
});
```

Setelah login berhasil, backend mengirim cookie HttpOnly. Semua fetch ke API yang diproteksi harus menyertakan `credentials: 'include'`. Dashboard harus memanggil `GET /api/auth/me` saat dibuka; jika mendapat HTTP 401, arahkan pengguna kembali ke halaman login.

**Penting:** file private-key dapat disalin. Cara ini membuktikan bahwa pengguna memiliki file kunci yang terdaftar, bukan bahwa hardware USB anti-kloning sedang terpasang. Untuk security key fisik yang tidak dapat diekspor, gunakan FIDO2/WebAuthn; itu jalur berbeda dan integrasinya lebih rumit.
