# Development Setup — KryptoInfo

> Panduan untuk menyiapkan lingkungan pengembangan KryptoInfo.

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

### 4. Setup Database & Prisma ORM
- Database `kryptoinfo` dikelola melalui **phpMyAdmin** (`http://localhost/phpmyadmin/`).
- Database `kryptoinfo` telah dibuat di phpMyAdmin pada port `3306` (host: `127.0.0.1`).
- Menggunakan akun bawaan XAMPP: username `root`, password kosong (tanpa membuat user baru atau perintah GRANT).
- Menggunakan **Prisma ORM v7** (kompatibel penuh & stabil untuk MariaDB XAMPP) dengan provider `mysql`.
- Skema didefinisikan secara deklaratif di `backend/prisma/schema.prisma`.
- Menjalankan sinkronisasi skema tanpa menghapus atau mereset database yang ada.

### 5. Verifikasi
- Backend: `http://localhost:3001/api/health`
- Frontend: `http://localhost:5173`
- Database: `http://localhost/phpmyadmin/` (Database: `kryptoinfo`)

---

## Environment Variables

File `.env` disimpan secara lokal di `backend/.env` (dan telah tercantum di `.gitignore`). Konfigurasi database menggunakan akun `root` bawaan XAMPP tanpa password:

```env
# Database (XAMPP MariaDB port 3306 - host 127.0.0.1 - user root tanpa password)
DATABASE_URL="mysql://root:@127.0.0.1:3306/kryptoinfo"

# Server
PORT=3001
NODE_ENV=development

# Encryption & Security (backend only - jangan commit ke git)
# Generated 256-bit key untuk enkripsi AES-256-GCM
ENCRYPTION_KEY=
JWT_SECRET=
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
