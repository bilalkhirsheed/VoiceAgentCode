'use client';

const React = require('react');

module.exports = function SalesLeadsPage() {
  return (
    <div className="p-6">
      <div className="text-[24px] font-semibold text-crm-text">Sales Leads</div>
      <div className="mt-2 text-[13px] text-crm-text2">
        Coming next: lead list, assignment, mark contacted, and “view call” linking.
      </div>
      <div className="mt-6 rounded-crm border border-crm-border bg-white p-5 text-[13px] text-crm-text2">
        This module will use your `leads` table once we align fields to the CRM data model (vehicle interest, trade-in, test drive, etc.).
      </div>
    </div>
  );
};

