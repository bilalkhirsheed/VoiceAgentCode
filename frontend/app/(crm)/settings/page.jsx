'use client';

const React = require('react');

module.exports = function SettingsPage() {
  return (
    <div className="p-6">
      <div className="text-[24px] font-semibold text-crm-text">Settings</div>
      <div className="mt-2 text-[13px] text-crm-text2">
        Coming next: user roles (Admin/Manager/Viewer) and privacy controls for sensitive fields.
      </div>
      <div className="mt-6 rounded-crm border border-crm-border bg-white p-5 text-[13px] text-crm-text2">
        Once auth/RBAC is added on the backend, this page will enforce field-level hiding in the UI.
      </div>
    </div>
  );
};

