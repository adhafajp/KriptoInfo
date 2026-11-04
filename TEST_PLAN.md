# KriptoInfo - Test Plan & Status

## Status Kode (Per 4 Nov 2026)

### ✅ Backend (Complete)
- [x] Auth controller (3-layer: password + USB Ed25519 + face)
- [x] Crypto controller (Vigenere → AES-256-GCM → ChaCha20)
- [x] Vault controller (CRUD encrypted items)
- [x] Stego controller (embed/extract PNG dengan AES)
- [x] Blockchain controller (immutable ledger dengan SHA-256)
- [x] Audit controller (activity log)
- [x] Prisma schema + MariaDB integration
- [x] Multer file upload middleware
- [x] Rate limiting + Helmet security

### ✅ Frontend (Complete)
- [x] LoginPage.jsx - 3-layer auth UI dengan face-api.js
- [x] MessageTab.jsx - Encrypt/decrypt text dengan Vigenere key
- [x] VaultTab.jsx - Store encrypted items, dekripsi on-demand
- [x] StegoTab.jsx - Embed/extract message dalam PNG
- [x] BlockchainTab.jsx - Add block + verify chain integrity
- [x] API service layer (cryptoApi, vaultApi, stegoApi, blockchainApi, authApi)
- [x] Face detection models (face-api.js, 6.8 MB)
- [x] Tailwind dark theme + responsive layout

### 🐛 Bug Fixes (Selesai)
- [x] **Stego field mismatch** - Backend expect `req.body.text`, frontend kirim `message` → Fixed: backend terima kedua field

---

## Test Checklist

### Pre-requisites
- [ ] XAMPP running, MariaDB port 3306
- [ ] Database `kryptoinfo` exists
- [ ] Backend dependencies installed (`npm install`)
- [ ] Frontend dependencies installed (`npm install --cache "D:/Temp/npm-cache"`)
- [ ] Prisma migration up-to-date (`npm run prisma:push` di backend)

### Phase 1: Backend Startup
```bash
cd backend
npm run dev
# Expected: Server listening on port 3001
```

### Phase 2: Frontend Startup
```bash
cd frontend
npm run dev
# Expected: Vite dev server on http://localhost:5174
```

---

## Manual Test Cases

### 1. Authentication (LoginPage)

#### 1.1 Enrollment (First Time)
- [ ] Klik "Daftar Akun Baru"
- [ ] Input enrollment code: `kryptoinfo-phase1-2026`
- [ ] Input username + password
- [ ] Colok USB dongle → Generate Ed25519 keypair → Sign challenge
- [ ] Capture face (webcam) → Extract 128-float descriptor
- [ ] Submit → User terdaftar di DB
- [ ] **Expected**: Redirect ke main app setelah login

#### 1.2 Login (Returning User)
- [ ] Input username
- [ ] Input password (Layer 1 ✓)
- [ ] Colok USB dongle → Sign challenge dengan private key (Layer 2 ✓)
- [ ] Capture face → Match descriptor dengan tolerance 0.60 (Layer 3 ✓)
- [ ] **Expected**: Login success, session cookie set, tampil main app

#### 1.3 Login Failure Scenarios
- [ ] Wrong password → Error message
- [ ] USB dongle tidak colok → Error "USB not found"
- [ ] Face tidak cocok (threshold > 0.60) → Error "Face mismatch"

---

### 2. Message Encryption (MessageTab)

#### 2.1 Encrypt
- [ ] Tab "Pesan Rahasia" → "Enkripsi"
- [ ] Input teks: `Ini pesan rahasia untuk tugas kriptografi`
- [ ] Kunci Vigenere: `RAHASIATOP`
- [ ] Klik "Enkripsi Pesan"
- [ ] **Expected**: JSON payload muncul dengan field `algorithm`, `payload` (base64 ciphertext + IV + tag + salt)

#### 2.2 Decrypt
- [ ] Mode "Dekripsi"
- [ ] Paste JSON payload dari hasil enkripsi
- [ ] Kunci Vigenere: `RAHASIATOP` (sama)
- [ ] Klik "Dekripsi Pesan"
- [ ] **Expected**: Teks asli muncul kembali

#### 2.3 Wrong Key
- [ ] Decrypt dengan kunci salah: `SALAHKEY`
- [ ] **Expected**: Error "Dekripsi gagal" atau "Authentication tag mismatch"

---

### 3. Vault Storage (VaultTab)

#### 3.1 Create Item
- [ ] Klik "+ Tambah Item"
- [ ] Judul: `Password Email Penting`
- [ ] Kategori: `CREDENTIAL`
- [ ] Konten Rahasia: `user@example.com | P@ssw0rd123`
- [ ] Kunci Vigenere: `VAULTKEY`
- [ ] Klik "Enkripsi & Simpan ke Vault"
- [ ] **Expected**: Item muncul di daftar, data terenkripsi di DB

#### 3.2 View & Decrypt
- [ ] Klik item dari daftar
- [ ] Detail muncul di panel kanan (payload terenkripsi)
- [ ] Input kunci: `VAULTKEY`
- [ ] Klik "Buka"
- [ ] **Expected**: Konten asli muncul dalam kotak hijau

#### 3.3 Delete
- [ ] Klik "Hapus" pada item
- [ ] Confirm dialog → OK
- [ ] **Expected**: Item hilang dari daftar dan DB

---

### 4. Steganography (StegoTab)

#### 4.1 Embed Message
- [ ] Mode "Sisipkan Pesan"
- [ ] Upload file PNG (contoh: `test-image.png`)
- [ ] Pesan Rahasia: `Data tersembunyi dalam gambar PNG`
- [ ] Klik "Sisipkan Pesan ke Gambar"
- [ ] **Expected**: Button "Download Gambar Stego" muncul
- [ ] Download → File PNG baru (visual identik dengan asli)

#### 4.2 Extract Message
- [ ] Mode "Ekstrak Pesan"
- [ ] Upload file stego PNG (hasil embed tadi)
- [ ] Klik "Ekstrak Pesan dari Gambar"
- [ ] **Expected**: Pesan asli muncul: `Data tersembunyi dalam gambar PNG`

#### 4.3 Empty Image
- [ ] Upload PNG tanpa embedded message (gambar normal)
- [ ] Klik "Ekstrak"
- [ ] **Expected**: "(tidak ada pesan tersembunyi)" atau error graceful

---

### 5. Blockchain (BlockchainTab)

#### 5.1 Add Genesis Block
- [ ] Input data: `Genesis block - KriptoInfo ledger started`
- [ ] Klik "Tambah ke Rantai"
- [ ] **Expected**: Blok #0 muncul dengan `previousHash: "0"`

#### 5.2 Add Multiple Blocks
- [ ] Tambah blok kedua: `Transaction #1: User A -> User B (100 KRP)`
- [ ] Tambah blok ketiga: `Transaction #2: User B -> User C (50 KRP)`
- [ ] **Expected**: Chain bertambah, setiap blok hash-nya jadi previousHash blok berikutnya

#### 5.3 Verify Integrity
- [ ] Klik "Verifikasi Integritas Rantai"
- [ ] **Expected**: "✓ Rantai Valid" (hijau) dengan total blok

#### 5.4 Tamper Detection (Manual)
- [ ] Via Prisma Studio: Edit `data` field di blok tengah
- [ ] Klik "Verifikasi Integritas Rantai"
- [ ] **Expected**: "✗ Rantai Tidak Valid / Dirusak" (merah)

---

### 6. Session & Logout

#### 6.1 Session Persistence
- [ ] Login → Refresh halaman
- [ ] **Expected**: Tetap logged in (cookie valid)

#### 6.2 Logout
- [ ] Klik "Logout" (top-right)
- [ ] **Expected**: Redirect ke LoginPage, cookie dihapus

#### 6.3 Session Expiry
- [ ] Login → Tunggu 8 jam (SESSION_TTL_HOURS)
- [ ] **Expected**: Session expired, harus login lagi

---

## Performance & Security Tests

### 7.1 Rate Limiting
- [ ] Hit endpoint `/api/auth/login` 20x dalam 5 detik
- [ ] **Expected**: HTTP 429 "Too Many Requests" setelah threshold

### 7.2 File Upload Limits
- [ ] Upload PNG > 10 MB ke stego endpoint
- [ ] **Expected**: Multer reject dengan error

### 7.3 XSS & Injection
- [ ] Input `<script>alert('XSS')</script>` di message field
- [ ] **Expected**: Escaped/sanitized, tidak execute

---

## Integration Test Summary

| Feature | Status | Notes |
|---------|--------|-------|
| 3-Layer Auth | ⏳ Pending | Needs USB dongle + webcam |
| Message Encrypt/Decrypt | ⏳ Pending | - |
| Vault CRUD | ⏳ Pending | - |
| Steganography | ⏳ Pending | Needs test PNG |
| Blockchain | ⏳ Pending | - |
| Session Management | ⏳ Pending | - |
| Rate Limiting | ⏳ Pending | - |

**Legend**:
- ✅ Passed
- ❌ Failed
- ⏳ Pending Test
- 🐛 Bug Found

---

## Known Limitations

1. **Face Auth**: Threshold 0.60 bisa false positive dengan lighting berbeda → Perlu tuning
2. **USB Dongle**: Ed25519 keypair tersimpan di USB `/crypto/` folder → Jika hilang, user locked out
3. **Steganography**: Hanya PNG support, kapasitas terbatas (tergantung ukuran gambar)
4. **Blockchain**: Simplified proof-of-work (no mining, instant block), cukup untuk academic demo

---

## Next Steps

1. [ ] Run full manual test suite di atas
2. [ ] Update status table dengan hasil aktual
3. [ ] Screenshot setiap fitur untuk dokumentasi
4. [ ] Fix bug jika ditemukan
5. [ ] Update README.md dengan test results
6. [ ] Siap presentasi/demo
