import { describe, it, expect } from 'vitest';
import { mergeStudy4, decodeS4, encodeS4 } from '../src/lib/study4.js';

describe('mergeStudy4', () => {
  const list = [
    { tid: 6853, rid: 1, full: false, l: 300, r: 300, parts: {} },
    { tid: 6853, rid: 2, full: true, l: 400, r: 350, parts: { 1: [5, 6] } },
  ];
  it('prefers the full test and fills the plan day', () => {
    const before = {};
    const res = mergeStudy4(before, list);
    expect(res.state['2026-11-16']).toEqual({ done: true, l: '400', r: '350', parts: { 1: [5, 6] } });
    expect(res.ok).toHaveLength(1);
    expect(res.firstDate).toBe('2026-11-16');
    expect(before).toEqual({});
  });
  it('skips tests that are not in the plan', () => {
    expect(mergeStudy4({}, [{ tid: 1, rid: 1, full: true, l: 1, r: 1, parts: {} }]).skip).toBe(1);
  });
  it('a newer part practice does not beat an older full test', () => {
    const res = mergeStudy4({}, [list[1], { ...list[0], rid: 9 }]);
    expect(res.state['2026-11-16'].l).toBe('400');
  });
});

describe('decodeS4', () => {
  it('round-trips unicode payloads and rejects junk', () => {
    const p = encodeS4([{ tid: 1, note: 'Đề' }]);
    expect(decodeS4(p)).toEqual([{ tid: 1, note: 'Đề' }]);
    expect(decodeS4('%%%')).toBe(null);
  });
});
