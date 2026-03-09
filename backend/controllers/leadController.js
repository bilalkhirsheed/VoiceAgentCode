const supabase = require('../config/supabaseClient');
const { lead } = require('../models');

// POST /api/leads
async function createLead(req, res) {
  try {
    const leadTable = lead.tableName;
    const leadCols = lead.columns;

    const payload = {
      [leadCols.dealer_id]: req.body.dealer_id,
      [leadCols.department_id]: req.body.department_id || null,
      [leadCols.customer_name]: req.body.customer_name,
      [leadCols.customer_phone]: req.body.customer_phone,
      [leadCols.customer_email]: req.body.customer_email || null,
      [leadCols.intent]: req.body.intent || null,
      [leadCols.source]: req.body.source || 'inbound_call',
      [leadCols.notes]: req.body.notes || null,
      [leadCols.call_id]: req.body.call_id || null
    };

    const { data, error } = await supabase
      .from(leadTable)
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

// GET /api/leads
async function getLeads(req, res) {
  try {
    const leadTable = lead.tableName;
    const leadCols = lead.columns;

    let query = supabase.from(leadTable).select('*');

    if (req.query.dealer_id) {
      query = query.eq(leadCols.dealer_id, req.query.dealer_id);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  createLead,
  getLeads
};

