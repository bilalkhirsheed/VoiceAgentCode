const supabase = require('../config/supabaseClient');
const { dealer, department, departmentHours } = require('../models');

async function main() {
  try {
    const dealerTable = dealer.tableName;
    const dealerCols = dealer.columns;

    // 1) Insert dealer
    const dealerPayload = {
      [dealerCols.dealer_name]: 'Pakistan Demo Dealer',
      [dealerCols.dealer_code]: 'PK-DEMO-001',
      [dealerCols.timezone]: 'Asia/Karachi',
      [dealerCols.address]: null,
      [dealerCols.city]: 'Karachi',
      [dealerCols.state]: 'Sindh',
      [dealerCols.country]: 'Pakistan',
      [dealerCols.zip_code]: null,
      [dealerCols.website_url]: null,
      [dealerCols.default_voice]: 'female',
      [dealerCols.primary_phone]: '+923137633702'
    };

    const { data: dealerRow, error: dealerError } = await supabase
      .from(dealerTable)
      .insert([dealerPayload])
      .select('*')
      .single();

    if (dealerError) {
      console.error('Error inserting dealer:', dealerError.message);
      process.exit(1);
    }

    const dealerId = dealerRow[dealerCols.id];
    console.log('Dealer inserted with id:', dealerId);

    // 2) Insert one department (Sales) for this dealer
    const deptTable = department.tableName;
    const deptCols = department.columns;

    const deptPayload = {
      [deptCols.dealer_id]: dealerId,
      [deptCols.department_name]: 'sales',
      [deptCols.transfer_phone]: '+923137633702',
      [deptCols.transfer_type]: 'pstn',
      [deptCols.after_hours_action]: 'callback'
    };

    const { data: deptRow, error: deptError } = await supabase
      .from(deptTable)
      .insert([deptPayload])
      .select('*')
      .single();

    if (deptError) {
      console.error('Error inserting department:', deptError.message);
      process.exit(1);
    }

    const departmentId = deptRow[deptCols.id];
    console.log('Department inserted with id:', departmentId);

    // 3) Insert department hours: Mon–Sat 09:00–17:00, Sunday closed
    const dhTable = departmentHours.tableName;
    const dhCols = departmentHours.columns;

    const days = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday'
    ];

    const hoursPayload = days.map((day) => {
      if (day === 'Sunday') {
        return {
          [dhCols.department_id]: departmentId,
          [dhCols.day_of_week]: day,
          [dhCols.open_time]: null,
          [dhCols.close_time]: null,
          [dhCols.is_closed]: true
        };
      }
      return {
        [dhCols.department_id]: departmentId,
        [dhCols.day_of_week]: day,
        [dhCols.open_time]: '09:00',
        [dhCols.close_time]: '17:00',
        [dhCols.is_closed]: false
      };
    });

    const { error: hoursError } = await supabase
      .from(dhTable)
      .insert(hoursPayload);

    if (hoursError) {
      console.error('Error inserting department hours:', hoursError.message);
      process.exit(1);
    }

    console.log('Department hours inserted for all days.');
    console.log('Seeding completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Unexpected error during seeding:', err);
    process.exit(1);
  }
}

main();

