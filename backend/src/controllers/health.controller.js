// ==========================================
// KryptoInfo — Health Check Controller
// ==========================================

import { checkDatabaseConnection } from '../config/db.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export async function getHealth(req, res) {
  const dbStatus = await checkDatabaseConnection();

  const healthData = {
    app: 'KryptoInfo API',
    version: '1.0.0',
    phase: 'PHASE 1 — Foundation',
    environment: process.env.NODE_ENV || 'development',
    uptime: `${Math.floor(process.uptime())}s`,
    database: dbStatus
  };

  if (!dbStatus.connected) {
    return errorResponse(res, {
      message: 'Server berjalan, tetapi koneksi database gagal.',
      status: 503,
      code: 'DB_UNREACHABLE',
      errors: dbStatus.error
    });
  }

  return successResponse(res, {
    message: 'KryptoInfo API berjalan normal.',
    data: healthData,
    status: 200
  });
}
