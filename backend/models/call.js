// Calls core table model
const callSchema = {
  tableName: 'calls',
  columns: {
    id: 'id',
    dealer_id: 'dealer_id',
    did: 'did',
    caller_number: 'caller_number',
    start_time: 'start_time',
    end_time: 'end_time',
    duration_seconds: 'duration_seconds',
    billable_minutes: 'billable_minutes',
    detected_intent: 'detected_intent',
    outcome_code: 'outcome_code',
    transferred: 'transferred',
    transfer_target: 'transfer_target',
    transfer_success: 'transfer_success',
    callback_requested: 'callback_requested',
    recording_url: 'recording_url',
    config_version: 'config_version',
    created_at: 'created_at'
  }
};

module.exports = callSchema;

