import { describe, it, expect, beforeEach, vi } from 'vitest';
import { login, logout } from '../src/services/auth.js';
import * as store from '../src/services/store.js';
import { todayISO } from '../src/lib/dates.js';

beforeEach(async () => { localStorage.clear(); await logout(); await login('hocvien@demo.vn', '123456'); });

describe('card status', () => {
  it('reads the legacy "known" list when "status" is missing', () => {
    localStorage.setItem('known', JSON.stringify(['1:0']));
    expect(store.getCardStatus()['1:0']).toBe(2);
  });
  it('writes the old status format and counts unique cards reviewed today', () => {
    store.setCardStatus('5:3', 1);
    expect(JSON.parse(localStorage.getItem('status'))).toEqual({ '5:3': 1 });
    expect(store.cardsReviewed(todayISO())).toBe(1);
    store.setCardStatus('5:3', 2);
    expect(store.cardsReviewed(todayISO())).toBe(1);
    store.setCardStatus('5:3', 0);
    expect(JSON.parse(localStorage.getItem('status'))).toEqual({});
  });
});

describe('teacher is read-only', () => {
  it('refuses student writes but allows own settings', async () => {
    await logout(); await login('co@demo.vn', '123456');
    expect(() => store.setCardStatus('1:1', 2)).toThrow('Tài khoản cô giáo chỉ được xem');
    expect(() => store.setPlanTask('2026-11-16', 0, true)).toThrow('Tài khoản cô giáo chỉ được xem');
    expect(() => store.completeDay(todayISO(), {})).toThrow('Tài khoản cô giáo chỉ được xem');
    store.setSettings('teacher', { notifyMissed: false });
    expect(store.getSettings('teacher')).toEqual({ notifyDone: true, notifyMissed: false });
  });
  it('students cannot change teacher settings', () => {
    expect(() => store.setSettings('teacher', { notifyDone: false })).toThrow();
  });
});

describe('plan', () => {
  it('ticking every task marks the day done, unticking one reopens it', () => {
    [0, 1, 2].forEach(i => store.setPlanTask('2026-11-16', i, true));
    expect(store.getPlanState()['2026-11-16'].done).toBe(true);
    store.setPlanTask('2026-11-16', 1, false);
    expect(store.getPlanState()['2026-11-16'].done).toBe(false);
    expect(JSON.parse(localStorage.getItem('toeic700-v3'))['2026-11-16'].tasks).toEqual([true, false, true]);
  });
  it('setting done from the old checkbox ticks all tasks', () => {
    store.setPlanEntry('2026-11-17', { done: true });
    expect(store.getPlanState()['2026-11-17'].tasks).toEqual([true, true, true, true, true]);
  });
});

describe('check-ins', () => {
  it('refuses to complete a day that is not finished', () => {
    expect(() => store.completeDay('2026-11-16', {})).toThrow('Còn 3 việc trong lộ trình hôm nay');
  });
  it('records the check-in with cards and note, and can undo it', () => {
    [0, 1, 2].forEach(i => store.setPlanTask('2026-11-16', i, true));
    const c = store.completeDay('2026-11-16', { note: ' Part 7 khó ' });
    expect(c).toMatchObject({ note: 'Part 7 khó', cards: 0, planTitle: 'Đề đầu vào: TOEIC LR Collection 1 Test 2' });
    expect(store.getCheckins()['2026-11-16']).toBeTruthy();
    store.undoCheckin('2026-11-16');
    expect(store.getCheckins()['2026-11-16']).toBeUndefined();
  });
});

describe('subscribe', () => {
  it('notifies on writes and on storage events from other tabs', () => {
    const cb = vi.fn();
    const off = store.subscribe(cb);
    store.setPrefs({ front: 'vi' });
    window.dispatchEvent(new StorageEvent('storage', { key: 'status' }));
    off();
    expect(cb).toHaveBeenCalledTimes(2);
    expect(store.getPrefs().front).toBe('vi');
  });
  it('returns the same snapshot object until something changes', () => {
    const a = store.getCardStatus();
    expect(store.getCardStatus()).toBe(a);
    store.setCardStatus('9:9', 1);
    expect(store.getCardStatus()).not.toBe(a);
  });
});

describe('settings snapshot', () => {
  it('returns the same settings object until settings change', () => {
    const a = store.getSettings('student');
    expect(store.getSettings('student')).toBe(a);
    store.setSettings('student', { reminderTime: '21:00' });
    const b = store.getSettings('student');
    expect(b).not.toBe(a);
    expect(b.reminderTime).toBe('21:00');
  });
});
