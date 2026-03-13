-- Example query to retrieve categorized history for a given dealer name or phone
-- Replace :dealer_name or :dealer_phone with actual values when running in Supabase SQL editor.

select
  ca.call_id,
  ca.dealer_name,
  ca.dealer_phone,
  ca.category,
  ca.customer_name,
  ca.customer_phone,
  ca.customer_email,
  ca.service_request,
  ca.preferred_date,
  ca.preferred_time,
  ca.call_summary,
  ca.user_sentiment,
  ca.call_successful,
  ca.is_user_hangup,
  ca.disconnection_reason,
  ca.recording_url,
  ca.public_log_url,
  to_timestamp(ca.start_timestamp / 1000) as start_time,
  to_timestamp(ca.end_timestamp / 1000) as end_time,
  ca.created_at
from public.call_analysis ca
where
  (:dealer_name is null or ca.dealer_name = :dealer_name)
  and (:dealer_phone is null or ca.dealer_phone = :dealer_phone)
order by ca.created_at desc
limit 500;

