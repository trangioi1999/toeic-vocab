import { describe, it, expect, beforeEach } from 'vitest';
import { MIGRATE_KEYS, encodeData, decodeData, collect, mergeInto } from '../src/lib/migrate.js';

beforeEach(() => { localStorage.clear(); });

describe('encode/decode', () => {
  it('round-trips Vietnamese text', () => {
    const data = { checkins: JSON.stringify({ '2026-11-16': { note: 'Part 7 khó quá, đoán 8 câu' } }) };
    expect(decodeData(encodeData(data))).toEqual(data);
  });
  it('produces a URL-safe code', () => {
    expect(encodeData({ status: JSON.stringify({ 'a:1': 2 }) })).toMatch(/^[A-Za-z0-9_-]+$/);
  });
  it('rejects garbage', () => {
    expect(() => decodeData('abc')).toThrow('Mã dữ liệu không hợp lệ');
    expect(() => decodeData('')).toThrow('Mã dữ liệu không hợp lệ');
  });
  it('rejects a truncated code', () => {
    const code = encodeData({ status: JSON.stringify({ 'a:1': 2, 'b:2': 1 }) });
    expect(() => decodeData(code.slice(0, code.length - 6))).toThrow('Mã dữ liệu không hợp lệ');
  });
  it('trims spaces and a pasted #d= prefix', () => {
    const data = { pref: '{"front":"vi"}' };
    expect(decodeData('  #d=' + encodeData(data) + '\n')).toEqual(data);
  });
});

describe('collect', () => {
  it('takes only the progress keys that exist', () => {
    localStorage.setItem('status', '{"a:1":2}');
    localStorage.setItem('auth-session', '{"uid":"x"}');
    expect(collect(localStorage)).toEqual({ status: '{"a:1":2}' });
    expect(MIGRATE_KEYS).toContain('toeic700-v3');
  });
});

describe('mergeInto', () => {
  it('never downgrades a known card', () => {
    localStorage.setItem('status', JSON.stringify({ 'a:1': 2 }));
    const r = mergeInto(localStorage, { status: JSON.stringify({ 'a:1': 1, 'b:2': 1 }) });
    expect(JSON.parse(localStorage.getItem('status'))).toEqual({ 'a:1': 2, 'b:2': 1 });
    expect(r.added).toBe(1);
  });
  it('upgrades a learning card to known', () => {
    localStorage.setItem('status', JSON.stringify({ 'a:1': 1 }));
    mergeInto(localStorage, { status: JSON.stringify({ 'a:1': 2 }) });
    expect(JSON.parse(localStorage.getItem('status'))).toEqual({ 'a:1': 2 });
  });
  it('keeps existing plan days and adds new ones', () => {
    localStorage.setItem('toeic700-v3', JSON.stringify({ '2026-11-16': { done: true } }));
    mergeInto(localStorage, { 'toeic700-v3': JSON.stringify({ '2026-11-16': { done: false }, '2026-11-17': { l: '300' } }) });
    expect(JSON.parse(localStorage.getItem('toeic700-v3'))).toEqual({ '2026-11-16': { done: true }, '2026-11-17': { l: '300' } });
  });
  it('unions the cards reviewed on the same day', () => {
    localStorage.setItem('activity', JSON.stringify({ '2026-11-16': ['a:1'] }));
    mergeInto(localStorage, { activity: JSON.stringify({ '2026-11-16': ['a:1', 'b:2'] }) });
    expect(JSON.parse(localStorage.getItem('activity'))).toEqual({ '2026-11-16': ['a:1', 'b:2'] });
  });
  it('unions the legacy known list', () => {
    localStorage.setItem('known', JSON.stringify(['x']));
    mergeInto(localStorage, { known: JSON.stringify(['x', 'y']) });
    expect(JSON.parse(localStorage.getItem('known'))).toEqual(['x', 'y']);
  });
  it('keeps present prefs and fills missing ones', () => {
    localStorage.setItem('pref', '{"front":"en"}');
    mergeInto(localStorage, { pref: '{"front":"vi"}', settings: '{"student":{"remind":true}}' });
    expect(localStorage.getItem('pref')).toBe('{"front":"en"}');
    expect(localStorage.getItem('settings')).toBe('{"student":{"remind":true}}');
  });
  it('ignores unknown keys and unreadable values without touching data', () => {
    localStorage.setItem('status', JSON.stringify({ 'a:1': 2 }));
    mergeInto(localStorage, { 'auth-session': '{"role":"coach"}', status: 'not json' });
    expect(localStorage.getItem('auth-session')).toBe(null);
    expect(JSON.parse(localStorage.getItem('status'))).toEqual({ 'a:1': 2 });
  });
});

describe('legacy known list', () => {
  it('folds known cards into status so they still count when status exists', () => {
    localStorage.setItem('status', JSON.stringify({ 'x:1': 1 }));
    mergeInto(localStorage, { known: JSON.stringify(['a:1', 'x:1']) });
    expect(JSON.parse(localStorage.getItem('status'))).toEqual({ 'x:1': 2, 'a:1': 2 });
  });
});

describe('same-day records', () => {
  it('keeps existing fields and adds the missing ones from the old site', () => {
    localStorage.setItem('toeic700-v3', JSON.stringify({ '2026-11-16': { tasks: [true, false, false] } }));
    mergeInto(localStorage, { 'toeic700-v3': JSON.stringify({ '2026-11-16': { tasks: [true, true, true], done: true, l: '340', r: '280' } }) });
    expect(JSON.parse(localStorage.getItem('toeic700-v3'))).toEqual({ '2026-11-16': { tasks: [true, false, false], done: true, l: '340', r: '280' } });
  });
});
