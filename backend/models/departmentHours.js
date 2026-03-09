// Department Hours model
const departmentHoursSchema = {
  tableName: 'department_hours',
  columns: {
    id: 'id',
    department_id: 'department_id', // FK → departments.id
    day_of_week: 'day_of_week',
    open_time: 'open_time',
    close_time: 'close_time',
    is_closed: 'is_closed',
    created_at: 'created_at'
  }
};

module.exports = departmentHoursSchema;