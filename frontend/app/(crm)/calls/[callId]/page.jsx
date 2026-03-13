'use client';

const React = require('react');
const Link = require('next/link');
const { Button } = require('../../../../components/ui/button');
const { getCall, getCallEvents, getCallTranscripts, getCallTransfers, getCallCallbackLogs, getCallTags } = require('../../../../lib/api');

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-crm-border py-2">
      <div className="text-[12px] text-crm-text2">{label}</div>
      <div className="text-[13px] text-crm-text">{value ?? '—'}</div>
    </div>
  );
}

module.exports = function CallDetailPage({ params }) {
  const callId = params.callId;
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [call, events, transcripts, transfers, callbacks, tags] = await Promise.all([
          getCall(callId),
          getCallEvents(callId),
          getCallTranscripts(callId),
          getCallTransfers(callId),
          getCallCallbackLogs(callId),
          getCallTags(callId)
        ]);
        setData({ call, events: events || [], transcripts: transcripts || [], transfers: transfers || [], callbacks: callbacks || [], tags: tags || [] });
      } catch (e) {
        console.error(e);
        alert(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [callId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-[18px] font-semibold text-crm-text">Loading…</div>
      </div>
    );
  }

  if (!data?.call) {
    return (
      <div className="p-6">
        <div className="text-[18px] font-semibold text-crm-text">Call not found</div>
        <div className="mt-4">
          <Link href="/calls">
            <Button variant="secondary">Back to calls</Button>
          </Link>
        </div>
      </div>
    );
  }

  const c = data.call;
  const sysTranscript = data.transcripts.find((t) => t.speaker === 'system');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[24px] font-semibold text-crm-text">Call Details</div>
          <div className="mt-1 text-[13px] text-crm-text2">Call ID: {c.id}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/calls">
            <Button variant="secondary">Back</Button>
          </Link>
          {c.recording_url ? (
            <a href={c.recording_url} target="_blank" rel="noreferrer">
              <Button>Download recording</Button>
            </a>
          ) : (
            <Button disabled>Download recording</Button>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-crm border border-crm-border bg-white p-5">
          <div className="text-[18px] font-semibold text-crm-text">Transcript</div>
          <div className="mt-3 rounded-crm border border-crm-border bg-white p-3">
            <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-crm-text">
              {sysTranscript?.message ||
                '// No final transcript saved yet. Ensure call_ended webhook was received.'}
            </pre>
          </div>

          <div className="mt-6 text-[16px] font-semibold text-crm-text">Conversation timeline</div>
          <div className="mt-3 overflow-hidden rounded-crm border border-crm-border">
            <div className="bg-[#F9FAFB] px-4 py-3 text-[13px] font-medium text-crm-text">
              Events
            </div>
            <div>
              {data.events.slice(0, 50).map((e, idx) => (
                <div
                  key={e.id || idx}
                  className="border-t border-crm-border px-4 py-2 text-[13px] text-crm-text2"
                >
                  <span className="text-crm-text">
                    {e.event_time ? new Date(e.event_time).toLocaleString() : '—'}
                  </span>{' '}
                  • {e.event_type}
                </div>
              ))}
              {data.events.length === 0 && (
                <div className="border-t border-crm-border px-4 py-6 text-[13px] text-crm-text2">
                  No events found.
                </div>
              )}
            </div>
          </div>

          {c.recording_url && (
            <div className="mt-6 rounded-crm border border-crm-border bg-white p-4">
              <div className="text-[16px] font-semibold text-crm-text">Recording</div>
              <audio className="mt-3 w-full" controls src={c.recording_url} />
            </div>
          )}
        </div>

        <div className="rounded-crm border border-crm-border bg-white p-5">
          <div className="text-[18px] font-semibold text-crm-text">Summary</div>
          <div className="mt-3">
            <Row label="Dealer DID" value={c.did} />
            <Row label="Caller number" value={c.caller_number} />
            <Row label="Intent" value={c.detected_intent} />
            <Row label="Outcome" value={c.outcome_code} />
            <Row label="Start time" value={c.start_time ? new Date(c.start_time).toLocaleString() : '—'} />
            <Row label="End time" value={c.end_time ? new Date(c.end_time).toLocaleString() : '—'} />
            <Row label="Duration (seconds)" value={c.duration_seconds} />
            <Row label="Transferred" value={c.transferred ? 'Yes' : 'No'} />
            <Row label="Transfer success" value={c.transfer_success === true ? 'Yes' : c.transfer_success === false ? 'No' : '—'} />
            <Row label="Callback requested" value={c.callback_requested ? 'Yes' : 'No'} />
          </div>

          <div className="mt-6 text-[16px] font-semibold text-crm-text">Transfers</div>
          <div className="mt-2 text-[13px] text-crm-text2">
            {data.transfers.length === 0 ? '—' : ''}
          </div>
          <div className="mt-2 space-y-2">
            {data.transfers.slice(0, 10).map((t, idx) => (
              <div key={t.id || idx} className="rounded-crm border border-crm-border p-3 text-[13px]">
                <div className="flex items-center justify-between">
                  <div className="text-crm-text font-medium capitalize">{t.department || '—'}</div>
                  <div className="text-crm-text2">
                    {t.transfer_time ? new Date(t.transfer_time).toLocaleString() : '—'}
                  </div>
                </div>
                <div className="mt-1 text-crm-text2">Target: {t.target_number || '—'}</div>
                <div className="mt-1 text-crm-text2">
                  Status:{' '}
                  {t.success === true ? 'Success' : t.success === false ? `Failed (${t.failure_reason || 'unknown'})` : '—'}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-[16px] font-semibold text-crm-text">Callback capture</div>
          <div className="mt-2 space-y-2 text-[13px]">
            {data.callbacks.length === 0 ? (
              <div className="text-crm-text2">—</div>
            ) : (
              data.callbacks.map((cb, idx) => (
                <div key={cb.id || idx} className="rounded-crm border border-crm-border p-3">
                  <div className="text-crm-text font-medium">{cb.customer_name || '—'}</div>
                  <div className="mt-1 text-crm-text2">{cb.phone_number || '—'}</div>
                  <div className="mt-1 text-crm-text2">Preferred: {cb.preferred_time || '—'}</div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 text-[16px] font-semibold text-crm-text">Tags</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.tags.length === 0 ? (
              <div className="text-[13px] text-crm-text2">—</div>
            ) : (
              data.tags.map((t, idx) => (
                <span
                  key={t.id || idx}
                  className="rounded-crm border border-crm-border bg-white px-2 py-1 text-[12px] text-crm-text2"
                >
                  {t.tag}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

