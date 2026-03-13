/**
 * Google Calendar service for service booking.
 * Uses service account credentials from GOOGLE_APPLICATION_CREDENTIALS path.
 */
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getCredentialsPath() {
  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const relativePath = path.join(__dirname, '..', 'config', 'google-calendar-credentials.json');
  if (fs.existsSync(relativePath)) return relativePath;
  return null;
}

function getAuthClient() {
  const credPath = getCredentialsPath();
  if (!credPath) {
    throw new Error('Google Calendar credentials not found. Set GOOGLE_APPLICATION_CREDENTIALS or place google-calendar-credentials.json in backend/config/');
  }
  const key = JSON.parse(fs.readFileSync(credPath, 'utf8'));
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: SCOPES
  });
  return auth;
}

function getCalendarClient() {
  const auth = getAuthClient();
  return google.calendar({ version: 'v3', auth });
}

/**
 * Check if there are any events in the given time range (used for 1-hour slot).
 * @param {string} calendarId - Calendar ID (e.g. 'primary' or shared calendar id)
 * @param {Date} timeMin - Start of slot (JS Date)
 * @param {Date} timeMax - End of slot (JS Date)
 * @returns {Promise<boolean>} true if slot is busy
 */
async function isSlotBusy(calendarId, timeMin, timeMax) {
  const calendar = getCalendarClient();
  const res = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  });
  const items = res.data.items || [];
  return items.length > 0;
}

/**
 * Create a 1-hour event in the calendar.
 * @param {string} calendarId
 * @param {Date} start
 * @param {Date} end
 * @param {string} summary
 * @param {string} [description]
 * @param {string} [timeZone] - e.g. 'Asia/Karachi' so event shows correctly in dealer timezone
 * @returns {Promise<{ eventId, htmlLink }>}
 */
async function createEvent(calendarId, start, end, summary, description = '', timeZone = 'UTC') {
  const calendar = getCalendarClient();
  const event = {
    summary,
    description: description || undefined,
    start: { dateTime: start.toISOString(), timeZone },
    end: { dateTime: end.toISOString(), timeZone }
  };
  const res = await calendar.events.insert({
    calendarId,
    requestBody: event
  });
  return {
    eventId: res.data.id,
    htmlLink: res.data.htmlLink
  };
}

module.exports = {
  getCredentialsPath,
  getAuthClient,
  getCalendarClient,
  isSlotBusy,
  createEvent
};
