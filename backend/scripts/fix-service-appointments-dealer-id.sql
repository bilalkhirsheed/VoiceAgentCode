-- Fix service_appointments.dealer_id so it accepts dealers.id (BIGINT stored as TEXT).
-- Run in Supabase SQL Editor if dealer_id is currently UUID and inserts are failing.
-- dealers.id is BIGINT; storing as TEXT allows "1" and keeps compatibility with calls.dealer_id.

-- Option A: If dealer_id is UUID and you have no important data in it (all NULL):
ALTER TABLE public.service_appointments
  ALTER COLUMN dealer_id TYPE TEXT USING (dealer_id::TEXT);

-- Option B: If the above fails (e.g. "cannot cast type uuid to text"), run instead:
-- ALTER TABLE public.service_appointments DROP COLUMN IF EXISTS dealer_id;
-- ALTER TABLE public.service_appointments ADD COLUMN dealer_id TEXT;
