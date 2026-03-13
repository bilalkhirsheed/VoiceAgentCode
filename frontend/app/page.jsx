module.exports = function RootRedirect() {
  // Keep root simple. Main CRM routes are under /(crm).
  // Next.js will render /(crm)/... pages directly (e.g. /calls).
  return null;
};

