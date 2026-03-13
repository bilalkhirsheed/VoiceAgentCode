'use client';

const React = require('react');

module.exports = function CallbackRequestsPage() {
  return (
    <div className="p-6">
      <div className="text-[24px] font-semibold text-crm-text">Callback Requests</div>
      <div className="mt-2 text-[13px] text-crm-text2">
        Coming next: workflow statuses (Pending/Contacted/Resolved) + assignment + link to call.
      </div>
      <div className="mt-6 rounded-crm border border-crm-border bg-white p-5 text-[13px] text-crm-text2">
        This module will use your `callbacks` table (callback capture logs) and optionally a status/assignment table once you add it.
      </div>
    </div>
  );
};

