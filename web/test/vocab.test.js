import { describe, it, expect } from 'vitest';
import { prepare, sortKey, enVi, counts, norm, searchItems } from '../src/lib/vocab.js';

const sample = [
  { id: 1, title: 'Thẻ 10', cards: [['apple', 'quả táo']] },
  { id: 2, title: 'Thẻ 2', cards: [['quả chuối', 'banana'], ['grape', 'nho', 'ɡreɪp']] },
  { id: 3, title: 'ETS 2020 TEST 1', cards: [['invoice', 'hoá đơn']] },
  { id: 4, title: 'Empty', cards: [] },
];

describe('prepare', () => {
  const v = prepare(sample);
  it('drops empty sets and assigns groups', () => {
    expect(v.sets).toHaveLength(3);
    expect(v.setMap.get('2').group.id).toBe('tu-vung-toeic');
    expect(v.setMap.get('3').group.id).toBe('ets');
    expect(v.setMap.get('3').group.sub('ETS 2020 TEST 1')).toBe('ETS 2020');
  });
  it('orders "Thẻ 2" before "Thẻ 10"', () => {
    expect(v.groups.get('tu-vung-toeic').sets.map(s => s.title)).toEqual(['Thẻ 2', 'Thẻ 10']);
    expect(sortKey('Thẻ 2') < sortKey('Thẻ 10')).toBe(true);
  });
  it('keys items as setId:index like the old page', () => {
    expect(v.setMap.get('2').items[1].key).toBe('2:1');
    expect(v.all).toHaveLength(4);
  });
});

describe('helpers', () => {
  const v = prepare(sample);
  it('enVi swaps a Vietnamese-first card', () => {
    expect(enVi(v.setMap.get('2').items[0])).toEqual(['banana', 'quả chuối']);
  });
  it('counts by status', () => {
    expect(counts(v.all, { '1:0': 2, '2:1': 1 })).toEqual([2, 1, 1]);
  });
  it('norm ignores accents, case and parentheses', () => {
    expect(norm('Hoá Đơn (n)')).toBe('hoa don');
  });
  it('searchItems matches either side without accents', () => {
    expect(searchItems(v.all, 'hoa don').map(i => i.key)).toEqual(['3:0']);
    expect(searchItems(v.all, '   ')).toEqual([]);
  });
});
