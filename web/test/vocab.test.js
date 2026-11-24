import { describe, it, expect, vi } from 'vitest';
import { prepare, sortKey, enVi, counts, norm, searchItems } from '../src/lib/vocab.js';
import { niceTitle } from '../src/lib/vocab.js';

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

describe('example sentences', () => {
  it('attaches the example to every card of the same term, whatever its case or spacing', async () => {
    const { prepare: prep, exampleKey } = await import('../src/lib/vocab.js');
    const raw = [{ id: 1, title: 'TỪ VỰNG TOEIC - THẺ 1', cards: [['Invoice', 'hoá đơn', 'x'], ['Key  factor', 'yếu tố chính']] }, { id: 2, title: 'ETS 2020 TEST 1', cards: [['invoice', 'hoá đơn']] }];
    const ex = { [exampleKey('invoice')]: ['Please send the invoice by Friday.', 'Vui lòng gửi hoá đơn trước thứ Sáu.'] };
    const d = prep(raw, ex);
    expect(d.itemMap.get('1:0').ex).toEqual(ex.invoice);
    expect(d.itemMap.get('2:0').ex).toEqual(ex.invoice);
    expect(d.itemMap.get('1:1').ex).toBe(undefined);
    expect(exampleKey('  Key  Factor ')).toBe('key factor');
  });
  it('marks the term inside the sentence', async () => {
    const { markTerm } = await import('../src/lib/vocab.js');
    expect(markTerm('Please send the invoice by Friday.', 'Invoice')).toEqual(['Please send the ', 'invoice', ' by Friday.']);
    expect(markTerm('She was able to finish early.', 'Be able to')).toEqual(['She was ', 'able to', ' finish early.']);
    expect(markTerm('The new system enables staff to work from home.', 'Enable sb to Vo')).toEqual(['The new system ', 'enables', ' staff to work from home.']);
    expect(markTerm('We face many problems.', 'Face = encounter')).toEqual(['We ', 'face', ' many problems.']);
    expect(markTerm('Nothing here matches.', 'Invoice')).toEqual(['Nothing here matches.']);
  });
  it('loads the examples with the word list and keeps working without them', async () => {
    vi.resetModules();
    const calls = [];
    vi.stubGlobal('fetch', async url => {
      calls.push(url);
      if (url === '/examples.json') return { ok: false, status: 404 };
      return { ok: true, json: async () => [{ id: 1, title: 'TỪ VỰNG TOEIC - THẺ 1', cards: [['Invoice', 'hoá đơn']] }] };
    });
    const { loadVocab } = await import('../src/lib/vocab.js');
    const d = await loadVocab();
    expect(calls.sort()).toEqual(['/examples.json', '/vocab.json']);
    expect(d.all).toHaveLength(1);
    vi.unstubAllGlobals();
  });
});

describe('niceTitle', () => {
  it('turns typed capitals into sentence case and keeps acronyms', () => {
    expect(niceTitle('TỪ VỰNG TOEIC - THẺ 1')).toBe('Từ vựng TOEIC, Thẻ 1');
    expect(niceTitle('TỪ VỰNG TOEIC - THẺ 5 (bản 2)')).toBe('Từ vựng TOEIC, Thẻ 5 (bản 2)');
    expect(niceTitle('ETS2024-TEST4-P7.3')).toBe('ETS2024, Test4, P7.3');
    expect(niceTitle('ECONOMY -TEST 4- LISTENING - THẺ 2 (cuối)')).toBe('Economy, Test 4, Listening, Thẻ 2 (cuối)');
    expect(niceTitle('Lesson 1: Basic Nouns part 1')).toBe('Lesson 1: Basic Nouns part 1');
  });
});
