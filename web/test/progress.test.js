import { describe, it, expect } from 'vitest';
import { canComplete, streak, dayStatus, planStats, REQUIRED_CARDS } from '../src/lib/progress.js';
import { dayOf, DAYS, weeks } from '../src/lib/plan.js';

const ck = (...dates) => Object.fromEntries(dates.map(d => [d, { at: d + 'T21:00:00' }]));

describe('plan', () => {
  it('gives every day a title and groups weeks', () => {
    expect(dayOf('2026-11-17').title).toBe('Chữa Reading của TOEIC LR Collection 1 Test 2');
    expect(DAYS[0].title).toBe('Đề đầu vào: TOEIC LR Collection 1 Test 2');
    expect(weeks[0].days).toHaveLength(7);
  });
});

describe('canComplete', () => {
  const d16 = dayOf('2026-11-16');
  it('blocks a work day until its tasks are ticked', () => {
    expect(canComplete({ day: d16, planEntry: {}, cardsToday: 50 }).ok).toBe(false);
    expect(canComplete({ day: d16, planEntry: { tasks: [true, false, true] }, cardsToday: 0 }).ok).toBe(false);
    expect(canComplete({ day: d16, planEntry: { tasks: [true, true, true] }, cardsToday: 0 }).ok).toBe(true);
    expect(canComplete({ day: d16, planEntry: { done: true }, cardsToday: 0 }).ok).toBe(true);
  });
  it('needs 20 cards on review days', () => {
    const d = dayOf('2026-11-22');
    expect(REQUIRED_CARDS).toBe(20);
    expect(canComplete({ day: d, planEntry: {}, cardsToday: 19 }).ok).toBe(false);
    expect(canComplete({ day: d, planEntry: {}, cardsToday: 20 }).ok).toBe(true);
  });
  it('uses the card rule outside the plan and explains why', () => {
    const r = canComplete({ day: undefined, planEntry: undefined, cardsToday: 5 });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('Ôn thêm 15 thẻ nữa để hoàn thành');
  });
});

describe('streak', () => {
  it('counts consecutive days ending today', () => {
    expect(streak(ck('2026-11-16', '2026-11-17', '2026-11-18'), '2026-11-18')).toBe(3);
  });
  it('starts from yesterday while today is still open', () => {
    expect(streak(ck('2026-11-16', '2026-11-17', '2026-11-18'), '2026-11-19')).toBe(3);
  });
  it('skips plan rest days without a check-in', () => {
    // 2026-12-31..? find an off day in the plan
    const off = DAYS.find(d => d.kind === 'off');
    const prev = DAYS[DAYS.indexOf(off) - 1].date, next = DAYS[DAYS.indexOf(off) + 1].date;
    expect(streak(ck(prev, next), next)).toBe(2);
  });
  it('breaks on a missed work day', () => {
    expect(streak(ck('2026-11-16', '2026-11-18'), '2026-11-18')).toBe(1);
  });
  it('is zero without check-ins', () => {
    expect(streak({}, '2026-11-18')).toBe(0);
  });
});

describe('dayStatus', () => {
  it('marks a past work day without a check-in as missed', () => {
    expect(dayStatus('2026-11-16', { checkins: {}, today: '2026-11-18' })).toBe('missed');
  });
  it('marks today as pending until done', () => {
    expect(dayStatus('2026-11-18', { checkins: {}, today: '2026-11-18' })).toBe('pending');
    expect(dayStatus('2026-11-18', { checkins: ck('2026-11-18'), today: '2026-11-18' })).toBe('done');
  });
  it('marks past plan rest days and future days', () => {
    const off = DAYS.find(d => d.kind === 'off');
    expect(dayStatus(off.date, { checkins: {}, today: '2027-03-10' })).toBe('rest');
    expect(dayStatus('2026-11-20', { checkins: {}, today: '2026-11-18' })).toBe('future');
    expect(dayStatus('2026-11-10', { checkins: {}, today: '2026-11-18' })).toBe('none');
  });
  it('treats a past Sunday review without check-in as rest, not missed', () => {
    expect(dayStatus('2026-11-22', { checkins: {}, today: '2026-11-25' })).toBe('rest');
  });
});

describe('planStats', () => {
  it('counts done sessions and scores', () => {
    const s = planStats({ '2026-11-16': { done: true, l: '300', r: '245' }, '2026-11-17': { done: true } });
    expect(s.done).toBe(2);
    expect(s.testsDone).toBe(1);
    expect(s.best).toBe(545);
    expect(s.points).toEqual([{ date: '2026-11-16', v: 545 }]);
    expect(s.work).toBe(DAYS.filter(d => d.kind !== 'off').length);
  });
});
