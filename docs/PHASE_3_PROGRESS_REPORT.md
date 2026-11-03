# PHASE 3 Progress Report: Autentikasi 3-Layer & USB Agent

**Tanggal**: 3 November 2026  
**Status**: In Progress  
**Branch**: `feature/frontend-setup` (commit `70ba68b`)

---

## 1. Ringkasan Status Kolaborasi

### A. Yang Sudah Selesai (Adhafa - Backend)
- ✅ Engine Kriptografi (Vigenere, AES-256-GCM, ChaCha20-Poly1305)
- ✅ Controller Vault, Steganografi, Blockchain
- ✅ Database Prisma & Skema (7 tabel)
- ✅ Endpoint Backend & Middleware `requireAuth`
- ✅ Unit test backend (4/4 passing)
- ✅ Dokumentasi spesifikasi autentikasi (`FRONTEND_AUTH_CONTRACT.md`)

### B. Yang Sedang Dikerjakan (Mirwan - Frontend)
- 🔄 **UI Autentikasi 3-Layer** (Baru Selesai - Commit `70ba68b`)
  - LoginPage dengan form Login & Enrollment
  - Integrasi Web Crypto API (Ed25519 di browser)
  - Mode Simulated Dongle (upload file JSON)
  - Session management & auth guard di App.jsx
  
- 🔄 **Activity Log UI** (Next - belum dikerjakan)
  - Tab untuk menampilkan `system_audits` dari database
  - Tabel riwayat aktivitas keamanan

### C. Yang Akan Dikerjakan (Adhafa - Phase 3 Backend)
- ⏳ **Service Daemon `usb-agent/`** (terpisah)
  - Deteksi USB physical dongle
  - Protocol challenge-response Ed25519 dengan dongle
  - Endpoint lokal `127.0.0.1:8787` untuk komunikasi daemon

---

## 2. Detail Implementasi Frontend Sekarang

### 2.1. Mode Simulated Dongle (Sesuai ARCHITECTURE.md Baris 89)

**File baru dibuat:**
- `frontend/src/components/LoginPage.jsx` (289 baris)
- `frontend/src/utils/cryptoHelper.js` (Web Crypto API helpers)

**Update file existing:**
- `frontend/src/App.jsx` (session management + auth guard)
- `frontend/src/services/api.js` (endpoint auth: challenge, login, enroll, logout)

**Alur Autentikasi Sekarang (Simulated):**

```
1. USER ENROLLMENT
   ├─ Input: username, password, enrollment_code (DEV-2024-KRYPTO)
   ├─ Generate: Ed25519 keypair di browser (Web Crypto API)
   ├─ Export: public key sebagai SPKI DER Base64
   ├─ Generate: face descriptor mock (128 float array)
   ├─ POST /api/auth/enroll → Backend simpan di database
   └─ Download: File kryptoinfo-dongle-[username].json (backup private key)

2. USER LOGIN
   ├─ Upload: File dongle JSON (private key)
   ├─ Input: username, password
   ├─ POST /api/auth/challenge → Backend generate nonce (random 32 bytes)
   ├─ Browser: Sign nonce dengan private key (Ed25519 signature via Web Crypto API)
   ├─ POST /api/auth/login → Kirim password + signature + face descriptor
   └─ Backend: Verifikasi 3 faktor → Set cookie session
```

**Validasi Backend:**
- Password: 12–128 char, lowercase + uppercase + digit + symbol, bukan sub(username)
- Public Key: Valid SPKI DER Base64 format (Ed25519)
- Face Descriptor: Array 128 float ✓ atau null (diterima sementara)
- Enrollment Code: Header `X-Enrollment-Code` cocok dengan `ENROLLMENT_CODE` env

**Status Mode Ini:**
✅ Sudah terimplementasi dan ter-push (commit `70ba68b`)  
✅ Testing bisa dilakukan tanpa flashdisk  
✅ Protokol kriptografi sama dengan normal (hanya private key bersumber dari file, bukan dongle)

---

## 3. Protokol Normal (Daemon `usb-agent/`) - Untuk Adhafa

### 3.1. Spesifikasi Daemon

**Lokasi Folder:** `usb-agent/` (terpisah dari backend)  
**Port Default:** `127.0.0.1:8787`  
**Bahasa:** Bebas pilih (Node.js, Python, Rust, dll.)

**Prinsip Operasi:**
1. Scan USB drive yang tertancap → cari file marker `.kryptoinfo/dongle.sig` atau metadata serial
2. Baca public key/identifier dari dongle
3. Sediakan REST endpoint:
   - `POST /api/sign-challenge` → accept `{ challengeText: string }` → return `{ signature: string }`
   - `GET /api/status` → return `{ detected: boolean, serialHash: string }`

**Keamanan:**
- Private key TIDAK PERNAH keluar dari dongle (hanya signature yang dikirim)
- Mode read-only pada USB (tidak format, tidak delete, tidak overwrite)
- Sandbox scope ke folder `.kryptoinfo/` saja

### 3.2. Integrasi dengan Frontend

**Saat daemon sudah jadi:**
- Frontend akan detect daemon via `fetch('http://127.0.0.1:8787/api/status')`
- Bila dongle terdeteksi, otomatis kirim nonce ke daemon untuk di-sign (tanpa user upload file)
- Signature dikirim ke backend sama seperti sekarang

**Update yang diperlukan di frontend:**
```javascript
// cryptoHelper.js tambahan:
export async function signChallengeViaDaemon(challengeText) {
  const res = await fetch('http://127.0.0.1:8787/api/sign-challenge', {
    method: 'POST',
    body: JSON.stringify({ challengeText })
  });
  const data = await res.json();
  return data.signature; // Base64 URL-encoded
}

// LoginPage.jsx: ganti signChallenge() dengan fungsi di atas
```

### 3.3. Simulasi Testing Tanpa Hardware

Dokumentasi sudah menyatakan bahwa mode Simulated Dongle valid untuk testing awal. Jadi:
- **Testing Phase 3 Backend** bisa pakai mode Simulated (file upload) terlebih dahulu
- **Integrasi Daemon** dikerjakan ketika usb-agent sudah siap
- **Transisi** hanya perubahan sumber signature, logika autentikasi tetap sama

---

## 4. Pekerjaan Mirwan Selanjutnya

### 4.1. Activity Log / Security Monitoring UI (Belum Dikerjakan)

**Deskripsi:**
- Tab baru: "Activity Log"
- Tampilkan data dari tabel `system_audits` backend
- Fitur: filter by user/action/date, search, pagination

**Endpoint Backend yang digunakan:**
- `GET /api/system/audits` (kemungkinan, perlu confirm dengan Adhafa)

**UI Komponen:**
- Tabel dengan kolom: timestamp, username, action, status, ipAddress, details
- Filter/search box
- Pagination (10-50 item per halaman)

### 4.2. Estimasi

- LoginPage & Auth Integration: ✅ Selesai (commit `70ba68b`)
- Activity Log UI: ⏳ 1-2 jam koding + testing

---

## 5. Checklist Kolaborasi

### Backend (Adhafa)

- [x] Engine kriptografi & crypto controller
- [x] Vault, stego, blockchain controller
- [x] Database schema & Prisma migration
- [x] Endpoint auth (challenge, login, enroll, logout)
- [x] Dokumentasi FRONTEND_AUTH_CONTRACT.md
- [x] Unit test
- [ ] **Daemon `usb-agent/`** ← NEXT PRIORITY
  - [ ] Scaffold folder & project setup
  - [ ] Scan USB drive logic
  - [ ] Challenge-response endpoint
  - [ ] Ed25519 signing (dari dongle atau simulated)
  - [ ] Testing & documentation
- [ ] **Endpoint `GET /api/system/audits`** (untuk Activity Log frontend)

### Frontend (Mirwan)

- [x] Setup Vite + Tailwind + React
- [x] API service layer (`services/api.js`)
- [x] Tab komponen (Message, Vault, Stego, Blockchain)
- [x] **LoginPage & Auth UI dengan simulated dongle** ← SELESAI (commit `70ba68b`)
- [x] Session management & auth guard
- [ ] **Activity Log tab** ← NEXT (1-2 jam)
- [ ] **Integrasi daemon `usb-agent`** (setelah Adhafa selesai)

---

## 6. Git Commits

| Commit | Author | Deskripsi |
|--------|--------|-----------|
| `1828017` | Mirwan | fix: rename PostCSS config to .cjs for ESM compatibility |
| `(UI PHASE 2)` | Mirwan | feat: add PHASE 2 UI components (Message, Vault, Stego, Blockchain) |
| `70ba68b` | Mirwan | feat: add 3-layer authentication UI (login/enrollment with Ed25519 USB key & face descriptor) |

---

## 7. Testing & Validasi

### Frontend Auth Testing (Sekarang)

1. **Buka** `http://localhost:5174` → harus tampil LoginPage
2. **Daftar Baru**:
   - Username: `testuser`
   - Password: `Test@Krypto2024!` (penuhi validasi 12+ char, upper, lower, digit, symbol)
   - Enrollment Code: `DEV-2024-KRYPTO`
   - Klik daftar → otomatis download `kryptoinfo-dongle-testuser.json`
3. **Login**:
   - Upload file dongle tadi
   - Username: `testuser`
   - Password: `Test@Krypto2024!`
   - Klik login → harus sukses, redirect ke dashboard dengan tab Message/Vault/Stego/Blockchain
4. **Verifikasi**: Klik Logout → kembali ke LoginPage

### Backend Auth Testing (Perlu Adhafa)

- POST `/api/auth/enroll` dengan signature Ed25519 invalid → harus tolak
- POST `/api/auth/login` dengan nonce berbeda dari yang diminta → harus tolak
- POST `/api/auth/login` setelah logout → cookie session hilang → akses /crypto harus 401

---

## 8. Catatan & Links

- **Branch aktif**: `feature/frontend-setup`
- **Dokumentasi arsitektur**: `docs/ARCHITECTURE.md` (baris 80-89 untuk USB Agent)
- **Kontrak frontend-backend**: `backend/FRONTEND_AUTH_CONTRACT.md`
- **Database schema**: `backend/prisma/schema.prisma`
- **Port aktif**: Backend 3001, Frontend 5174, DB 3306

---

## 9. Q&A Untuk Adhafa & Mirwan

**Q: Kenapa simulated dongle lebih dulu, bukan langsung protocol normal dengan daemon?**  
A: Karena browser tidak bisa baca USB drive langsung (sandbox). Daemon usb-agent harus dibuat terpisah (tugas backend). Simulasi valid untuk testing sesuai dokumentasi ARCHITECTURE.md baris 89.

**Q: Private key file `.json` itu aman?**  
A: Untuk testing iya. Real production harus simpan private key di trusted enclave atau hardware security module (out of scope semester ini).

**Q: Kapan daemon `usb-agent/` dimulai?**  
A: Setelah frontend sekarang sudah stabil (Activity Log UI selesai). Priority Adhafa sekarang.

---

**Updated By**: Mirwan Qolyubi  
**Last Modified**: 2026-11-03T05:10 UTC+7
