const supabase = require('../config/supabaseClient');
const { dealer } = require('../models');
const bcrypt = require('bcryptjs');

/**
 * POST /api/dealer-login
 * Body: { dealer_phone, password }
 * Returns: { success, dealer_id, dealer_phone, dealer_name } or 401.
 */
async function dealerLogin(req, res) {
  try {
    const { dealer_phone, password } = req.body || {};
    const phone = (dealer_phone || '').trim();
    if (!phone || !password) {
      return res.status(400).json({ error: 'dealer_phone and password are required' });
    }

    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;

    const digitsOnly = phone.replace(/\D/g, '');
    const withPlus = phone.startsWith('+') ? phone : `+${phone}`;
    const withoutPlus = phone.replace(/^\+/, '');
    const variants = [phone, withPlus, withoutPlus, digitsOnly];
    if (digitsOnly.length === 12 && digitsOnly.startsWith('92')) {
      variants.push('0' + digitsOnly.slice(2));
    }
    if (digitsOnly.length === 10 && digitsOnly.startsWith('0')) {
      variants.push('92' + digitsOnly.slice(1));
    }

    let dealerRow = null;
    for (const p of [...new Set(variants)].filter(Boolean)) {
      const { data, error } = await supabase
        .from(dealerTable)
        .select([dealerCols.id, dealerCols.dealer_name, dealerCols.primary_phone, dealerCols.password_hash].join(','))
        .eq(dealerCols.primary_phone, p)
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (data) {
        dealerRow = data;
        break;
      }
    }

    if (!dealerRow) {
      return res.status(401).json({ error: 'Invalid dealer phone or password' });
    }

    const hash = dealerRow[dealerCols.password_hash];
    if (!hash) {
      return res.status(401).json({ error: 'Password not set for this dealer. Ask admin to set it in Admin → Dealers → Edit dealer.' });
    }

    const match = await bcrypt.compare(password, hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid dealer phone or password' });
    }

    return res.json({
      success: true,
      dealer_id: dealerRow[dealerCols.id],
      dealer_phone: dealerRow[dealerCols.primary_phone],
      dealer_name: dealerRow[dealerCols.dealer_name]
    });
  } catch (err) {
    console.error('dealerLogin error:', err);
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { dealerLogin };
