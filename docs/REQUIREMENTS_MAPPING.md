# KryptoVault — Requirements Mapping & Traceability Matrix

> Dokumen Pemetaan Kebutuhan dan Matriks Ketertelusuran (Traceability Matrix)  
> Versi: 1.0.0 | Status: Active Reference

---

## 1. Pemetaan Batasan Teknologi (Technology Constraints)

| ID Kebutuhan | Deskripsi Kebutuhan | Komponen Target | Implementasi & File Rujukan | Status |
|---|---|---|---|---|
| **REQ-TC-01** | Frontend wajib menggunakan **React 18.3.1** | `frontend/` | `package.json` mengunci `"react": "18.3.1"`, `"react-dom": "18.3.1"` | Direncanakan (Phase 1) |
| **REQ-TC-02** | Backend menggunakan **Node.js dan Express** | `backend/` | `backend/src/server.js`, `backend/package.json` | Direncanakan (Phase 1) |
| **REQ-TC-03** | Database menggunakan **MySQL** | `database/` | `backend/src/config/db.js` (`mysql2/promise` connection pool) | Direncanakan (Phase 1) |
| **REQ-TC-04** | USB Agent berjalan secara terpisah dari Web UI | `usb-agent/` | `usb-agent/src/index.js` (Loopback HTTP/WebSocket service) | Direncanakan (Phase 2) |
| **REQ-TC-05** | Larangan mengubah tech stack tanpa persetujuan | Seluruh Repo | Diawasi oleh `AGENTS.md` | Aktif |

---

## 2. Pemetaan Batasan Keamanan (Security Constraints)

| ID Kebutuhan | Deskripsi Kebutuhan | Implementasi & Kontrol | Verifikasi / Test |
|---|---|---|---|
| **REQ-SEC-01** | Kunci privat & enkripsi tidak boleh terekspos ke frontend | Kunci enkripsi AES & HMAC hanya berada di server memory / `.env` backend | Code Review & Frontend Snapshot Test |
| **REQ-SEC-02** | Tidak boleh menyimpan password dalam plaintext | Password di-hash menggunakan Argon2id atau bcrypt dengan salt unik | Unit test `auth.service.test.js` |
| **REQ-SEC-03** | Tidak boleh mengklaim otentikasi simulasi sebagai nyata | Otentikasi didukung token cryptographic asli; status dev/virtual ditandai eksplisit | Integration test challenge-response |
| **REQ-SEC-04** | Algoritma enkripsi menggunakan AES-256-GCM terotentikasi | `backend/src/crypto/aes.js` dengan IV 12 bytes & Auth Tag 16 bytes | Unit test `crypto.test.js` (uji tamper detection) |
| **REQ-SEC-05** | CSPRNG untuk semua nilai acak (IV, nonce, token) | Menggunakan `crypto.randomBytes()` bawaan Node.js | Unit test keunikan dan entropi IV |
| **REQ-SEC-06** | Keselamatan USB: Larangan format, partisi, atau hapus drive | USB Agent hanya membaca berkas kredensial spesifik (`.kryptovault/`) | USB Agent test & safe sandbox check |

---

## 3. Pemetaan Arsitektur & Modularitas (Architecture Constraints)

| ID Kebutuhan | Deskripsi | Standar Teknis |
|---|---|---|
| **REQ-ARC-01** | Pemisahan Frontend, Backend, dan USB Agent | 3 folder terisolasi: `frontend/`, `backend/`, `usb-agent/`. Tidak ada shared code yang melanggar batas eksekusi. |
| **REQ-ARC-02** | Pemisahan Logika Kriptografi dari Komponen UI | Komponen React hanya menangani render, form input, dan state UI; tidak ada logika cipher/decipher di komponen UI. |
| **REQ-ARC-03** | Validasi API di Sisi Server | Setiap request yang masuk divalidasi oleh validator middleware (contoh: Joi, Zod, atau express-validator) sebelum mencapai service. |
| **REQ-ARC-04** | Prepared Statements untuk Semua Query Database | Semua interaksi MySQL wajib menggunakan parameterized queries `pool.execute(sql, [params])`. |

---

## 4. Matriks Ketertelusuran Fitur (Feature Traceability Matrix)

```
[Kebutuhan Bisnis / Fungsional]
  ├── FN-01: Autentikasi Pengguna & Sesi Terenkripsi
  │     ├── Backend: /api/auth/register, /api/auth/login
  │     ├── Database: Tabel `users`
  │     └── Frontend: Login & Registration View
  │
  ├── FN-02: Otentikasi 2-Faktor Berbasis USB Dongle
  │     ├── Backend: /api/auth/usb-challenge, /api/auth/usb-verify
  │     ├── USB Agent: Deteksi drive, penandatanganan HMAC nonce
  │     ├── Database: Tabel `dongles`
  │     └── Frontend: Dongle Status Modal & 2FA Prompt
  │
  ├── FN-03: Manajemen Vault & Enkripsi Berkas (AES-256-GCM)
  │     ├── Backend: /api/vault/upload, /api/vault/files, /api/vault/:id/download
  │     ├── Crypto Engine: encryptBuffer(), decryptBuffer()
  │     ├── Storage: Direktori terisolasi `backend/storage/vault/`
  │     ├── Database: Tabel `vault_items`
  │     └── Frontend: Vault Dashboard, File List, Drag & Drop Upload
  │
  └── FN-04: Audit Log Forensik & Rekam Integritas
        ├── Backend: Middleware audit logger
        ├── Database: Tabel `audit_logs`
        └── Frontend: Audit Log Viewer
```

---

## 5. Rencana Pengujian & Standar Kelulusan (Verification Protocol)

| Modul | Target Coverage | Alat Pengujian | Kriteria Lulus |
|---|---|---|---|
| **Crypto Engine** | 100% path coverage | Jest / Node Test Runner | Plaintext recovery 100%, tamper detection berhasil (auth tag reject), IV unik per call |
| **API Endpoints** | > 85% coverage | Supertest | Status code tepat (200, 201, 400, 401, 403, 404), payload invalid tertolak |
| **Database Repository** | > 80% coverage | Integration Test DB | Data konsisten, rollback transaksi berfungsi, tidak ada leak connection pool |
| **Frontend UI** | > 80% component coverage | Vitest + React Testing Library | Komponen render bersih, error boundary berfungsi, keyboard navigation berjalan |
| **USB Agent** | > 85% coverage | Unit & Mock Hardware Tests | Challenge signing valid, deteksi non-destructive, graceful failure jika USB dicabut |
