// Call tags model
const callTagSchema = {
  tableName: 'call_tags',
  columns: {
    id: 'id',
    call_id: 'call_id',
    tag: 'tag'
  }
};

module.exports = callTagSchema;

