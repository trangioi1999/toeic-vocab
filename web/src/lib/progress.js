import { DAYS, dayOf, PLAN_START } from './plan.js';
import { addDays } from './dates.js';

export const REQUIRED_CARDS = 20;
export const isWorkDay = day => !!day && (day.kind === 'test' || day.kind === 'fixr' || day.kind === 'fixl');
/** Days that are allowed to pass without a check-in (Sunday review is optional, rest days are rest). */
const isOptionalDay = day => !!day && (day.kind === 'off' || day.kind === 'review');

/** Per-task ticks; a day marked done counts every task as ticked (study4 import and the old "Xong" box set only done). */
export function ticksOf(day, planEntry) {
  if (!day) return [];
  const e = planEntry || {};
  return day.tasks.map((_, i) => !!(e.done || (e.tasks && e.tasks[i])));
}
export const tasksDone = (day, planEntry) => ticksOf(day, planEntry).filter(Boolean).length;

export function canComplete({ day, planEntry, cardsToday }) {
  if (isWorkDay(day)) {
    const left = day.tasks.length - tasksDone(day, planEntry);
    return left <= 0 ? { ok: true, reason: '' } : { ok: false, reason: `Còn ${left} việc trong lộ trình hôm nay` };
  }
  const left = REQUIRED_CARDS - (cardsToday || 0);
  return left <= 0 ? { ok: true, reason: '' } : { ok: false, reason: `Ôn thêm ${left} thẻ nữa để hoàn thành` };
}

export function streak(checkins, today) {
  let d = checkins[today] ? today : addDays(today, -1);
  let n = 0;
  for (let guard = 0; guard < 2000; guard++) {
    if (checkins[d]) n++;
    else if (!isOptionalDay(dayOf(d))) break;
    d = addDays(d, -1);
    if (d < PLAN_START && !checkins[d]) break;
  }
  return n;
}

export function dayStatus(iso, { checkins, today }) {
  if (checkins[iso]) return 'done';
  if (iso === today) return 'pending';
  if (iso > today) return 'future';
  const day = dayOf(iso);
  if (!day) return 'none';
  return isOptionalDay(day) ? 'rest' : 'missed';
}

export function planStats(planState) {
  const st = d => planState[d.date] || {};
  const work = DAYS.filter(d => d.kind !== 'off');
  const tests = DAYS.filter(d => d.kind === 'test');
  const points = tests
    .map(d => { const s = st(d); return (+s.l > 0 && +s.r > 0) ? { date: d.date, v: +s.l + +s.r } : null; })
    .filter(Boolean);
  return {
    done: work.filter(d => st(d).done).length,
    work: work.length,
    tests: tests.length,
    testsDone: tests.filter(d => st(d).done).length,
    best: points.length ? Math.max(...points.map(p => p.v)) : null,
    points,
  };
}
