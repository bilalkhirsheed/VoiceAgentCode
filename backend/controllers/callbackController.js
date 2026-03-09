const supabase = require('../config/supabaseClient');
const { callBack } = require('../models');

// POST /api/callbacks
async function createCallback(req, res) {
  try {
    const cbTable = callBack.tableName;
    const cbCols = callBack.columns;

    const payload = {
      [cbCols.dealer_id]: req.body.dealer_id,
      [cbCols.customer_name]: req.body.customer_name || null,
      [cbCols.customer_phone]: req.body.customer_phone,
      [cbCols.reason]: req.body.reason || null,
      [cbCols.call_id]: req.body.call_id || null
    };

    const { data, error } = await supabase
      .from(cbTable)
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createCallback
};

