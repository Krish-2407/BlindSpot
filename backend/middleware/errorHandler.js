function errorHandler(err, req, res, next) {
  console.error(`[${req.method} ${req.path}] Error:`, err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.clientMessage || 'Internal server error'
  });
}
module.exports = errorHandler;
