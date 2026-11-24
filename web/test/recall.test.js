import { describe, it, expect } from 'vitest';
import { setsOf, recallFor, recallNeeded, recallPassed, bestRecall } from '../src/lib/recall.js';
import { canComplete } from '../src/lib/progress.js';
import { dayOf } from '../src/lib/plan.js';

describe('recallFor', () => {
  it('reads the sets a day assigns from its task links', () => {
    expect(setsOf(dayOf('2026-11-23'))).toEqual([{ id: '516980414', name: 'Thẻ 1' }, { id: '516981110', name: 'Thẻ 2' }]);
    expect(setsOf(dayOf('2026-11-29'))).toEqual([]);
  });
  it('checks the previous study day, nothing on the first day or on Sunday', () => {
    expect(recallFor('2026-11-23')).toBeNull();
    expect(recallFor('2026-11-24')).toEqual({ from: '2026-11-23', sets: setsOf(dayOf('2026-11-23')) });
    expect(recallFor('2026-11-29')).toBeNull();
    expect(recallFor('2026-11-30').from).toBe('2026-11-28');
    expect(recallFor('2020-01-01')).toBeNull();
  });
});

describe('recall score', () => {
  it('passes at 80%', () => {
    expect(recallNeeded(40)).toBe(32);
    expect(recallNeeded(39)).toBe(32);
    expect(recallPassed({ right: 31, total: 40 })).toBe(false);
    expect(recallPassed({ right: 32, total: 40 })).toBe(true);
    expect(recallPassed({ right: 0, total: 0 })).toBe(false);
    expect(recallPassed(undefined)).toBe(false);
  });
  it('keeps the best attempt and counts tries', () => {
    const a = bestRecall(undefined, { right: 30, total: 40 });
    expect(a).toEqual({ right: 30, total: 40, tries: 1 });
    const b = bestRecall(a, { right: 20, total: 40 });
    expect(b).toEqual({ right: 30, total: 40, tries: 2 });
    expect(bestRecall(b, { right: 35, total: 40 })).toEqual({ right: 35, total: 40, tries: 3 });
  });
});

describe('canComplete with a recall due', () => {
  const d = dayOf('2026-11-24');
  const all = { tasks: d.tasks.map(() => true) };
  it('needs a passed check on top of the ticked tasks', () => {
    const r = canComplete({ day: d, planEntry: all, cardsToday: 0 });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/bài cũ/);
    expect(canComplete({ day: d, planEntry: { ...all, recall: { right: 20, total: 40 } } }).ok).toBe(false);
    expect(canComplete({ day: d, planEntry: { ...all, recall: { right: 36, total: 40 } } }).ok).toBe(true);
    expect(canComplete({ day: d, planEntry: { recall: { right: 36, total: 40 } } }).ok).toBe(false);
  });
});
