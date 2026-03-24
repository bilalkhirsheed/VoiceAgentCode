export function PlaceholderPage({ title, description, note }) {
  return (
    <div className="crm-page">
      <div className="crm-page-header">
        <div className="crm-page-title">{title}</div>
        <div className="crm-page-subtitle">{description}</div>
      </div>
      <div className="crm-section-card mt-4">
        <p className="text-[13px] text-slate-200 leading-relaxed">{note}</p>
      </div>
    </div>
  );
}
