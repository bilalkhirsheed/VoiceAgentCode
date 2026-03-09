// Call model
const callBackSchema = {
  tableName: 'callsBack',
  columns: {
    id: 'id',
    dealer_id: 'dealer_id', // FK → dealers.id
    customer_name: 'customer_name',
    customer_phone: 'customer_phone',
    reason: 'reason',
    call_id: 'call_id',
    created_at: 'created_at'
  }
};

module.exports = callBackSchema;