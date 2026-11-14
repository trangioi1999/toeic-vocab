import { describe, it, expect } from 'vitest';
import { todayISO, addDays, dm, monthGrid } from '../src/lib/dates.js';

describe('dates', () => {
  it('todayISO uses the local calendar day just after midnight', () => {
    expect(todayISO(new Date(2026, 10, 15, 0, 30))).toBe('2026-11-15');
  });
  it('addDays crosses year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('dm formats DD/MM', () => {
    expect(dm('2026-11-05')).toBe('05/11');
  });
  it('monthGrid starts weeks on Monday with null padding', () => {
    const g = monthGrid(2026, 10);
    expect(g[0]).toHaveLength(7);
    expect(g[0].slice(0, 6)).toEqual([null, null, null, null, null, null]);
    expect(g[0][6]).toBe('2026-11-01');
    expect(g.flat().filter(Boolean)).toHaveLength(30);
    g.forEach(w => expect(w).toHaveLength(7));
  });
});
