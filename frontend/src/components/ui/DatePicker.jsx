import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Format YYYY-MM-DD for display: "M/D/YYYY" */
function formatDisplay(value) {
  if (!value) return '';
  const d = new Date(value + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/** Date to YYYY-MM-DD */
function toYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function DatePicker({ value, onChange, placeholder = 'mm/dd/yyyy', id }) {
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const [viewDate, setViewDate] = useState(() =>
    value ? new Date(value + 'T12:00:00') : new Date()
  );
  const containerRef = useRef(null);

  const selectedDate = value ? new Date(value + 'T12:00:00') : null;

  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00');
      if (!Number.isNaN(d.getTime())) setViewDate(d);
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current?.contains(e.target)) return;
      if (e.target.closest('[data-datepicker-portal]')) return;
      setOpen(false);
    }
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  function handlePickDay(day) {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    onChange(toYYYYMMDD(d));
    setOpen(false);
  }

  function handleToday() {
    const d = new Date();
    setViewDate(d);
    onChange(toYYYYMMDD(d));
    setOpen(false);
  }

  function prevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1));
  }
  function nextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1));
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const grid = [];
  for (let i = 0; i < firstDay; i++) {
    grid.push({ day: daysInPrev - firstDay + i + 1, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    grid.push({ day: d, current: true });
  }
  let rest = 42 - grid.length;
  for (let d = 1; d <= rest; d++) {
    grid.push({ day: d, current: false });
  }

  const display = formatDisplay(value);

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        id={id}
        onClick={() => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) setTriggerRect(rect);
          setOpen((o) => !o);
        }}
        className="flex h-9 w-full items-center justify-between gap-2 rounded-[8px] border border-slate-700 bg-slate-800 px-3 text-left text-[13px] text-slate-100 transition-colors hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
      >
        <span className={display ? '' : 'text-slate-500'}>{display || placeholder}</span>
        <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>

      {open &&
        triggerRect &&
        createPortal(
          <div
            data-datepicker-portal
            role="dialog"
            aria-label="Pick date"
            aria-modal="true"
            className="z-[100] w-[260px] rounded-[14px] border border-slate-700 bg-slate-900 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
            style={{
              position: 'fixed',
              left: triggerRect.left,
              top: triggerRect.top - 8,
              transform: 'translateY(-100%)',
            }}
          >
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleToday}
                  className="rounded-[6px] border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-[12px] font-medium text-slate-200 hover:bg-slate-700"
                >
                  Today
                </button>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <span className="min-w-[88px] text-center text-[13px] font-medium text-slate-100">
                    {MONTHS[month]} {year}
                  </span>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-slate-400">
                {DAYS.map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
                {grid.map((cell, i) => {
                  const isSelected =
                    cell.current &&
                    selectedDate &&
                    selectedDate.getDate() === cell.day &&
                    selectedDate.getMonth() === month &&
                    selectedDate.getFullYear() === year;
                  const isToday =
                    cell.current &&
                    new Date().getDate() === cell.day &&
                    new Date().getMonth() === month &&
                    new Date().getFullYear() === year;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => cell.current && handlePickDay(cell.day)}
                      className={`rounded py-1.5 text-[12px] ${
                        !cell.current ? 'text-slate-600' : 'text-slate-200 hover:bg-slate-800'
                      } ${isSelected ? 'bg-sky-600 text-white hover:bg-sky-500' : ''} ${
                        isToday && !isSelected ? 'ring-1 ring-sky-500/60' : ''
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>
          </div>,
          document.body
        )}
    </div>
  );
}
