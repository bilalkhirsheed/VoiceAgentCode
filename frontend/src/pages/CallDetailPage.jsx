import { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  apiGetCall,
  apiGetCallEvents,
  apiGetCallTranscripts,
  apiGetCallTransfers,
  apiGetCallCallbackLogs,
  apiGetCallTags
} from '../api';

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-crm-border py-2 text-[13px]">
      <div className="text-crm-text2">{label}</div>
      <div className="text-crm-text">{value ?? '—'}</div>
    </div>
  );
}

export function CallDetailPage() {
  const { callId } = useParams();
  const location = useLocation();
  const query = location.search || '';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!callId) return;
    setLoading(true);
    Promise.all([
      apiGetCall(callId),
      apiGetCallEvents(callId),
      apiGetCallTranscripts(callId),
      apiGetCallTransfers(callId),
      apiGetCallCallbackLogs(callId),
      apiGetCallTags(callId)
    ])
      .then(([call, events, transcripts, transfers, callbacks, tags]) => {
        setData({
          call,
          events: events ?? [],
          transcripts: transcripts ?? [],
          transfers: transfers ?? [],
          callbacks: callbacks ?? [],
          tags: tags ?? []
        });
      })
      .catch((e) => {
        console.error(e);
        alert(e?.message ?? 'Failed to load call');
      })
      .finally(() => setLoading(false));
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
        <Link
          to={`/crm/calls${query}`}
          className="mt-4 inline-block rounded-[6px] border border-crm-border bg-white px-4 py-2 text-[13px]"
        >
          Back to calls
        </Link>
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
          <Link
            to={`/crm/calls${query}`}
            className="inline-flex h-9 items-center justify-center rounded-[6px] border border-crm-border bg-white px-4 text-[13px]"
          >
            Back
          </Link>
          {c.recording_url ? (
            <a
              href={c.recording_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-[6px] border border-crm-primary bg-crm-primary px-4 text-[13px] font-medium text-white hover:opacity-90"
            >
              Download recording
            </a>
          ) : (
            <span className="inline-flex h-9 items-center justify-center rounded-[6px] border border-crm-border bg-[#F9FAFB] px-4 text-[13px] text-crm-muted">
              No recording
            </span>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-[6px] border border-crm-border bg-white p-5">
          <div className="text-[18px] font-semibold text-crm-text">Transcript</div>
          <div className="mt-3 rounded-[6px] border border-crm-border bg-[#F9FAFB] p-4">
            <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-crm-text">
              {sysTranscript?.message ?? 'No transcript saved yet.'}
            </pre>
          </div>

          <div className="mt-6 text-[16px] font-semibold text-crm-text">Events</div>
          <div className="mt-3 overflow-hidden rounded-[6px] border border-crm-border">
            <div className="bg-[#F9FAFB] px-4 py-3 text-[13px] font-medium text-crm-text">Timeline</div>
            <div>
              {data.events.slice(0, 50).map((e, i) => (
                <div key={e.id ?? i} className="border-t border-crm-border px-4 py-2 text-[13px] text-crm-text2">
                  {e.event_time ? new Date(e.event_time).toLocaleString() : '—'} • {e.event_type}
                </div>
              ))}
              {data.events.length === 0 && (
                <div className="border-t border-crm-border px-4 py-6 text-[13px] text-crm-text2">No events.</div>
              )}
            </div>
          </div>

          {c.recording_url && (
            <div className="mt-6 rounded-[6px] border border-crm-border bg-white p-4">
              <div className="text-[16px] font-semibold text-crm-text">Recording</div>
              <audio className="mt-3 w-full" controls src={c.recording_url} />
            </div>
          )}
        </div>

        <div className="rounded-[6px] border border-crm-border bg-white p-5">
          <div className="text-[18px] font-semibold text-crm-text">Summary</div>
          <div className="mt-3">
            <Row label="Dealer DID" value={c.did} />
            <Row label="Caller" value={c.caller_number} />
            <Row label="Intent" value={c.detected_intent} />
            <Row label="Outcome" value={c.outcome_code} />
            <Row label="Start" value={c.start_time ? new Date(c.start_time).toLocaleString() : null} />
            <Row label="End" value={c.end_time ? new Date(c.end_time).toLocaleString() : null} />
            <Row label="Duration (s)" value={c.duration_seconds} />
            <Row label="Transferred" value={c.transferred ? 'Yes' : 'No'} />
            <Row label="Callback requested" value={c.callback_requested ? 'Yes' : 'No'} />
          </div>

          <div className="mt-6 text-[16px] font-semibold text-crm-text">Transfers</div>
          <div className="mt-2 space-y-2">
            {data.transfers.length === 0 ? (
              <div className="text-[13px] text-crm-text2">—</div>
            ) : (
              data.transfers.slice(0, 10).map((t, i) => (
                <div key={t.id ?? i} className="rounded-[6px] border border-crm-border p-3 text-[13px]">
                  <div className="font-medium text-crm-text">{t.department ?? '—'}</div>
                  <div className="mt-1 text-crm-text2">Target: {t.target_number ?? '—'}</div>
                  <div className="mt-1 text-crm-text2">
                    {t.success === true ? 'Success' : t.success === false ? `Failed: ${t.failure_reason ?? '—'}` : '—'}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 text-[16px] font-semibold text-crm-text">Callback capture</div>
          <div className="mt-2 space-y-2">
            {data.callbacks.length === 0 ? (
              <div className="text-[13px] text-crm-text2">—</div>
            ) : (
              data.callbacks.map((cb, i) => (
                <div key={cb.id ?? i} className="rounded-[6px] border border-crm-border p-3 text-[13px]">
                  <div className="font-medium text-crm-text">{cb.customer_name ?? '—'}</div>
                  <div className="text-crm-text2">{cb.phone_number ?? '—'}</div>
                  <div className="text-crm-text2">Preferred: {cb.preferred_time ?? '—'}</div>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 text-[16px] font-semibold text-crm-text">Tags</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.tags.length === 0 ? (
              <div className="text-[13px] text-crm-text2">—</div>
            ) : (
              data.tags.map((t, i) => (
                <span
                  key={t.id ?? i}
                  className="rounded-[6px] border border-crm-border bg-white px-2 py-1 text-[12px] text-crm-text2"
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
}
