// ==========================================
// KryptoInfo — Prisma v7 Configuration
// Database: MariaDB XAMPP (127.0.0.1:3306)
// ==========================================
// Prisma v7 requires adapter config here, not in schema.prisma

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

// Load .env manually since this file may be loaded before dotenv
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import mariadb from 'mariadb';

const pool = mariadb.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'kryptoinfo',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  connectionLimit: 10
});

export default defineConfig({
  schema: 'prisma/schema.prisma',

  migrations: {
    path: 'prisma/migrations',
  },

  datasource: {
    url: env('DATABASE_URL'),
  },
});