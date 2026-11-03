import 'dotenv/config';
import app from './app.js';
import { disconnectDatabase } from './config/db.js';

const PORT = Number(process.env.PORT || 3001);
const server = app.listen(PORT, () => {
  console.log(`KryptoInfo API berjalan di http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} diterima. Menutup server...`);
  server.close(async () => {
    try {
      await disconnectDatabase();
      process.exit(0);
    } catch (error) {
      console.error('Gagal menutup koneksi database:', error.message);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default server;
