// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { decide, localParts } from '../worker/decide.js';

const TZ = 'Asia/Ho_Chi_Minh';
// 2026-11-23 is a plan "test" (work) day; 2026-11-29 is a Sunday review day. Times are Vietnam time (UTC+7).
const at = (date, hm) => new Date(`${date}T${hm}:00+07:00`);
const users = [
  { uid: 'u1', role: 'student', name: 'Giỏi' },
  { uid: 'c1', role: 'coach', learnerUid: 'u1' },
];
const base = (over = {}) => ({ now: at('2026-11-23', '20:05'), tz: TZ, users, data: { u1: { checkins: {} } }, settings: {}, logs: {}, ...over });

describe('localParts', () => {
  it('converts to the configured time zone', () => {
    expect(localParts(new Date('2026-11-23T16:30:00Z'), TZ)).toEqual({ date: '2026-11-23', time: '23:30' });
    expect(localParts(new Date('2026-11-23T17:30:00Z'), TZ)).toEqual({ date: '2026-11-24', time: '00:30' });
  });
});

describe('learner reminder', () => {
  it('reminds after the default 20:00 when today has no check-in', () => {
    const out = decide(base());
    expect(out).toEqual([expect.objectContaining({ to: 'u1', kind: 'remind', url: '/today' })]);
  });
  it('waits until the reminder time', () => {
    expect(decide(base({ now: at('2026-11-23', '19:55') }))).toEqual([]);
  });
  it('uses the learner chosen time', () => {
    const settings = { u1: { student: { reminder: true, reminderTime: '21:30' } } };
    expect(decide(base({ settings }))).toEqual([]);
    expect(decide(base({ settings, now: at('2026-11-23', '21:31') }))).toHaveLength(1);
  });
  it('stays quiet when today is done, when switched off, or when already sent today', () => {
    expect(decide(base({ data: { u1: { checkins: { '2026-11-23': { at: 'x' } } } } }))).toEqual([]);
    expect(decide(base({ settings: { u1: { student: { reminder: false } } } }))).toEqual([]);
    expect(decide(base({ logs: { u1: { remind: '2026-11-23' } } }))).toEqual([]);
  });
  it('sends again the next day', () => {
    expect(decide(base({ now: at('2026-11-24', '20:10'), logs: { u1: { remind: '2026-11-23' } } }))).toHaveLength(1);
  });
});

describe('coach missed-day alert', () => {
  const late = at('2026-11-23', '23:05');
  const quietLearner = { u1: { student: { reminder: false } } };
  it('tells the coach at 23:00 when a work day has no check-in', () => {
    const out = decide(base({ now: late, settings: quietLearner }));
    expect(out).toEqual([expect.objectContaining({ to: 'c1', kind: 'missed', url: '/coach/day/2026-11-23' })]);
    expect(out[0].body).toContain('Giỏi');
  });
  it('not before 23:00, not on review days, not when done, not twice, not when switched off', () => {
    expect(decide(base({ now: at('2026-11-23', '22:55'), settings: quietLearner }))).toEqual([]);
    expect(decide(base({ now: at('2026-11-29', '23:05'), settings: quietLearner }))).toEqual([]);
    expect(decide(base({ now: late, settings: quietLearner, data: { u1: { checkins: { '2026-11-23': { at: 'x' } } } } }))).toEqual([]);
    expect(decide(base({ now: late, settings: quietLearner, logs: { c1: { missed: '2026-11-23' } } }))).toEqual([]);
    expect(decide(base({ now: late, settings: { ...quietLearner, c1: { coach: { notifyMissed: false } } } }))).toEqual([]);
  });
  it('ignores a coach whose learner is unknown', () => {
    const out = decide(base({ now: late, settings: quietLearner, users: [...users, { uid: 'c2', role: 'coach', learnerUid: 'zz' }] }));
    expect(out.map(o => o.to)).toEqual(['c1']);
  });
});
