// Holiday model
const holidaySchema = {
  tableName: 'holidays',
  columns: {
    id: 'id',
    dealer_id: 'dealer_id', // FK → dealers.id
    holiday_date: 'holiday_date',
    description: 'description',
    is_closed: 'is_closed',
    created_at: 'created_at'
  }
};

module.exports = holidaySchema;