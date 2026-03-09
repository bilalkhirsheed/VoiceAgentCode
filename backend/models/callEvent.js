// Call events timeline model
const callEventSchema = {
  tableName: 'call_events',
  columns: {
    id: 'id',
    call_id: 'call_id',
    event_type: 'event_type',
    event_time: 'event_time',
    node_name: 'node_name',
    intent_detected: 'intent_detected',
    metadata: 'metadata'
  }
};

module.exports = callEventSchema;

