# Google Calendar setup for service booking

1. **Credentials**  
   Copy your Google service account JSON key to:
   - `backend/config/google-calendar-credentials.json`  
   Or set the full path in `.env`:
   - `GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\your\vehicleservicebooking-*.json`

2. **Calendar ID**  
   Share the Google Calendar you want to use for bookings with the service account email (e.g. `calendar-backend@vehicleservicebooking-490004.iam.gserviceaccount.com`).  
   Then set in `.env` (optional):
   - `CALENDAR_ID=your-calendar-id@group.calendar.google.com`  
   If not set, the API uses `primary` (the service account’s own calendar).

3. **.gitignore**  
   `google-calendar-credentials.json` and `vehicleservicebooking*.json` are gitignored. Do not commit keys.
