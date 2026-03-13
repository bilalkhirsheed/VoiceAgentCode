export function PlaceholderPage({ title, description, note }) {
  return (
    <div className="p-6">
      <div className="text-[24px] font-semibold text-crm-text">{title}</div>
      <div className="mt-2 text-[13px] text-crm-text2">{description}</div>
      <div className="mt-6 rounded-[6px] border border-crm-border bg-white p-5 text-[13px] text-crm-text2">
        {note}
      </div>
    </div>
  );
}
