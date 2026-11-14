import RAW from '../data/plan-days.json';

export const KIND = { test: 'Làm đề', fixr: 'Chữa Reading', fixl: 'Chữa Listening', review: 'Ôn tập', off: 'Nghỉ' };
export const DOW = { T2: 'Thứ 2', T3: 'Thứ 3', T4: 'Thứ 4', T5: 'Thứ 5', T6: 'Thứ 6', T7: 'Thứ 7', CN: 'Chủ nhật' };
export const PARTS = { 1: [1, 6], 2: [7, 31], 3: [32, 70], 4: [71, 100], 5: [101, 130], 6: [131, 146], 7: [147, 200] };

function titleOf(d) {
  if (d.kind === 'test') return (d.note === 'Điểm đầu vào' ? 'Đề đầu vào: ' : 'Làm đề ') + d.test;
  if (d.kind === 'fixr') return 'Chữa Reading của ' + d.test;
  if (d.kind === 'fixl') return 'Chữa Listening của ' + d.test;
  if (d.kind === 'review') return d.date === '2027-01-31' ? 'Tổng kết trước Tết' : d.note === 'Giảm tải' ? 'Ôn nhẹ trước ngày thi' : 'Chủ nhật: ôn từ vựng và sổ lỗi sai';
  return d.phase === 'Nghỉ Tết' ? 'Nghỉ Tết' : (d.note || 'Nghỉ ngơi');
}

export const DAYS = RAW.map(d => ({ ...d, title: titleOf(d) }));
const BY_DATE = new Map(DAYS.map(d => [d.date, d]));
export const dayOf = iso => BY_DATE.get(iso);
export const testDay = tid => DAYS.find(d => d.kind === 'test' && d.tid === tid);
export const PLAN_START = DAYS[0].date;
export const PLAN_END = DAYS[DAYS.length - 1].date;

export const weeks = [];
for (const d of DAYS) {
  const key = String(d.week);
  let w = weeks.find(x => x.key === key);
  if (!w) weeks.push(w = { key, days: [] });
  w.days.push(d);
}
export const weekName = w => (w.key === 'Tết' ? 'Nghỉ Tết' : 'Tuần ' + w.key);
export const weekIndexOf = iso => Math.max(0, weeks.findIndex(w => w.days.some(d => d.date === iso)));
export function currentWeekIndex(today) {
  if (today < PLAN_START) return 0;
  const i = weeks.findIndex(w => w.days.some(d => d.date >= today));
  return i < 0 ? weeks.length - 1 : i;
}
/** Digits only, at most 495 (max per Listening/Reading section). */
export const cleanScore = v => { const d = String(v || '').replace(/\D/g, '').slice(0, 3); return d === '' ? '' : String(Math.min(495, +d)); };
/** Short label used in tight places: "Collection 1 Test 6". */
export const shortTest = t => String(t || '').replace(/^TOEIC LR /, '');
