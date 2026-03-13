-- service_appointments: stores detailed booking info alongside Google Calendar
create table if not exists public.service_appointments (
  id uuid primary key default gen_random_uuid(),
  dealer_id uuid,
  dealer_phone text,
  dealer_name text,
  customer_name text,
  customer_phone text,
  customer_email text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year text,
  service_request text,
  start_time_utc timestamptz,
  end_time_utc timestamptz,
  start_time_local timestamptz,
  end_time_local timestamptz,
  local_timezone text,
  preferred_date date,
  preferred_time text,
  calendar_event_id text,
  calendar_html_link text,
  created_at timestamptz default now()
);

-- call_analysis: per-call categorized summary from Retell call_analyzed
create table if not exists public.call_analysis (
  id uuid primary key default gen_random_uuid(),
  call_id text references public.calls(id) on delete cascade,
  dealer_name text,
  dealer_phone text,
  call_summary text,
  call_successful boolean,
  user_sentiment text,
  customer_name text,
  customer_phone text,
  customer_email text,
  vehicle_type text,
  test_drive text,
  trade_in text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year text,
  service_request text,
  preferred_date text,
  preferred_time text,
  call_back_capture text,
  category text, -- 'sales' | 'service' | 'parts' | 'callback' | 'other'
  disconnection_reason text,
  is_user_hangup boolean default false,
  recording_url text,
  public_log_url text,
  start_timestamp bigint,
  end_timestamp bigint,
  duration_ms bigint,
  created_at timestamptz default now()
);

create index if not exists idx_call_analysis_call_id on public.call_analysis (call_id);
create index if not exists idx_call_analysis_category on public.call_analysis (category);
create index if not exists idx_call_analysis_is_user_hangup on public.call_analysis (is_user_hangup);

