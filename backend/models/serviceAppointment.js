const serviceAppointmentSchema = {
  tableName: 'service_appointments',
  columns: {
    id: 'id',
    dealer_id: 'dealer_id',
    dealer_phone: 'dealer_phone',
    dealer_name: 'dealer_name',
    customer_name: 'customer_name',
    customer_phone: 'customer_phone',
    customer_email: 'customer_email',
    vehicle_make: 'vehicle_make',
    vehicle_model: 'vehicle_model',
    vehicle_year: 'vehicle_year',
    service_request: 'service_request',
    start_time_utc: 'start_time_utc',
    end_time_utc: 'end_time_utc',
    start_time_local: 'start_time_local',
    end_time_local: 'end_time_local',
    local_timezone: 'local_timezone',
    preferred_date: 'preferred_date',
    preferred_time: 'preferred_time',
    calendar_event_id: 'calendar_event_id',
    calendar_html_link: 'calendar_html_link',
    created_at: 'created_at'
  }
};

module.exports = serviceAppointmentSchema;

