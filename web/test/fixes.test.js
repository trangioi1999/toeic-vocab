import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { login, logout } from '../src/services/auth.js';
import * as store from '../src/services/store.js';
import { ticksOf, tasksDone } from '../src/lib/progress.js';
import { dayOf, cleanScore } from '../src/lib/plan.js';
import { useToday } from '../src/hooks/useToday.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(async () => { localStorage.clear(); await logout(); await login('hocvien@demo.vn', '123456'); });

describe('done wins over a partial tasks list', () => {
  const d16 = dayOf('2026-11-16');
  it('ticksOf shows every task ticked when the day is done', () => {
    expect(ticksOf(d16, { tasks: [true, false, false], done: true })).toEqual([true, true, true]);
    expect(ticksOf(d16, { tasks: [true, false, false] })).toEqual([true, false, false]);
    expect(tasksDone(d16, { tasks: [true, false, false], done: true })).toBe(3);
  });
  it('ticking a task on a done day keeps it done', () => {
    localStorage.setItem('toeic700-v3', JSON.stringify({ '2026-11-16': { tasks: [true, false, false], done: true } }));
    store.setPlanTask('2026-11-16', 1, true);
    expect(store.getPlanState()['2026-11-16']).toMatchObject({ tasks: [true, true, true], done: true });
  });
  it('unticking a task on a done day reopens only that task', () => {
    localStorage.setItem('toeic700-v3', JSON.stringify({ '2026-11-16': { tasks: [true, false, false], done: true } }));
    store.setPlanTask('2026-11-16', 1, false);
    expect(store.getPlanState()['2026-11-16']).toMatchObject({ tasks: [true, false, true], done: false });
  });
});

describe('cleanScore', () => {
  it('keeps digits and caps each section at 495', () => {
    expect(cleanScore('999')).toBe('495');
    expect(cleanScore('a3b2')).toBe('32');
    expect(cleanScore('')).toBe('');
    expect(cleanScore('4950')).toBe('495');
  });
});

describe('prefs are student-only', () => {
  it('teacher cannot change the shared study prefs', async () => {
    await logout(); await login('co@demo.vn', '123456');
    expect(() => store.setPrefs({ front: 'vi' })).toThrow('Tài khoản cô giáo chỉ được xem');
  });
});

describe('useToday', () => {
  afterEach(() => vi.useRealTimers());
  it('rolls over to the new day at local midnight without a reload', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16, 23, 59, 0));
    const el = document.createElement('div');
    const root = createRoot(el);
    const Show = () => useToday();
    act(() => root.render(createElement(Show)));
    expect(el.textContent).toBe('2026-11-16');
    act(() => { vi.advanceTimersByTime(3 * 60 * 1000); });
    expect(el.textContent).toBe('2026-11-17');
    act(() => root.unmount());
  });
  it('refreshes when the app comes back to the foreground', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 16, 10, 0, 0));
    const el = document.createElement('div');
    const root = createRoot(el);
    const Show = () => useToday();
    act(() => root.render(createElement(Show)));
    vi.setSystemTime(new Date(2026, 10, 18, 7, 0, 0)); // device slept, timers didn't fire
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(el.textContent).toBe('2026-11-18');
    act(() => root.unmount());
  });
});
