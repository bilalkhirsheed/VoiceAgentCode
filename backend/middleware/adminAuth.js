function requireAdmin(req, res, next) {
  // Simple placeholder – admin endpoints are currently guarded only by frontend login.
  // You can add header-based checks here later if you want backend-side protection.
  return next();
}

module.exports = {
  requireAdmin
};

