// Department model
const departmentSchema = {
  tableName: 'departments',
  columns: {
    id: 'id',
    dealer_id: 'dealer_id', // FK → dealers.id
    department_name: 'department_name',
    transfer_phone: 'transfer_phone',
    transfer_type: 'transfer_type', // sip / pstn / queue
    after_hours_action: 'after_hours_action', // callback / voicemail
    created_at: 'created_at'
  },
  // Department hours are related via department_id in department_hours table
};

module.exports = departmentSchema;