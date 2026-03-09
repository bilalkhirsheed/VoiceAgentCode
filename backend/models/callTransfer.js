// Call transfers model
const callTransferSchema = {
  tableName: 'call_transfers',
  columns: {
    id: 'id',
    call_id: 'call_id',
    department: 'department',
    target_number: 'target_number',
    transfer_time: 'transfer_time',
    success: 'success',
    failure_reason: 'failure_reason'
  }
};

module.exports = callTransferSchema;

