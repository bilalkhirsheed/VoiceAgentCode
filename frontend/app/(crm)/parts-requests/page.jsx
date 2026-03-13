'use client';

const React = require('react');

module.exports = function PartsRequestsPage() {
  return (
    <div className="p-6">
      <div className="text-[24px] font-semibold text-crm-text">Parts Requests</div>
      <div className="mt-2 text-[13px] text-crm-text2">
        Coming next: parts inquiry list + statuses (New/Contacted/Ordered/Completed) + view call.
      </div>
      <div className="mt-6 rounded-crm border border-crm-border bg-white p-5 text-[13px] text-crm-text2">
        This module will be wired after we add parts-request fields to your lead/customer capture or a dedicated parts_requests table.
      </div>
    </div>
  );
};

