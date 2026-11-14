import { describe, it, expect } from 'vitest';
import days from '../src/data/plan-days.json';

describe('plan-days.json', () => {
  it('has the 112 plan days starting with the entry test', () => {
    expect(days).toHaveLength(112);
    expect(days[0].date).toBe('2026-11-16');
    expect(days[0].kind).toBe('test');
    expect(days[0].tid).toBe(6853);
  });
});
