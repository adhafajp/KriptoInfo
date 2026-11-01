---
name: testing-code-review
description: >
  Prosedur testing dan code review untuk proyek KryptoInfo. Mencakup unit testing,
  integration testing, API testing, browser testing, regression testing, dan
  panduan code review.
---

# Testing & Code Review

Skill ini digunakan untuk memastikan kualitas kode KryptoInfo melalui pengujian menyeluruh dan proses code review yang terstruktur.

---

## 1. Unit Testing

### Aturan
- Setiap fungsi utilitas dan modul logika **harus** memiliki unit test.
- Test harus **terisolasi** — jangan bergantung pada database, API, atau file system.
- Gunakan **mocking** untuk dependency eksternal.
- Coverage target: minimal **80%** untuk modul kriptografi.

### Tools
- **Backend**: Jest atau Mocha + Chai.
- **Frontend**: Vitest atau Jest + React Testing Library.

### Prosedur
1. Buat file test dengan konvensi nama: `[namaFile].test.js` atau `[namaFile].spec.js`.
2. Organisasi test dalam blok `describe()` berdasarkan fungsi/modul.
3. Tulis test case untuk:
   - **Happy path**: Input normal, output yang diharapkan.
   - **Edge cases**: Input kosong, null, undefined, batas nilai.
   - **Error cases**: Input invalid, exception handling.
4. Gunakan `beforeEach` / `afterEach` untuk setup dan cleanup.
5. Jalankan test: `npm test` (atau `npx jest` / `npx vitest`).
6. Pastikan semua test pass sebelum commit.

### Contoh Struktur
```
backend/tests/
├── crypto/
│   ├── encrypt.test.js
│   └── decrypt.test.js
├── auth/
│   ├── login.test.js
│   └── register.test.js
└── utils/
    └── validation.test.js
```

---

## 2. Integration Testing

### Aturan
- Test interaksi antar modul (contoh: API endpoint → service → database).
- Gunakan **test database** terpisah (jangan gunakan database produksi/development).
- Bersihkan data test setelah setiap test suite selesai.

### Prosedur
1. Setup test environment dengan konfigurasi database terpisah.
2. Seed data test yang diperlukan di `beforeAll()`.
3. Test flow lengkap:
   - Registrasi user → login → dapatkan token.
   - Enkripsi file → simpan ke database → dekripsi → verifikasi isi.
4. Verifikasi side effects (data tersimpan di database, file ter-generate).
5. Cleanup di `afterAll()`: hapus data test.
6. Jalankan terpisah dari unit test: `npm run test:integration`.

---

## 3. API Testing

### Aturan
- Setiap API endpoint **harus** memiliki test.
- Test harus mencakup semua HTTP methods yang didukung (GET, POST, PUT, DELETE).
- Validasi response: status code, body structure, headers.

### Tools
- **Supertest** (untuk testing Express endpoints di Node.js).
- **Postman/Newman** (opsional, untuk koleksi test manual dan CI).

### Prosedur
1. Buat file test per router/controller: `[resource].api.test.js`.
2. Test untuk setiap endpoint:
   - **Status code**: 200, 201, 400, 401, 403, 404, 500.
   - **Response body**: Struktur JSON sesuai kontrak API.
   - **Validation**: Input invalid harus mengembalikan 400 dengan pesan error.
   - **Auth**: Endpoint yang dilindungi harus mengembalikan 401 tanpa token.
3. Test payload:
   - Body kosong.
   - Field wajib yang hilang.
   - Tipe data salah.
   - Payload berlebihan (field yang tidak dikenali).
4. Dokumentasikan kontrak API di test file sebagai referensi.

### Contoh Test API
```
backend/tests/api/
├── auth.api.test.js
├── files.api.test.js
├── crypto.api.test.js
└── users.api.test.js
```

---

## 4. Browser Testing

### Aturan
- Uji UI di minimal **3 browser**: Chrome, Firefox, Edge.
- Uji di minimal **2 resolusi**: mobile (375px) dan desktop (1920px).
- Pastikan semua interaksi pengguna berfungsi (klik, input, drag, scroll).

### Tools
- **Playwright** (direkomendasikan) atau **Cypress**.
- **Chrome DevTools** untuk debugging manual.

### Prosedur
1. Setup browser testing framework (Playwright/Cypress).
2. Buat test untuk setiap user flow utama:
   - Login → dashboard → enkripsi file → download hasil.
   - Registrasi → verifikasi → login.
3. Test responsiveness: resize viewport ke berbagai ukuran.
4. Test keyboard navigation dan focus management.
5. Ambil screenshot untuk visual regression (opsional).
6. Jalankan: `npm run test:e2e`.

---

## 5. Regression Testing

### Aturan
- Jalankan **semua** test suite (unit + integration + API) sebelum setiap release.
- Setiap bug yang ditemukan harus memiliki **test case baru** yang mereproduksi bug tersebut.
- Test case regresi tidak boleh dihapus setelah bug diperbaiki.

### Prosedur
1. Saat bug ditemukan:
   a. Buat test case yang mereproduksi bug (test harus **fail**).
   b. Perbaiki bug.
   c. Jalankan test case — harus **pass**.
   d. Jalankan seluruh test suite — pastikan tidak ada regresi.
2. Sebelum release:
   a. Jalankan `npm run test:all` (semua test suite).
   b. Review hasil test — semua harus pass.
   c. Dokumentasikan hasil test di release notes.
3. Simpan test case regresi di folder `tests/regression/`.

---

## 6. Code Review

### Aturan
- Setiap perubahan kode **harus** di-review sebelum di-merge.
- Reviewer harus memeriksa: fungsionalitas, keamanan, readability, dan testing.
- Jangan merge kode tanpa test yang memadai.

### Checklist Code Review

#### Fungsionalitas
- [ ] Kode menyelesaikan tugas sesuai requirement.
- [ ] Edge cases ditangani dengan baik.
- [ ] Error handling sudah ada dan informatif.
- [ ] Tidak ada dead code atau kode yang tidak digunakan.

#### Keamanan
- [ ] Tidak ada secret/key yang di-hardcode.
- [ ] Input dari user sudah divalidasi dan di-sanitize.
- [ ] Tidak ada SQL injection vulnerability.
- [ ] Tidak ada XSS vulnerability.
- [ ] Operasi kriptografi sesuai prosedur di skill `crypto-security-engineer`.

#### Readability
- [ ] Nama variabel dan fungsi deskriptif.
- [ ] Komentar menjelaskan **mengapa**, bukan **apa**.
- [ ] Struktur kode konsisten dengan codebase yang ada.
- [ ] Tidak ada duplikasi kode yang bisa di-refactor.

#### Testing
- [ ] Test baru ditambahkan untuk fitur/perubahan baru.
- [ ] Semua test pass.
- [ ] Coverage tidak menurun.

### Prosedur Review
1. Baca deskripsi PR dan pahami konteks perubahan.
2. Review kode baris per baris menggunakan checklist di atas.
3. Jalankan test secara lokal untuk memverifikasi.
4. Berikan komentar yang konstruktif dan spesifik.
5. Jika ada masalah keamanan, tandai sebagai **blocking**.
6. Approve hanya jika semua item checklist terpenuhi.
