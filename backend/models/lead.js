// Lead model
const leadSchema = {
  tableName: 'leads',
  columns: {
    id: 'id',
    dealer_id: 'dealer_id', // FK → dealers.id
    department_id: 'department_id', // FK → departments.id (optional)
    customer_name: 'customer_name',
    customer_phone: 'customer_phone',
    customer_email: 'customer_email',
    intent: 'intent', // sales / service / parts / general
    source: 'source', // inbound_call / callback / web / other
    notes: 'notes',
    call_id: 'call_id',
    created_at: 'created_at'
  }
};

module.exports = leadSchema;

