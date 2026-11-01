// ==========================================
// KryptoInfo — Global Error Handler Middleware
// ==========================================

import { errorResponse } from '../utils/apiResponse.js';

export function notFoundHandler(req, res) {
  return errorResponse(res, {
    message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`,
    status: 404,
    code: 'ROUTE_NOT_FOUND'
  });
}

export function errorHandler(err, req, res, next) {
  console.error('[SERVER ERROR]', {
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  const statusCode = err.statusCode || err.status || 500;
  const message = err.isOperational ? err.message : 'Terjadi kesalahan internal pada server.';

  return errorResponse(res, {
    message,
    status: statusCode,
    code: err.code || 'INTERNAL_ERROR',
    errors: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
}
