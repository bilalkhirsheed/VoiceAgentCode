/**
 * Time options for dropdowns (e.g. Working Hours Open/Close).
 * Value: 24h "HH:mm". Label: 12h "9:00 AM".
 * Steps: every 30 minutes.
 */
function to12h(h, m) {
  const am = h < 12;
  const h12 = h % 12 || 12;
  const mm = m < 10 ? `0${m}` : String(m);
  return `${h12}:${mm} ${am ? 'AM' : 'PM'}`;
}

export const TIME_OPTIONS = (() => {
  const out = [];
  for (let h = 0; h < 24; h++) {
    for (let m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      out.push({ value, label: to12h(h, m) });
    }
  }
  return out;
})();
