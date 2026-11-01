// ==========================================
// KryptoInfo — Standard API Response Helpers
// ==========================================

export function successResponse(res, { data = null, message = 'Success', status = 200, meta = {} } = {}) {
  return res.status(status).json({
    success: true,
    message,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  });
}

export function errorResponse(res, { message = 'Internal Server Error', status = 500, errors = null, code = 'ERROR' } = {}) {
  return res.status(status).json({
    success: false,
    message,
    code,
    errors,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
}
