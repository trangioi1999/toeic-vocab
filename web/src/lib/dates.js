const pad = n => String(n).padStart(2, '0');
const fromDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toDate = iso => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };

/** Local calendar day (device time zone), never UTC. */
export const todayISO = (now = new Date()) => fromDate(now);
export const addDays = (iso, n) => { const d = toDate(iso); d.setDate(d.getDate() + n); return fromDate(d); };
export const dm = iso => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export const dmy = iso => `${dm(iso)}/${iso.slice(0, 4)}`;
export const daysBetween = (a, b) => Math.round((toDate(b) - toDate(a)) / 864e5);
const WD = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
export const weekdayName = iso => WD[toDate(iso).getDay()];
export const timeHM = isoDateTime => { const d = new Date(isoDateTime); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
export const nowLocalISO = (now = new Date()) => `${fromDate(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

/** Weeks (Monday first) of a month; cells outside the month are null. */
export function monthGrid(year, month0) {
  const first = new Date(year, month0, 1, 12);
  const lead = (first.getDay() + 6) % 7;
  const days = new Date(year, month0 + 1, 0).getDate();
  const cells = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${year}-${pad(month0 + 1)}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  const out = [];
  for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
  return out;
}
