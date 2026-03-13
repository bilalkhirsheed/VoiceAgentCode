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

// GET /api/dealer-dashboard?dealer_phone=...
async function getDealerDashboard(req, res) {
  try {
    const { dealer_phone } = req.query;
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

    // Fetch recent analysis and appointments in parallel
    const [analysisRes, apptRes] = await Promise.all([
      supabase
        .from(caTable)
        .select('*')
        .eq(caCols.dealer_name, dealerName)
        .order(caCols.created_at, { ascending: false })
        .limit(100),
      supabase
        .from(saTable)
        .select('*')
        .eq(saCols.dealer_phone, normalizedDealerPhone)
        .order(saCols.created_at, { ascending: false })
        .limit(50)
    ]);

    if (analysisRes.error) {
      throw new Error(analysisRes.error.message);
    }
    if (apptRes.error) {
      throw new Error(apptRes.error.message);
    }

    const analysisRows = analysisRes.data || [];
    const apptRows = apptRes.data || [];

    function filterCategory(cat) {
      return analysisRows.filter((row) => (row[caCols.category] || '').toLowerCase() === cat);
    }

    const buildList = (rows) =>
      rows.map((row) => ({
        call_id: row[caCols.call_id],
        customer_name: row[caCols.customer_name],
        customer_phone: row[caCols.customer_phone],
        customer_email: row[caCols.customer_email],
        service_request: row[caCols.service_request],
        call_summary: row[caCols.call_summary],
        user_sentiment: row[caCols.user_sentiment],
        call_successful: row[caCols.call_successful],
        category: row[caCols.category],
        is_user_hangup: row[caCols.is_user_hangup],
        disconnection_reason: row[caCols.disconnection_reason],
        recording_url: row[caCols.recording_url],
        public_log_url: row[caCols.public_log_url],
        created_at: row[caCols.created_at]
      }));

    const salesRows = filterCategory('sales');
    const serviceRows = filterCategory('service');
    const partsRows = filterCategory('parts');
    const callbackRows = filterCategory('callback');
    const hangupRows = analysisRows.filter((row) => row[caCols.is_user_hangup]);

    const buildApptList = (rows) =>
      rows.map((row) => ({
        id: row[saCols.id],
        customer_name: row[saCols.customer_name],
        customer_phone: row[saCols.customer_phone],
        customer_email: row[saCols.customer_email],
        vehicle_make: row[saCols.vehicle_make],
        vehicle_model: row[saCols.vehicle_model],
        vehicle_year: row[saCols.vehicle_year],
        service_request: row[saCols.service_request],
        preferred_date: row[saCols.preferred_date],
        preferred_time: row[saCols.preferred_time],
        start_time_local: row[saCols.start_time_local],
        end_time_local: row[saCols.end_time_local],
        local_timezone: row[saCols.local_timezone],
        calendar_html_link: row[saCols.calendar_html_link],
        created_at: row[saCols.created_at]
      }));

    return res.json({
      dealer_name: dealerName,
      dealer_phone: normalizedDealerPhone,
      sales: {
        count: salesRows.length,
        latest: buildList(salesRows)
      },
      service: {
        count: serviceRows.length,
        latest: buildList(serviceRows)
      },
      parts: {
        count: partsRows.length,
        latest: buildList(partsRows)
      },
      callbacks: {
        count: callbackRows.length,
        latest: buildList(callbackRows)
      },
      user_hangups: {
        count: hangupRows.length,
        latest: buildList(hangupRows)
      },
      service_appointments: {
        count: apptRows.length,
        latest: buildApptList(apptRows)
      }
    });
  } catch (err) {
    console.error('getDealerDashboard error:', err);
    return res.status(500).json({ error: 'Failed to load dealer dashboard' });
  }
}

module.exports = {
  getDealerDashboard
};

