-- Add password_hash to dealers for dealer login.
-- Run in Supabase SQL Editor once. Then set each dealer's password from Admin (Dealers → edit dealer → Set password).

ALTER TABLE public.dealers
  ADD COLUMN IF NOT EXISTS password_hash TEXT;

COMMENT ON COLUMN public.dealers.password_hash IS 'Bcrypt hash of dealer login password; set from Admin dashboard.';
