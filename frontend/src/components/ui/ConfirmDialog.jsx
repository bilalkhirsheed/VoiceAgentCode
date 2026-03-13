/**
 * Reusable confirmation dialog for delete and other destructive actions.
 * Replaces browser window.confirm with a professional modal.
 */
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Delete', cancelLabel = 'Cancel', variant = 'danger' }) {
  if (!open) return null;

  const isDanger = variant === 'danger';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="mx-4 w-full max-w-md rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-[16px] font-semibold text-gray-900">
          {title}
        </h2>
        <p className="mt-2 text-[14px] text-gray-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[6px] border border-gray-300 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-[6px] px-4 py-2 text-[13px] font-medium text-white ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-crm-primary hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
