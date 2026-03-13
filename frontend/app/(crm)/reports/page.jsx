'use client';

const React = require('react');

module.exports = function ReportsPage() {
  return (
    <div className="p-6">
      <div className="text-[24px] font-semibold text-crm-text">Reports</div>
      <div className="mt-2 text-[13px] text-crm-text2">
        Light monthly reporting will be added later (not analytics dashboard yet).
      </div>
      <div className="mt-6 rounded-crm border border-crm-border bg-white p-5 text-[13px] text-crm-text2">
        Planned: total calls, intent distribution, callback captures, and transfers by month/year/dealer filters.
      </div>
    </div>
  );
};

