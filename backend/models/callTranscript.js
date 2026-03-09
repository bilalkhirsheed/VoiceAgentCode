// Call transcripts model
const callTranscriptSchema = {
  tableName: 'call_transcripts',
  columns: {
    id: 'id',
    call_id: 'call_id',
    speaker: 'speaker',
    message: 'message',
    timestamp: 'timestamp'
  }
};

module.exports = callTranscriptSchema;

