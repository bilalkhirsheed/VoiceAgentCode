-- ============================================================
-- Call Log Tables for Retell AI Webhook
-- Run this in Supabase SQL Editor: Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Dealers (if not exists) - required for dealer_id reference
CREATE TABLE IF NOT EXISTS dealers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dealer_name TEXT NOT NULL,
  dealer_code TEXT,
  timezone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  zip_code TEXT,
  website_url TEXT,
  default_voice TEXT,
  primary_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Departments (if not exists)
CREATE TABLE IF NOT EXISTS departments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dealer_id BIGINT REFERENCES dealers(id) ON DELETE CASCADE,
  department_name TEXT NOT NULL,
  transfer_phone TEXT,
  transfer_type TEXT,
  after_hours_action TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Department hours (if not exists)
CREATE TABLE IF NOT EXISTS department_hours (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  department_id BIGINT REFERENCES departments(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  open_time TEXT,
  close_time TEXT,
  is_closed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Holidays (if not exists)
CREATE TABLE IF NOT EXISTS holidays (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dealer_id BIGINT REFERENCES dealers(id) ON DELETE CASCADE,
  holiday_date DATE NOT NULL,
  description TEXT,
  is_closed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Calls (core table) - id stores Retell call_id (string)
-- dealer_id: TEXT to support both UUID and bigint from dealers table
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  dealer_id TEXT,
  did VARCHAR(30),
  caller_number VARCHAR(30),
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  duration_seconds INT,
  billable_minutes DECIMAL(6,2),
  detected_intent VARCHAR(100),
  outcome_code VARCHAR(50),
  transferred BOOLEAN DEFAULT FALSE,
  transfer_target VARCHAR(50),
  transfer_success BOOLEAN,
  callback_requested BOOLEAN DEFAULT FALSE,
  recording_url TEXT,
  config_version VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Call events timeline
CREATE TABLE IF NOT EXISTS call_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  event_type VARCHAR(50),
  event_time TIMESTAMPTZ,
  node_name VARCHAR(100),
  intent_detected VARCHAR(100),
  metadata JSONB
);

-- 7. Call transcripts
CREATE TABLE IF NOT EXISTS call_transcripts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  speaker VARCHAR(20),
  message TEXT,
  timestamp TIMESTAMPTZ
);

-- 8. Call tags
CREATE TABLE IF NOT EXISTS call_tags (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  tag VARCHAR(50)
);

-- 9. Call transfers
CREATE TABLE IF NOT EXISTS call_transfers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  call_id TEXT NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
  department VARCHAR(50),
  target_number VARCHAR(30),
  transfer_time TIMESTAMPTZ,
  success BOOLEAN,
  failure_reason TEXT
);

-- 10. Callbacks (callback capture from AI)
CREATE TABLE IF NOT EXISTS callbacks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  call_id TEXT REFERENCES calls(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  phone_number VARCHAR(30),
  preferred_time VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_calls_dealer_id ON calls(dealer_id);
CREATE INDEX IF NOT EXISTS idx_calls_start_time ON calls(start_time);
CREATE INDEX IF NOT EXISTS idx_calls_outcome_code ON calls(outcome_code);
CREATE INDEX IF NOT EXISTS idx_call_events_call_id ON call_events(call_id);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_call_id ON call_transcripts(call_id);
CREATE INDEX IF NOT EXISTS idx_call_transfers_call_id ON call_transfers(call_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_call_id ON callbacks(call_id);
