# KryptoInfo — Requirements Mapping & Traceability Matrix

> Versi: 1.1.0 | Status: Active Reference

## 1. Technology Constraints

| ID | Kebutuhan | Implementasi | Status |
|---|---|---|---|
| REQ-TC-01 | Frontend React 18.3.1 | `frontend/` | Phase 1 |
| REQ-TC-02 | Backend Node.js + Express | `backend/src/` | Phase 1 |
| REQ-TC-03 | MariaDB XAMPP + Prisma ORM v7 | `backend/prisma/` | Phase 1 |
| REQ-TC-04 | USB Agent terpisah dari frontend | `usb-agent/` | Phase 2 |
| REQ-TC-05 | Perubahan tech stack wajib disepakati | `AGENTS.md` | Active |

## 2. Security Requirements

| ID | Persyaratan | Kontrol Implementasi |
|---|---|---|
| REQ-SEC-01 | Kunci privat dan encryption key tidak boleh terekspos ke frontend | Backend-only, environment variables, dan key management |
| REQ-SEC-02 | Password tidak disimpan plaintext | Argon2id dengan salt unik |
| REQ-SEC-03 | USB menggunakan autentikasi kriptografis | Ed25519 challenge-response, nonce sekali pakai, dan masa berlaku |
| REQ-SEC-04 | Enkripsi harus terautentikasi | AES-256-GCM dan ChaCha20-Poly1305 |
| REQ-SEC-05 | Nilai acak harus aman secara kriptografis | Node.js `crypto.randomBytes()` |
| REQ-SEC-06 | USB tidak boleh dimodifikasi secara destruktif | Read-only access terhadap kredensial USB |
| REQ-SEC-07 | Akses data harus terotorisasi | Session validation dan ownership checks |
| REQ-SEC-08 | Data sensitif tidak boleh masuk audit log | Redaction dan audit logging terkontrol |

## 3. Architecture Requirements

| ID | Persyaratan | Standar |
|---|---|---|
| REQ-ARC-01 | Pemisahan frontend, backend, dan USB Agent | Modular architecture |
| REQ-ARC-02 | Logika kriptografi terpisah dari HTTP | Modul `crypto/` dan `services/` |
| REQ-ARC-03 | Validasi dilakukan di backend | Validation middleware |
| REQ-ARC-04 | Database menggunakan Prisma Client | Parameterized ORM queries |
| REQ-ARC-05 | Error dan respons API konsisten | Global error handler dan API response format |

## 4. Feature Traceability

| Fitur | Backend | Database |
|---|---|---|
| Authentication | `/api/auth/*` | `users`, `dongles`, `sessions` |
| Secure Message | `/api/messages/*` | `vault_meta` |
| Secure File | `/api/files/*` | `vault_meta` |
| Steganography | `/api/stego/*` | `vault_meta` |
| Blockchain | `/api/blockchain/*` | `blockchain_blocks` |
| Security Activity | `/api/audit/*` | `system_audits` |

*Nama endpoint dan tabel merupakan target implementasi yang harus diselaraskan dengan schema serta API aktual.*

## 5. Verification & Testing

| Modul | Pengujian Utama | Kriteria Lulus |
|---|---|---|
| Database | Prisma validation dan integration test | Koneksi, CRUD, dan relasi berjalan |
| Authentication | Unit dan integration test | Login valid berhasil, kredensial invalid ditolak |
| Cryptography | Node.js Test Runner | Round-trip berhasil, tampering terdeteksi |
| API | Supertest | Validasi, authorization, dan HTTP status tepat |
| USB Agent | Unit dan mock hardware test | Signature valid, replay ditolak, akses non-destruktif |
| Blockchain | Integrity test | Manipulasi blok terdeteksi |

---

**Catatan:** Dokumen ini menjadi acuan keterlacakan kebutuhan. Status implementasi hanya boleh diperbarui setelah fitur benar-benar selesai dan berhasil diuji.