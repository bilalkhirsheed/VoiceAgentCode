import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  apiGetCall,
  apiGetCallEvents,
  apiGetCallTranscripts,
  apiGetCallTransfers,
  apiGetCallCallbackLogs,
  apiGetCallTags
} from '../api';
import { getDealerPhoneKey, getSeenCallIds, getInboxUnreadCount, markCallAsSeen, setInboxUnreadCount } from '../lib/inboxSeen';
import { useToast } from '../contexts/ToastContext';

function Row({ label, value, children }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800/70 py-2.5 text-[13px] last:border-0">
      <div className="text-slate-400">{label}</div>
      <div className="text-slate-100 text-right min-w-0 max-w-[60%]">{children ?? (value ?? '—')}</div>
    </div>
  );
}

function OutcomeBadge({ code }) {
  if (!code || code === 'no_outcome') return <span className="text-slate-400">No outcome</span>;
  const resolved = /resolved|completed|success/i.test(code);
  const failed = /failed|error|no_answer/i.test(code);
  const className = resolved
    ? 'rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[12px] font-medium text-emerald-400 border border-emerald-500/40'
    : failed
      ? 'rounded-full bg-red-500/20 px-2.5 py-0.5 text-[12px] font-medium text-red-400 border border-red-500/40'
      : 'rounded-full bg-slate-700/80 px-2.5 py-0.5 text-[12px] font-medium text-slate-200 border border-slate-600';
  return <span className={className}>{code}</span>;
}

export function CallDetailPage() {
  const { callId } = useParams();
  const location = useLocation();
  const toast = useToast();
  const query = location.search || '';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const hasShownLoadError = useRef(false);

  const hasMarkedSeen = useRef(false);

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
        if (!hasShownLoadError.current) {
          toast.error(e?.message ?? 'Failed to load call');
          hasShownLoadError.current = true;
        }
      })
      .finally(() => setLoading(false));
  }, [callId, toast]);

  // Mark this call as seen in Inbox so when dealer goes back it no longer shows as "New"
  useEffect(() => {
    if (!callId || !data?.call || hasMarkedSeen.current) return;
    const dealerPhoneKey = getDealerPhoneKey(location.search);
    if (!dealerPhoneKey) return;
    const seen = getSeenCallIds(dealerPhoneKey);
    if (seen.has(callId)) return;
    hasMarkedSeen.current = true;
    markCallAsSeen(dealerPhoneKey, callId);
    setInboxUnreadCount(dealerPhoneKey, Math.max(0, getInboxUnreadCount(dealerPhoneKey) - 1));
  }, [callId, data?.call, location.search]);

  if (loading) {
    return (
      <div className="crm-page">
        <div className="text-[18px] font-semibold text-slate-300">Loading…</div>
      </div>
    );
  }

  if (!data?.call) {
    return (
      <div className="crm-page">
        <div className="text-[18px] font-semibold text-slate-200">Call not found</div>
        <Link
          to={`/crm/calls${query}`}
          className="mt-4 inline-flex items-center justify-center rounded-[8px] border border-slate-600 bg-slate-800 px-4 py-2 text-[13px] font-medium text-slate-100 hover:bg-slate-700"
        >
          Back to calls
        </Link>
      </div>
    );
  }

  const c = data.call;
  const sysTranscript = data.transcripts.find((t) => t.speaker === 'system');

  return (
    <div className="crm-page space-y-8">
      {/* Header with stronger hierarchy */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="crm-page-title">Call Details</h1>
          <div className="flex items-center gap-2">
            <span className="rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 font-mono text-[12px] text-slate-300">
              {c.id}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/crm/inbox${query}`}
            className="inline-flex h-9 items-center justify-center rounded-[8px] border border-slate-600 bg-slate-800 px-4 text-[13px] font-medium text-slate-100 hover:bg-slate-700"
          >
            Back to Inbox
          </Link>
          <Link
            to={`/crm/calls${query}`}
            className="inline-flex h-9 items-center justify-center rounded-[8px] border border-slate-600 bg-slate-800 px-4 text-[13px] font-medium text-slate-100 hover:bg-slate-700"
          >
            All calls
          </Link>
          {c.recording_url ? (
            <a
              href={c.recording_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center justify-center rounded-[8px] border border-sky-600 bg-sky-600 px-4 text-[13px] font-medium text-white hover:bg-sky-500"
            >
              Download recording
            </a>
          ) : (
            <span className="inline-flex h-9 items-center justify-center rounded-[8px] border border-slate-600 bg-slate-800/60 px-4 text-[13px] text-slate-500">
              No recording
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left column: Transcript, Events, Recording — more spacing */}
        <div className="lg:col-span-2 space-y-8">
          <section className="crm-section-card">
            <h2 className="text-[18px] font-semibold text-slate-50">Transcript</h2>
            <div className="mt-4 rounded-[10px] border border-slate-800 bg-slate-950/50 p-4">
              <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-200">
                {sysTranscript?.message ?? 'No transcript saved yet.'}
              </pre>
            </div>
          </section>

          <section className="crm-section-card">
            <h2 className="text-[16px] font-semibold text-slate-50">Events</h2>
            <div className="mt-4 overflow-hidden rounded-[10px] border border-slate-800 bg-slate-950/40">
              <div className="border-b border-slate-600/80 bg-slate-900/80 px-4 py-3 text-[13px] font-medium text-slate-200">Timeline</div>
              <div>
                {data.events.slice(0, 50).map((e, i) => (
                  <div key={e.id ?? i} className="border-b border-slate-600/60 px-4 py-2.5 text-[13px] text-slate-300">
                    {e.event_time ? new Date(e.event_time).toLocaleString() : '—'} · {e.event_type}
                  </div>
                ))}
                {data.events.length === 0 && (
                  <div className="border-b border-slate-600/60 px-4 py-6 text-[13px] text-slate-500">No events.</div>
                )}
              </div>
            </div>
          </section>

          {c.recording_url && (
            <section className="crm-section-card">
              <h2 className="text-[16px] font-semibold text-slate-50">Recording</h2>
              <audio className="mt-4 w-full" controls src={c.recording_url} />
            </section>
          )}
        </div>

        {/* Right column: Summary + outcome badge, Transfers, Callback, Tags */}
        <div className="space-y-8">
          <section className="crm-section-card">
            <h2 className="text-[18px] font-semibold text-slate-50">Summary</h2>
            <div className="mt-4">
              <Row label="Dealer DID" value={c.did} />
              <Row label="Caller Phone" value={c.caller_number} />
              <Row label="Customer Name" value={c.customer_name} />
              <Row label="Customer Phone" value={c.customer_phone} />
              <Row label="Customer Email" value={c.customer_email} />
              <Row label="Intent" value={c.detected_intent} />
              <Row label="Outcome"><OutcomeBadge code={c.outcome_code} /></Row>
              <Row label="Start" value={c.start_time ? new Date(c.start_time).toLocaleString() : null} />
              <Row label="End" value={c.end_time ? new Date(c.end_time).toLocaleString() : null} />
              <Row label="Duration (s)" value={c.duration_seconds} />
              <Row label="Transferred" value={c.transferred ? 'Yes' : 'No'} />
              <Row label="Callback requested" value={c.callback_requested ? 'Yes' : 'No callback'} />
            </div>
          </section>

          <section className="crm-section-card">
            <h2 className="text-[16px] font-semibold text-slate-50">Transfers</h2>
            <div className="mt-4 space-y-3">
              {data.transfers.length === 0 ? (
                <p className="text-[13px] text-slate-500">No transfer</p>
              ) : (
                data.transfers.slice(0, 10).map((t, i) => (
                  <div key={t.id ?? i} className="rounded-[8px] border border-slate-800 bg-slate-950/50 p-3 text-[13px]">
                    <div className="font-medium text-slate-100">{t.department ?? '—'}</div>
                    <div className="mt-1 text-slate-400">Target: {t.target_number ?? '—'}</div>
                    <div className="mt-1 text-slate-400">
                      {t.success === true ? 'Success' : t.success === false ? `Failed: ${t.failure_reason ?? '—'}` : '—'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="crm-section-card">
            <h2 className="text-[16px] font-semibold text-slate-50">Callback capture</h2>
            <div className="mt-4 space-y-3">
              {data.callbacks.length === 0 ? (
                <p className="text-[13px] text-slate-500">No callback</p>
              ) : (
                data.callbacks.map((cb, i) => (
                  <div key={cb.id ?? i} className="rounded-[8px] border border-slate-800 bg-slate-950/50 p-3 text-[13px]">
                    <div className="font-medium text-slate-100">{cb.customer_name ?? '—'}</div>
                    <div className="text-slate-400">{cb.phone_number ?? '—'}</div>
                    <div className="text-slate-400">Preferred: {cb.preferred_time ?? '—'}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="crm-section-card">
            <h2 className="text-[16px] font-semibold text-slate-50">Tags</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.tags.length === 0 ? (
                <p className="text-[13px] text-slate-500">No tags</p>
              ) : (
                data.tags.map((t, i) => (
                  <span
                    key={t.id ?? i}
                    className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[12px] text-slate-200"
                  >
                    {t.tag}
                  </span>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
