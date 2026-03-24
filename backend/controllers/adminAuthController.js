const ADMIN_ID = (process.env.ADMIN_ID || process.env.Admin_ID || '').trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || process.env.Admin_PASSWORD || '').trim();

function login(req, res) {
  try {
    const { admin_id, admin_password } = req.body || {};
    const id = (admin_id != null ? String(admin_id) : '').trim();
    const pw = (admin_password != null ? String(admin_password) : '').trim();

    if (!id || !pw) {
      return res.status(400).json({ error: 'Admin ID and password are required' });
    }

    const idMatch = id === ADMIN_ID;
    const passwordMatch = pw === ADMIN_PASSWORD;

    if (!idMatch || !passwordMatch) {
      return res.status(401).json({ error: 'Invalid Admin ID or password' });
    }

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

