'use client';

const React = require('react');

module.exports = function TransfersPage() {
  return (
    <div className="p-6">
      <div className="text-[24px] font-semibold text-crm-text">Transfers</div>
      <div className="mt-2 text-[13px] text-crm-text2">
        Coming next: transferred calls list (success/failed/no_answer/busy) built from `call_transfers`.
      </div>
      <div className="mt-6 rounded-crm border border-crm-border bg-white p-5 text-[13px] text-crm-text2">
        This module will group transfer attempts by `call_id` and show the final transfer result.
      </div>
    </div>
  );
};

