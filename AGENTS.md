
# KryptoInfo - Project Rules

## Technology Constraints
- Always use React 18.3.1.
- Use Node.js and Express for the backend.
- Use MySQL-compatible MariaDB (XAMPP) with Prisma ORM as the database.
- Do not change the required technology stack without approval.

## Architecture
- Keep frontend, backend and USB Agent separated.
- Use modular and maintainable code.
- Do not mix cryptographic logic with UI components.
- Keep API validation on the server.

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

## Documentation
- Keep README.md updated.
- Record architecture decisions.
- Record known limitations.
- Record completed phases and outstanding tasks.
