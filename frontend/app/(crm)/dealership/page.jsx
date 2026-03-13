'use client';

const React = require('react');

module.exports = function DealershipInfoPage() {
  return (
    <div className="p-6">
      <div className="text-[24px] font-semibold text-crm-text">Dealership Info</div>
      <div className="mt-2 text-[13px] text-crm-text2">
        Coming next: display dealer profile, department routing, hours, and holiday overrides.
      </div>
      <div className="mt-6 rounded-crm border border-crm-border bg-white p-5 text-[13px] text-crm-text2">
        This module will use `GET /api/dealers`, `GET /api/dealer-config/:did`, and department CRUD endpoints.
      </div>
    </div>
  );
};

