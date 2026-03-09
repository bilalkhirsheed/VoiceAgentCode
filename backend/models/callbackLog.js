// Callback requests (logging) model
const callbackLogSchema = {
  tableName: 'callbacks',
  columns: {
    id: 'id',
    call_id: 'call_id',
    customer_name: 'customer_name',
    phone_number: 'phone_number',
    preferred_time: 'preferred_time',
    created_at: 'created_at'
  }
};

module.exports = callbackLogSchema;

