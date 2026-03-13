const React = require('react');
const Link = require('next/link');
const { ArrowRight } = require('lucide-react');

function Card({ title, description, href }) {
  return (
    <Link
      href={href}
      className="rounded-crm border border-crm-border bg-white p-5 hover:bg-[#F9FAFB]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[16px] font-semibold text-crm-text">{title}</div>
          <div className="mt-1 text-[13px] text-crm-text2">{description}</div>
        </div>
        <ArrowRight size={16} className="mt-1 text-crm-muted" />
      </div>
    </Link>
  );
}

module.exports = function HomePage() {
  return (
    <div className="p-6">
      <div className="text-[24px] font-semibold text-crm-text">Home</div>
      <div className="mt-2 text-[14px] text-crm-text2">
        Operational CRM for AI-captured calls, transcripts, callbacks, transfers and leads.
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card
          title="Calls"
          description="View call logs, filter by intent/date, and open transcripts & recordings."
          href="/calls"
        />
        <Card
          title="Callback Requests"
          description="Manage after-hours callback capture workflow."
          href="/callback-requests"
        />
        <Card
          title="Service Appointments"
          description="Confirm and schedule service booking requests captured by AI."
          href="/service-appointments"
        />
        <Card
          title="Sales Leads"
          description="View and assign sales leads captured from AI calls."
          href="/sales-leads"
        />
      </div>
    </div>
  );
};

