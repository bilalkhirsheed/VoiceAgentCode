'use client';

const React = require('react');

module.exports = function ServiceAppointmentsPage() {
  return (
    <div className="p-6">
      <div className="text-[24px] font-semibold text-crm-text">Service Appointments</div>
      <div className="mt-2 text-[13px] text-crm-text2">
        Coming next: appointment list + confirm/reschedule + calendar views (day/week/month).
      </div>
      <div className="mt-6 rounded-crm border border-crm-border bg-white p-5 text-[13px] text-crm-text2">
        This module will be wired once we finalize the appointment/booking schema (service_request, preferred_date/time, status).
      </div>
    </div>
  );
};

