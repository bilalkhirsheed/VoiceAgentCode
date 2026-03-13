const callAnalysisSchema = {
  tableName: 'call_analysis',
  columns: {
    id: 'id',
    call_id: 'call_id',
    dealer_name: 'dealer_name',
    dealer_phone: 'dealer_phone',
    call_summary: 'call_summary',
    call_successful: 'call_successful',
    user_sentiment: 'user_sentiment',
    customer_name: 'customer_name',
    customer_phone: 'customer_phone',
    customer_email: 'customer_email',
    vehicle_type: 'vehicle_type',
    test_drive: 'test_drive',
    trade_in: 'trade_in',
    vehicle_make: 'vehicle_make',
    vehicle_model: 'vehicle_model',
    vehicle_year: 'vehicle_year',
    service_request: 'service_request',
    preferred_date: 'preferred_date',
    preferred_time: 'preferred_time',
    call_back_capture: 'call_back_capture',
    category: 'category',
    disconnection_reason: 'disconnection_reason',
    is_user_hangup: 'is_user_hangup',
    recording_url: 'recording_url',
    public_log_url: 'public_log_url',
    start_timestamp: 'start_timestamp',
    end_timestamp: 'end_timestamp',
    duration_ms: 'duration_ms',
    created_at: 'created_at'
  }
};

module.exports = callAnalysisSchema;

