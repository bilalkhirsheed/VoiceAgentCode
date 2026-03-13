-- Backfill call_analysis from historical call_events that already contain call_analyzed payloads
-- Run this once in Supabase SQL editor AFTER create-service-and-analysis-tables.sql

insert into public.call_analysis (
  call_id,
  dealer_name,
  dealer_phone,
  call_summary,
  call_successful,
  user_sentiment,
  customer_name,
  customer_phone,
  customer_email,
  vehicle_type,
  test_drive,
  trade_in,
  vehicle_make,
  vehicle_model,
  vehicle_year,
  service_request,
  preferred_date,
  preferred_time,
  call_back_capture,
  category,
  disconnection_reason,
  is_user_hangup,
  recording_url,
  public_log_url,
  start_timestamp,
  end_timestamp,
  duration_ms
)
select
  ce.call_id,
  coalesce(
    ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'Dealer_name',
    ce.metadata -> 'collected_dynamic_variables' ->> 'dealer_name'
  ) as dealer_name,
  coalesce(
    ce.metadata -> 'collected_dynamic_variables' ->> 'sales_transfer_phone',
    ce.metadata -> 'collected_dynamic_variables' ->> 'service_transfer_phone',
    ce.metadata -> 'collected_dynamic_variables' ->> 'parts_transfer_phone'
  ) as dealer_phone,
  ce.metadata -> 'call_analysis' ->> 'call_summary' as call_summary,
  (ce.metadata -> 'call_analysis' ->> 'call_successful')::boolean as call_successful,
  ce.metadata -> 'call_analysis' ->> 'user_sentiment' as user_sentiment,
  coalesce(
    ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'customer_name',
    ce.metadata -> 'collected_dynamic_variables' ->> 'customer_name'
  ) as customer_name,
  coalesce(
    ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'customer_phone',
    ce.metadata -> 'collected_dynamic_variables' ->> 'customer_phone'
  ) as customer_phone,
  coalesce(
    ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'customer_Email',
    ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'customer_email'
  ) as customer_email,
  ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'vehicle_type' as vehicle_type,
  ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'test_drive' as test_drive,
  ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'trade_in' as trade_in,
  ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'vehicle_make' as vehicle_make,
  ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'vehicle_model' as vehicle_model,
  ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'vehicle_year' as vehicle_year,
  coalesce(
    ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'service_request',
    ce.metadata -> 'collected_dynamic_variables' ->> 'Reason_for_call'
  ) as service_request,
  ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'preferred_date' as preferred_date,
  ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'preferred_time' as preferred_time,
  coalesce(
    ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'Call_Back_Capture',
    ce.metadata -> 'collected_dynamic_variables' ->> 'Call_Back_Capture'
  ) as call_back_capture,
  -- simple SQL categorization similar to JS helper
  case
    when lower(coalesce(ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'service_request', '')) ~
         '(service|maintenance|oil|repair|booking)'
      or lower(coalesce(ce.metadata -> 'collected_dynamic_variables' ->> 'Reason_for_call', '')) like '%service%'
      then 'service'
    when lower(coalesce(ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'service_request', '')) ~
         '(sale|buy|purchase|finance|test drive|test-drive)'
      or lower(coalesce(ce.metadata -> 'collected_dynamic_variables' ->> 'Reason_for_call', '')) ~
         '(sale|buy|purchase)'
      then 'sales'
    when lower(coalesce(ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'service_request', '')) ~
         '(part|spare|accessor)'
      or lower(coalesce(ce.metadata -> 'collected_dynamic_variables' ->> 'Reason_for_call', '')) ~
         '(part|spare|accessor)'
      then 'parts'
    when coalesce(
           ce.metadata -> 'call_analysis' -> 'custom_analysis_data' ->> 'Call_Back_Capture',
           ce.metadata -> 'collected_dynamic_variables' ->> 'Call_Back_Capture'
         ) is not null
      or lower(coalesce(ce.metadata -> 'collected_dynamic_variables' ->> 'Reason_for_call', '')) like '%callback%'
      then 'callback'
    else 'other'
  end as category,
  ce.metadata ->> 'disconnection_reason' as disconnection_reason,
  (coalesce(ce.metadata ->> 'disconnection_reason', '')) ilike '%user%' as is_user_hangup,
  ce.metadata ->> 'recording_url' as recording_url,
  ce.metadata ->> 'public_log_url' as public_log_url,
  (ce.metadata ->> 'start_timestamp')::bigint as start_timestamp,
  (ce.metadata ->> 'end_timestamp')::bigint as end_timestamp,
  (ce.metadata ->> 'duration_ms')::bigint as duration_ms
from public.call_events ce
where
  ce.event_type = 'call_analyzed'
  and ce.metadata is not null
  and not exists (
    select 1
    from public.call_analysis ca
    where ca.call_id = ce.call_id
  );

