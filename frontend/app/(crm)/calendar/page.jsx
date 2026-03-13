'use client';

const React = require('react');

module.exports = function CalendarPage() {
  return (
    <div className="p-6">
      <div className="text-[24px] font-semibold text-crm-text">Calendar</div>
      <div className="mt-2 text-[13px] text-crm-text2">
        Coming next: service booking calendar (day/week/month) with drag-and-drop scheduling.
      </div>
      <div className="mt-6 rounded-crm border border-crm-border bg-white p-5 text-[13px] text-crm-text2">
        This will be implemented after the service appointment schema is finalized.
      </div>
    </div>
  );
};

