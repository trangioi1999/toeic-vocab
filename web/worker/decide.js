/*
 * Which pushes the 10-minute cron should send now. Pure: the Worker loads users/data/settings/logs from
 * Firestore and records each sent kind+date in notifyLog so a reminder goes out at most once a day.
 */
import { dayOf } from '../src/lib/plan.js';
import { isWorkDay } from '../src/lib/progress.js';
import { normalizeRole } from '../src/lib/roles.js';

const MISSED_AT = '23:00';

export function localParts(now, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

const hm = v => (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v) ? v : null);

/**
 * @param {{ now: Date, tz: string, users: {uid, role, learnerUid?, name?}[],
 *   data: Record<learnerUid, { checkins: object }>, settings: Record<uid, object>, logs: Record<uid, {remind?, missed?}> }} input
 * @returns {{ to, kind: 'remind'|'missed', title, body, url }[]}
 */
export function decide({ now, tz, users, data, settings, logs }) {
  const { date, time } = localParts(now, tz);
  const day = dayOf(date);
  const out = [];
  const people = users.map(u => ({ ...u, role: normalizeRole(u.role) }));
  const done = uid => !!((data[uid] || {}).checkins || {})[date];

  for (const u of people.filter(x => x.role === 'student')) {
    const s = { reminder: true, reminderTime: '20:00', ...((settings[u.uid] || {}).student || {}) };
    if (s.reminder === false || done(u.uid) || (logs[u.uid] || {}).remind === date) continue;
    if (time < (hm(s.reminderTime) || '20:00')) continue;
    out.push({
      to: u.uid, kind: 'remind', url: '/today',
      title: 'Đến giờ học rồi',
      body: day && day.kind !== 'off' ? `Hôm nay: ${day.title}. Xong nhớ bấm Hoàn thành nhé.` : 'Ôn 20 thẻ để giữ chuỗi ngày học nhé.',
    });
  }

  if (time >= MISSED_AT && isWorkDay(day)) {
    for (const c of people.filter(x => x.role === 'coach')) {
      const learner = people.find(x => x.uid === c.learnerUid && x.role === 'student');
      if (!learner || done(learner.uid)) continue;
      const s = { notifyMissed: true, ...((settings[c.uid] || {}).coach || {}) };
      if (s.notifyMissed === false || (logs[c.uid] || {}).missed === date) continue;
      out.push({
        to: c.uid, kind: 'missed', url: `/coach/day/${date}`,
        title: 'Hôm nay chưa học',
        body: `${learner.name || 'Người học'} chưa hoàn thành: ${day.title}.`,
      });
    }
  }
  return out;
}
