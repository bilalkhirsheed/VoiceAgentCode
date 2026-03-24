import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const TOAST_DURATION = 4500;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', message }) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION);
  }, []);

  const success = useCallback((message) => addToast({ type: 'success', message }), [addToast]);
  const error = useCallback((message) => addToast({ type: 'error', message }), [addToast]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ success, error, addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-[380px] w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ id, type, message, onRemove }) {
  const isSuccess = type === 'success';
  const bg = isSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200';
  const text = isSuccess ? 'text-emerald-800' : 'text-red-800';
  const iconBg = isSuccess ? 'bg-emerald-500' : 'bg-red-500';

  return (
    <div
      role="alert"
      className={`pointer-events-auto rounded-lg border shadow-lg px-4 py-3 flex items-start gap-3 ${bg} ${text} animate-toast-in`}
    >
      <span className={`shrink-0 w-8 h-8 rounded-full ${iconBg} flex items-center justify-center`}>
        {isSuccess ? (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
      </span>
      <p className="text-sm font-medium flex-1 pt-0.5">{message}</p>
      <button
        type="button"
        onClick={() => onRemove(id)}
        className="shrink-0 p-1 rounded hover:bg-black/5 -m-1 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
