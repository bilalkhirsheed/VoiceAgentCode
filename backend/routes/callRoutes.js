const express = require('express');
const {
  createCall,
  getCalls,
  getCallById,
  updateCall
} = require('../controllers/callController');
const {
  createCallEvent,
  getCallEvents
} = require('../controllers/callEventController');
const {
  createCallTranscriptEntry,
  getCallTranscripts
} = require('../controllers/callTranscriptController');
const {
  createCallTag,
  getCallTags
} = require('../controllers/callTagController');
const {
  createCallTransfer,
  getCallTransfers,
  getAllTransfers
} = require('../controllers/callTransferController');
const {
  createCallbackLog,
  getCallbackLogsForCall
} = require('../controllers/callbackLogController');

const router = express.Router();

// Core calls
router.post('/calls', createCall);
router.get('/calls', getCalls);
router.get('/calls/:id', getCallById);
router.put('/calls/:id', updateCall);

// Events timeline
router.post('/call-events', createCallEvent);
router.get('/calls/:callId/events', getCallEvents);

// Transcripts
router.post('/call-transcripts', createCallTranscriptEntry);
router.get('/calls/:callId/transcripts', getCallTranscripts);

// Tags
router.post('/call-tags', createCallTag);
router.get('/calls/:callId/tags', getCallTags);

// Transfers
router.post('/call-transfers', createCallTransfer);
router.get('/calls/:callId/transfers', getCallTransfers);
router.get('/transfers', getAllTransfers);

// Callback logs (analytics)
router.post('/callback-logs', createCallbackLog);
router.get('/calls/:callId/callback-logs', getCallbackLogsForCall);

module.exports = router;

