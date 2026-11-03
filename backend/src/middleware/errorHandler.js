export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    code: 'ROUTE_NOT_FOUND',
    message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(err, req, res, next) {
  console.error('[SERVER ERROR]', err.message);
  const status = err.statusCode || err.status || 500;
  return res.status(status).json({
    success: false,
    code: err.code || 'INTERNAL_ERROR',
    message: status >= 500 ? 'Terjadi kesalahan internal pada server.' : err.message
  });
}
