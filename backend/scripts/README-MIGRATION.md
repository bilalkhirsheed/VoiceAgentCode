# Database Migration for Call Logs

## Fix: "Could not find the table 'public.calls' in the schema cache"

Run the SQL migration to create all required tables.

### Steps

1. Open **Supabase Dashboard** → **SQL Editor** → **New query**
2. Copy the entire contents of `create-call-tables.sql`
3. Paste and click **Run**

### Tables Created

- `dealers`, `departments`, `department_hours`, `holidays` (if not exist)
- `calls` – core call record (id = Retell call_id)
- `call_events` – event timeline
- `call_transcripts` – conversation messages
- `call_transfers` – transfer attempts
- `call_tags` – tags for filtering
- `callbacks` – callback capture from AI

### After Migration

1. Restart your backend: `node server.js`
2. Test webhook: `POST http://localhost:5000/api/retell-events` with:

```json
{
  "event": "call_started",
  "call_id": "test_call_123",
  "from_number": "+923001234567",
  "to_number": "+923137633702",
  "start_time": "2026-03-08T12:00:00Z"
}
```

If `to_number` matches a dealer's `primary_phone`, `dealer_id` will be set automatically.
