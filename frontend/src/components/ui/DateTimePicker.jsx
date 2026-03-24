import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Calendar } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** Format datetime-local value for display: "M/D/YYYY h:mm AM/PM" */
function formatDisplay(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = h % 12 || 12;
  const mm = m < 10 ? `0${m}` : String(m);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()} ${h12}:${mm} ${am ? 'AM' : 'PM'}`;
}

/** Value to datetime-local string YYYY-MM-DDTHH:mm */
function toLocalString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function DateTimePicker({ value, onChange, placeholder = 'Pick date & time', id, placement = 'above' }) {
  const [open, setOpen] = useState(false);
  const [triggerRect, setTriggerRect] = useState(null);
  const [viewDate, setViewDate] = useState(() => (value ? new Date(value) : new Date()));
  const [hour, setHour] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return d.getHours();
  });
  const [minute, setMinute] = useState(() => {
    const d = value ? new Date(value) : new Date();
    return d.getMinutes();
  });
  const containerRef = useRef(null);

  const selectedDate = value ? new Date(value) : null;

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!Number.isNaN(d.getTime())) {
        setViewDate(d);
        setHour(d.getHours());
        setMinute(d.getMinutes());
      }
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current?.contains(e.target)) return;
      if (e.target.closest('[data-datetimepicker-portal]')) return;
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
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day, hour, minute);
    onChange(toLocalString(d));
  }

  function handleToday() {
    const d = new Date();
    setViewDate(d);
    setHour(d.getHours());
    setMinute(d.getMinutes());
    onChange(toLocalString(d));
  }

  function applyTime(h, m) {
    const d = selectedDate
      ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), h, m)
      : new Date(viewDate.getFullYear(), viewDate.getMonth(), viewDate.getDate(), h, m);
    setViewDate(d);
    setHour(h);
    setMinute(m);
    onChange(toLocalString(d));
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
        className="flex h-9 w-full items-center justify-between gap-2 rounded-[8px] border border-slate-700 bg-slate-900 px-3 text-left text-[13px] text-slate-100 transition-colors hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500"
      >
        <span className={display ? '' : 'text-slate-500'}>{display || placeholder}</span>
        <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      </button>

      {open &&
        triggerRect &&
        createPortal(
          <div
            data-datetimepicker-portal
            role="dialog"
            aria-label="Pick date and time"
            aria-modal="true"
            className="z-[100] w-[280px] rounded-[14px] border border-slate-700 bg-slate-900 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
            style={{
              position: 'fixed',
              ...(placement === 'below'
                ? { left: triggerRect.left, top: triggerRect.bottom + 8 }
                : { left: triggerRect.left, top: triggerRect.top - 8, transform: 'translateY(-100%)' }),
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

              <div className="mb-3 grid grid-cols-7 gap-0.5 text-center text-[11px] font-medium text-slate-400">
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

              <div className="flex items-center gap-2 border-t border-slate-800 pt-3">
                <span className="text-[12px] text-slate-400">Time</span>
                <select
                  value={hour}
                  onChange={(e) => applyTime(Number(e.target.value), minute)}
                  className="rounded-[6px] border border-slate-600 bg-slate-800 px-2 py-1.5 text-[12px] text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i % 12 || 12}:00 {i < 12 ? 'AM' : 'PM'}
                    </option>
                  ))}
                </select>
                <span className="text-slate-500">:</span>
                <select
                  value={minute}
                  onChange={(e) => applyTime(hour, Number(e.target.value))}
                  className="rounded-[6px] border border-slate-600 bg-slate-800 px-2 py-1.5 text-[12px] text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                >
                  {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
                    <option key={m} value={m}>
                      {m < 10 ? `0${m}` : m}
                    </option>
                  ))}
                </select>
              </div>
          </div>,
          document.body
        )}
    </div>
  );
}
