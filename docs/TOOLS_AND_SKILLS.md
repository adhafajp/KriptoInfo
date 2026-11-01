# Tools & Skills — KryptoVault

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
> Gemini API Docs MCP tidak diperlukan untuk proyek KryptoVault, tetapi tersedia jika dibutuhkan.

---

## Hal yang Belum Tersedia

| Item | Status | Tindakan |
|------|--------|----------|
| MySQL CLI di PATH | ❌ Belum tersedia | Install MySQL atau tambahkan ke PATH |
| File `.gitignore` | ❌ Belum dibuat | Akan dibuat saat setup backend/frontend |
| File `README.md` | ❌ Belum dibuat | Akan dibuat saat struktur proyek final |
| Remote Git repository | ❌ Belum dikonfigurasi | `git remote add origin <url>` |
| File `.env` | ❌ Belum dibuat | Akan dibuat saat implementasi backend |
| Database `kryptovault` | ❌ Belum dibuat | Buat setelah MySQL tersedia |

---

## Rekomendasi Sebelum Memulai Implementasi

1. **Install/konfigurasi MySQL** — pastikan MySQL CLI tersedia di PATH.
2. **Buat database** — `CREATE DATABASE kryptovault;`
3. **Setup remote repository** — untuk backup dan kolaborasi.
4. **Review skills** — baca ketiga SKILL.md sebelum memulai implementasi.
5. **Tunggu master prompt** — jangan mulai implementasi tanpa instruksi lengkap.
