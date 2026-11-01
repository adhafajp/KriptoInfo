# Development Setup — KryptoVault

> Panduan untuk menyiapkan lingkungan pengembangan KryptoVault.

---

## Prasyarat

Sebelum memulai pengembangan, pastikan tools berikut sudah terinstal:

| Tool | Versi Minimum | Keterangan |
|------|---------------|------------|
| Node.js | v18+ (diuji pada v24.15.0) | Runtime JavaScript |
| npm | v8+ (diuji pada 10.9.0) | Package manager |
| Git | v2.30+ (diuji pada 2.47.1) | Version control |
| MySQL | v8.0+ | Database relasional |

---

## Struktur Proyek (Rencana)

```
ProyekKripto/
├── frontend/           # React 18.3.1 (Vite)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── backend/            # Node.js + Express
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── crypto/     # Modul kriptografi
│   ├── tests/
│   ├── package.json
│   └── .env.example
├── usb-agent/          # Agen USB (terpisah)
├── docs/               # Dokumentasi
├── .agents/            # Agent skills
│   └── skills/
├── AGENTS.md           # Project rules
└── README.md
```

---

## Langkah Setup

### 1. Clone Repository
```bash
git clone <url-repository>
cd ProyekKripto
```

### 2. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env — isi konfigurasi database dan encryption key
npm run dev
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### 4. Setup Database
```sql
CREATE DATABASE kryptovault;
-- Jalankan migration script (akan dibuat saat implementasi)
```

### 5. Verifikasi
- Backend: `http://localhost:3001/api/health`
- Frontend: `http://localhost:5173`

---

## Environment Variables

File `.env` akan dibuat saat fase implementasi. Contoh isi:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=kryptovault

# Encryption (JANGAN commit file ini!)
ENCRYPTION_KEY=<hex-encoded-256-bit-key>

# Server
PORT=3001
NODE_ENV=development
```

> [!CAUTION]
> File `.env` **TIDAK BOLEH** di-commit ke Git. Pastikan sudah tercantum di `.gitignore`.

---

## Konvensi Pengembangan

1. **Bahasa penjelasan**: Indonesia (sesuai aturan project).
2. **Branching**: `main` → `develop` → `feature/*` (direkomendasikan).
3. **Commit message**: Gunakan format Conventional Commits (`feat:`, `fix:`, `chore:`, dll).
4. **Testing**: Jalankan test sebelum setiap commit.
5. **Review**: Gunakan checklist dari skill `testing-code-review`.
