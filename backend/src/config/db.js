import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const databaseUrl = new URL(
  process.env.DATABASE_URL || 'mysql://root:@127.0.0.1:3306/kryptoinfo'
);

if (databaseUrl.protocol !== 'mysql:') {
  throw new Error('DATABASE_URL harus menggunakan protokol mysql:');
}

const databaseName = databaseUrl.pathname.replace(/^\//, '');
if (!databaseName) throw new Error('Nama database tidak ditemukan di DATABASE_URL.');

const adapter = new PrismaMariaDb({
  host: databaseUrl.hostname,
  port: Number(databaseUrl.port || 3306),
  user: decodeURIComponent(databaseUrl.username),
  password: decodeURIComponent(databaseUrl.password),
  database: databaseName,
  connectionLimit: 5
});

export const prisma = new PrismaClient({ adapter });

export async function checkDatabaseConnection() {
  try {
    await prisma.$connect();
    const rows = await prisma.$queryRaw`SELECT VERSION() AS version`;
    return {
      connected: true,
      database: databaseName,
      engine: 'MariaDB',
      version: String(rows[0]?.version || 'Unknown')
    };
  } catch (error) {
    return { connected: false, database: databaseName, error: error.message };
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
