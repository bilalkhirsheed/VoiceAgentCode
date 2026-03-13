const supabase = require('../config/supabaseClient');
const { dealer, callAnalysis, serviceAppointment } = require('../models');

async function findDealerByPrimaryPhone(primaryPhone) {
  const dealerTable = dealer.tableName;
  const dealerCols = dealer.columns;
  const raw = (primaryPhone || '').trim();
  if (!raw) return null;

  const variants = [raw, raw.startsWith('+') ? raw : `+${raw}`, raw.replace(/^\+/, '')];
  let dealerRow = null;

  for (const phone of [...new Set(variants)]) {
    const { data, error } = await supabase
      .from(dealerTable)
      .select('*')
      .eq(dealerCols.primary_phone, phone)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      dealerRow = data;
      break;
    }
  }

  return dealerRow;
}

// GET /api/reports/dealer-summary?dealer_phone=...&days=30
async function getDealerSummaryReport(req, res) {
  try {
    const { dealer_phone, days = 30 } = req.query;
    if (!dealer_phone) {
      return res.status(400).json({ error: 'dealer_phone is required' });
    }

    const dealerRow = await findDealerByPrimaryPhone(dealer_phone);
    if (!dealerRow) {
      return res.status(404).json({ error: 'Dealer not found for this phone number' });
    }

    const dealerCols = dealer.columns;
    const dealerName = dealerRow[dealerCols.dealer_name];
    const normalizedDealerPhone = dealerRow[dealerCols.primary_phone];

    const caTable = callAnalysis.tableName;
    const caCols = callAnalysis.columns;
    const saTable = serviceAppointment.tableName;
    const saCols = serviceAppointment.columns;

    const daysInt = Number(days) || 30;
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysInt);
    const sinceIso = sinceDate.toISOString();

    const [analysisRes, apptRes] = await Promise.all([
      supabase
        .from(caTable)
        .select('*')
        .eq(caCols.dealer_name, dealerName)
        .gte(caCols.created_at, sinceIso),
      supabase
        .from(saTable)
        .select('*')
        .eq(saCols.dealer_phone, normalizedDealerPhone)
        .gte(saCols.created_at, sinceIso)
    ]);

    if (analysisRes.error) {
      throw new Error(analysisRes.error.message);
    }
    if (apptRes.error) {
      throw new Error(apptRes.error.message);
    }

    const analysisRows = analysisRes.data || [];
    const apptRows = apptRes.data || [];

    const totalCalls = analysisRows.length;
    const countByCategory = { sales: 0, service: 0, parts: 0, callback: 0, other: 0 };
    let userHangups = 0;

    for (const row of analysisRows) {
      const cat = (row[caCols.category] || 'other').toLowerCase();
      if (countByCategory[cat] === undefined) countByCategory[cat] = 0;
      countByCategory[cat] += 1;
      if (row[caCols.is_user_hangup]) userHangups += 1;
    }

    const serviceAppointmentsCount = apptRows.length;

    return res.json({
      dealer_name: dealerName,
      dealer_phone: normalizedDealerPhone,
      days: daysInt,
      totals: {
        calls: totalCalls,
        sales: countByCategory.sales || 0,
        service: countByCategory.service || 0,
        parts: countByCategory.parts || 0,
        callbacks: countByCategory.callback || 0,
        other: countByCategory.other || 0,
        user_hangups: userHangups,
        service_appointments: serviceAppointmentsCount
      }
    });
  } catch (err) {
    console.error('getDealerSummaryReport error:', err);
    return res.status(500).json({ error: 'Failed to load dealer report' });
  }
}

module.exports = {
  getDealerSummaryReport
};

