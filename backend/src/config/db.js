// ==========================================
// KryptoInfo — Database Connection Configuration
// Engine: MariaDB (XAMPP 10.4.32)
// ORM: Prisma ORM v7 with @prisma/adapter-mariadb
// ==========================================

import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import mariadb from 'mariadb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectionUrl = process.env.DATABASE_URL || 'mysql://root:@127.0.0.1:3306/kryptoinfo';

// Create mariadb connection pool for the driver adapter
const pool = mariadb.createPool(connectionUrl);
const adapter = new PrismaMariaDb(pool);

export const prisma = new PrismaClient({ adapter });

/**
 * Ping and verify MariaDB connection status
 * @returns {Promise<{connected: boolean, database: string, version?: string, error?: string}>}
 */
export async function checkDatabaseConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT 1 as ping, VERSION() as version');
    return {
      connected: true,
      database: 'kryptoinfo',
      host: '127.0.0.1:3306',
      user: 'root',
      version: rows[0]?.version || '10.4.32-MariaDB',
      engine: 'MariaDB (XAMPP)'
    };
  } catch (error) {
    return {
      connected: false,
      database: 'kryptoinfo',
      host: '127.0.0.1:3306',
      user: 'root',
      error: error.message
    };
  } finally {
    if (conn) conn.release();
  }
}
