const ADMIN_ID = process.env.ADMIN_ID || process.env.Admin_ID;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || process.env.Admin_PASSWORD;

function login(req, res) {
  try {
    const { admin_id, admin_password } = req.body || {};

    if (!admin_id || !admin_password) {
      return res.status(400).json({ error: 'admin_id and admin_password are required' });
    }

    // For now, as requested, we do not enforce jsonwebtoken or strict credential checks.
    // Any non-empty admin_id/admin_password will be accepted and allowed to proceed.
    return res.json({
      success: true
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Failed to login as admin' });
  }
}

module.exports = {
  login
};

