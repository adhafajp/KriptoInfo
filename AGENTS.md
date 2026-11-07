
# KryptoInfo - Project Rules

Three-layer secure digital vault (USB dongle + face recognition + password). React frontend, Express backend, MariaDB via Prisma, standalone USB Agent. Academic cryptography course project.

## Technology Constraints
- Always use React 18.3.1.
- Use Node.js and Express for the backend.
- Use MySQL-compatible MariaDB (XAMPP) with Prisma ORM as the database.
- Do not change the required technology stack without approval.
- Node >= 20.19.0. All three packages use ESM (`"type": "module"`).

## Repo layout
```
frontend/          Vite + React 18.3.1 (port 5173, proxies /api → backend)
backend/           Express API (port 3001), Prisma ORM
  prisma/          schema.prisma, migrations
  src/             app.js, server.js, controllers/, middleware/, routes/, crypto/
  storage/         encrypted files, stego images (gitignored)
  tests/           node:test smoke + stego tests
  tools/           dongle-cli.js
usb-agent/         Standalone Node HTTP server (port 8787), Ed25519 challenge signing
  src/             server.js, dongle.js, discovery.js
  test/            dongle.test.js
docs/              Project documentation
```

## Dev environment
Prerequisites: Node >= 20.19, XAMPP (MariaDB on 3306), database `kryptoinfo` created.

Backend setup:
```
cd backend
cp .env.example .env   # fill ENCRYPTION_KEY (64 hex chars) and ENROLLMENT_CODE
npm install
npx prisma generate
npx prisma migrate dev # or: npx prisma db push
npm run dev            # node --watch src/server.js → localhost:3001
```

Frontend setup:
```
cd frontend
npm install
npm run dev            # vite → localhost:5173
```

USB Agent setup:
```
cd usb-agent
cp .env.example .env
npm install
npm run dev            # node --watch src/server.js → localhost:8787
```

## Build & test commands
| What             | Where       | Command                          |
|------------------|-------------|----------------------------------|
| Frontend dev     | frontend/   | `npm run dev`                    |
| Frontend build   | frontend/   | `npm run build`                  |
| Frontend test    | frontend/   | `npm test` (vitest)              |
| Frontend lint    | frontend/   | `npm run lint` (eslint src)      |
| Backend dev      | backend/    | `npm run dev`                    |
| Backend test     | backend/    | `npm test` (node --test)         |
| Prisma generate  | backend/    | `npm run prisma:generate`        |
| Prisma migrate   | backend/    | `npm run prisma:migrate`         |
| Prisma studio    | backend/    | `npm run prisma:studio`          |
| Dongle CLI       | backend/    | `npm run dongle`                 |
| USB Agent dev    | usb-agent/  | `npm run dev`                    |
| USB Agent test   | usb-agent/  | `npm test` (node --test)         |

## Architecture
- Keep frontend, backend and USB Agent separated.
- Use modular and maintainable code.
- Do not mix cryptographic logic with UI components.
- Keep API validation on the server.
- Frontend components: LoginPage, MessageTab, VaultTab, StegoTab, BlockchainTab.
- Frontend crypto helpers in `src/utils/cryptoHelper.js`; face helpers in `src/utils/faceHelper.js`.
- Backend routes all under `/api` (see `backend/src/routes/index.js`).
- Prisma schema is the source of truth for DB models — never hand-edit migration SQL.

## Security
- Never expose private keys or encryption keys to the frontend.
- Never store plaintext passwords.
- Never commit .env files or private credentials.
- Never treat simulated authentication as real authentication.
- Never claim a cryptographic feature works without testing it.
- Use secure random values for cryptographic operations.

## USB Safety
- Never format, partition, erase or overwrite my USB drive.
- Do not modify files on the real USB without my explicit approval.
- Never expose dongle private keys in logs or browser code.
- Use a development key for initial testing.

## Development Workflow
- Inspect files before editing.
- Preserve working code.
- Test every completed feature.
- Report actual test results.
- Explain implementation in Indonesian.
- Ask before destructive commands or changes outside the project workspace.

## Pitfalls
- Backend requires `ENCRYPTION_KEY` (64 hex chars) in `.env` or crypto module fails at import.
- Vite proxies `/api` to `localhost:3001` — backend must be running for API calls.
- USB Agent binds `127.0.0.1:8787`; frontend calls it directly (not via backend proxy).
- `prisma migrate dev` resets data if schema drift is detected — check impact first.
- Backend and USB Agent tests use `node --test` (built-in runner), not Jest/Vitest.
- Frontend ESLint config is `.eslintrc.cjs` (CJS in ESM project) — `react/prop-types` is off.
- Three separate `node_modules` dirs — run `npm install` in each subdirectory independently.

## Documentation
- Keep README.md updated.
- Record architecture decisions.
- Record known limitations.
- Record completed phases and outstanding tasks.
