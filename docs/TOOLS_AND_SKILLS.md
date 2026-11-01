# Tools & Skills — KryptoInfo

> Dokumentasi konfigurasi tools dan agent skills yang tersedia di workspace ini.

---

## Agent Configuration

### Project Rules (`AGENTS.md`)

| Item | Status |
|------|--------|
| File | `AGENTS.md` di root workspace |
| Loaded | ✅ Ya — terdeteksi sebagai project rules oleh Antigravity |

Aturan mencakup:
- Technology constraints (React 18.3.1, Node.js/Express, MySQL)
- Arsitektur terpisah (frontend, backend, USB agent)
- Keamanan (key management, no hardcoded secrets)
- USB safety (tidak menyentuh USB tanpa persetujuan)
- Development workflow (test sebelum merge, penjelasan dalam Bahasa Indonesia)
- Dokumentasi wajib

---

## Agent Skills

Tiga skills project-specific telah dibuat di `.agents/skills/`:

### 1. `crypto-security-engineer`

| Item | Nilai |
|------|-------|
| Path | `.agents/skills/crypto-security-engineer/SKILL.md` |
| Status | ✅ Tersedia |

**Cakupan:**
- Implementasi algoritma kriptografi (AES-256-GCM)
- Pengelolaan encryption key (environment variable, key rotation)
- Nonce/IV generation dan penyimpanan
- Validasi authentication tag
- Pengujian enkripsi dan dekripsi
- Security review checklist

### 2. `react18-frontend`

| Item | Nilai |
|------|-------|
| Path | `.agents/skills/react18-frontend/SKILL.md` |
| Status | ✅ Tersedia |

**Cakupan:**
- Pengembangan React 18.3.1 dengan Vite
- Component architecture (folder structure, naming)
- State management (useState, useContext, useReducer)
- Responsive UI (mobile-first, breakpoints)
- Accessibility (keyboard navigation, ARIA, WCAG)
- Frontend testing (Vitest, React Testing Library)

### 3. `testing-code-review`

| Item | Nilai |
|------|-------|
| Path | `.agents/skills/testing-code-review/SKILL.md` |
| Status | ✅ Tersedia |

**Cakupan:**
- Unit testing (Jest/Vitest, mocking, coverage)
- Integration testing (test database, flow testing)
- API testing (Supertest, status codes, validation)
- Browser testing (Playwright/Cypress, cross-browser)
- Regression testing (bug reproduction, test suite)
- Code review checklist (fungsionalitas, keamanan, readability, testing)

---

## MCP Servers

### Context7

| Item | Nilai |
|------|-------|
| Konfigurasi | `C:\Users\adhaf\.gemini\config\mcp_config.json` |
| Server URL | `https://mcp.context7.com/mcp` |
| Status | ✅ Terkonfigurasi |

**Tools tersedia (lazy-loaded):**
- `resolve-library-id` — resolve nama library ke Context7 ID.
- `query-docs` — query dokumentasi library dari Context7.

**Penggunaan:**
- Gunakan Context7 untuk mencari dokumentasi terbaru dari library yang digunakan (React, Express, dll).
- Panggil `resolve-library-id` terlebih dahulu untuk mendapatkan ID library, lalu `query-docs` untuk mendapatkan dokumentasi.

### Gemini API Docs

| Item | Nilai |
|------|-------|
| Status | ✅ Tersedia (eager-loaded) |

**Tools tersedia:**
- `gemini_search_docs` — cari dokumentasi Gemini API.
- `gemini_get_doc` — ambil konten dokumentasi spesifik.

> [!NOTE]
> Gemini API Docs MCP tidak diperlukan untuk proyek KryptoInfo, tetapi tersedia jika dibutuhkan.

---

## Status Komponen Pendukung

| Item | Status | Catatan |
|------|--------|---------|
| File `.gitignore` | ✅ Tersedia | Mengabaikan `.env`, `node_modules`, `dist`, build & log files |
| File `backend/.env` | ✅ Tersedia | Terkonfigurasi dengan `DATABASE_URL` XAMPP MariaDB `127.0.0.1:3306` |
| Database `kryptoinfo` | ✅ Tersedia | Sudah dibuat di phpMyAdmin & terverifikasi |
| MySQL CLI di PATH | ⚠️ Belum di PATH | Opsional: binary tersedia di `E:\xampp\mysql\bin\mysql.exe` |
| Remote Git repository | ℹ️ Belum dikonfigurasi | Opsional: dapat ditambahkan (`git remote add origin <url>`) jika ingin push ke remote |
| File `README.md` | ℹ️ Rencana Phase 5 | Akan dibuat/diperbarui saat implementasi final |

---

## Rekomendasi Sebelum Memulai Implementasi (Phase 1)

1. **Review Skills & Aturan**: Pastikan ketiga SKILL.md dan `AGENTS.md` dipatuhi secara ketat.
2. **Koneksi Database**: XAMPP MariaDB port 3306 dan database `kryptoinfo` sudah terverifikasi aktif.
3. **Eksekusi Phase 1**: Siap memulai fondasi backend (Express + Prisma ORM v7) dan frontend (React 18.3.1 + Vite) setelah persetujuan pengguna.
