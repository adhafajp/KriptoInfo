---
name: react18-frontend
description: >
  Prosedur pengembangan frontend menggunakan React 18.3.1 untuk proyek KryptoVault.
  Mencakup component architecture, state management, responsive UI, accessibility,
  dan frontend testing.
---

# React 18 Frontend Development

Skill ini digunakan saat membangun atau memodifikasi komponen frontend KryptoVault. React versi **18.3.1** adalah versi wajib yang digunakan.

---

## 1. Pengembangan React 18

### Aturan Umum
- Gunakan **React 18.3.1** — jangan upgrade atau downgrade tanpa persetujuan.
- Gunakan **functional components** dan **hooks** (jangan class components).
- Gunakan **Vite** sebagai build tool (bukan CRA/Create React App yang deprecated).
- Semua dependencies harus kompatibel dengan React 18.

### Prosedur Setup
1. Inisialisasi project frontend dengan Vite + React template.
2. Lock versi React di `package.json`:
   ```json
   "react": "18.3.1",
   "react-dom": "18.3.1"
   ```
3. Konfigurasi path alias di `vite.config.js` untuk impor yang bersih.
4. Setup ESLint dan Prettier untuk konsistensi kode.

### Hooks yang Direkomendasikan
- `useState` untuk state lokal sederhana.
- `useEffect` untuk side effects (fetch data, subscriptions).
- `useContext` untuk state global ringan.
- `useReducer` untuk state kompleks.
- `useMemo` dan `useCallback` untuk optimasi rendering (gunakan secukupnya).

---

## 2. Component Architecture

### Struktur Folder
```
frontend/src/
├── components/       # Komponen reusable (Button, Input, Modal, dll)
│   ├── common/       # Komponen umum
│   └── crypto/       # Komponen terkait kriptografi (tampilan saja, tanpa logika crypto)
├── pages/            # Halaman utama (Dashboard, Encrypt, Decrypt, dll)
├── hooks/            # Custom hooks
├── services/         # API calls dan integrasi backend
├── context/          # React Context providers
├── utils/            # Utility functions (format, validasi frontend)
├── assets/           # Gambar, ikon, font
└── styles/           # CSS/SCSS global dan variabel
```

### Aturan Komponen
- Satu komponen per file.
- Nama file dan komponen menggunakan **PascalCase**.
- Pisahkan komponen **presentational** (tampilan) dan **container** (logika).
- Jangan menempatkan logika kriptografi di komponen frontend.
- Props harus didefinisikan dengan jelas (gunakan PropTypes atau JSDoc).

### Prosedur Pembuatan Komponen
1. Buat file komponen di folder yang sesuai.
2. Definisikan props yang diperlukan.
3. Implementasikan komponen sebagai functional component.
4. Tambahkan styling (CSS Module atau styled-components).
5. Export komponen sebagai default export.
6. Buat test file untuk komponen tersebut.

---

## 3. State Management

### Strategi
- **State lokal** (`useState`): untuk data yang hanya relevan di satu komponen.
- **Context API** (`useContext`): untuk state global seperti user session, theme.
- **Jangan gunakan Redux** kecuali kompleksitas state benar-benar memerlukannya.

### Prosedur
1. Evaluasi cakupan state: lokal, shared antar komponen, atau global.
2. Untuk state lokal, gunakan `useState` atau `useReducer`.
3. Untuk state global, buat Context + Provider di folder `context/`.
4. Jangan menyimpan data sensitif (key, token enkripsi) di React state.
5. Gunakan `sessionStorage` secukupnya untuk persistence ringan (bukan data sensitif).

---

## 4. Responsive UI

### Aturan
- Desain **mobile-first**: mulai dari tampilan mobile, lalu perluas ke desktop.
- Gunakan **CSS Flexbox** dan **CSS Grid** untuk layout (jangan `float`).
- Breakpoints standar:
  - Mobile: `< 768px`
  - Tablet: `768px – 1024px`
  - Desktop: `> 1024px`

### Prosedur
1. Gunakan CSS custom properties (variabel) untuk breakpoints.
2. Uji tampilan di minimal 3 ukuran layar (mobile, tablet, desktop).
3. Pastikan semua elemen interaktif mudah di-tap pada layar sentuh (min 44x44px).
4. Gunakan unit relatif (`rem`, `em`, `%`, `vw/vh`) daripada `px` untuk ukuran font dan spacing.

---

## 5. Accessibility (a11y)

### Aturan
- Semua elemen interaktif harus dapat diakses via **keyboard** (Tab, Enter, Escape).
- Gunakan tag HTML semantik (`<button>`, `<nav>`, `<main>`, `<form>`, bukan `<div>` untuk semuanya).
- Tambahkan **aria-label** pada elemen yang tidak memiliki teks yang terlihat.
- Pastikan kontras warna memenuhi **WCAG 2.1 AA** (rasio minimal 4.5:1 untuk teks).

### Prosedur
1. Gunakan tag HTML semantik yang sesuai.
2. Tambahkan `aria-label`, `aria-describedby`, atau `aria-live` sesuai kebutuhan.
3. Uji navigasi keyboard: semua fitur harus bisa dioperasikan tanpa mouse.
4. Gunakan tools seperti Lighthouse atau axe untuk audit accessibility.
5. Pastikan focus indicator terlihat pada semua elemen interaktif.

---

## 6. Frontend Testing

### Jenis Test
- **Unit test**: Test komponen individual secara terisolasi.
- **Integration test**: Test interaksi antar komponen.
- **Snapshot test**: Deteksi perubahan UI yang tidak diinginkan.

### Tools yang Direkomendasikan
- **Vitest** (kompatibel dengan Vite) atau **Jest** untuk unit test.
- **React Testing Library** untuk testing komponen.
- **MSW (Mock Service Worker)** untuk mocking API calls.

### Prosedur
1. Buat file test dengan nama `[NamaKomponen].test.jsx` di samping file komponen.
2. Test rendering dasar: apakah komponen ter-render tanpa error.
3. Test interaksi: klik tombol, input teks, submit form.
4. Test state changes: pastikan UI berubah sesuai state.
5. Test edge cases: input kosong, loading state, error state.
6. Jalankan `npm test` sebelum setiap commit.
