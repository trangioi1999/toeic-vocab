import { describe, it, expect } from 'vitest';
import { normalizeRole, homeOf, safeNext } from '../src/lib/roles.js';

describe('roles', () => {
  it('reads the old stored role "teacher" as coach', () => {
    expect(normalizeRole('teacher')).toBe('coach');
    expect(normalizeRole('coach')).toBe('coach');
    expect(normalizeRole('student')).toBe('student');
  });
  it('rejects unknown roles', () => {
    expect(normalizeRole('x')).toBe(null);
    expect(normalizeRole(undefined)).toBe(null);
  });
  it('sends each role to its own home', () => {
    expect(homeOf('student')).toBe('/today');
    expect(homeOf('coach')).toBe('/coach');
  });
});

describe('safeNext', () => {
  it('keeps a page inside the role area', () => {
    expect(safeNext('/vocab/set/a', 'student')).toBe('/vocab/set/a');
    expect(safeNext('/coach/day/2026-12-01', 'coach')).toBe('/coach/day/2026-12-01');
    expect(safeNext('/today?x=1', 'student')).toBe('/today?x=1');
  });
  it('ignores the other role area', () => {
    expect(safeNext('/coach/day/2026-12-01', 'student')).toBe('/today');
    expect(safeNext('/vocab', 'coach')).toBe('/coach');
  });
  it('ignores the landing, auth and import pages', () => {
    expect(safeNext('/login', 'coach')).toBe('/coach');
    expect(safeNext('/signup', 'student')).toBe('/today');
    expect(safeNext('/', 'student')).toBe('/today');
    expect(safeNext('/import', 'student')).toBe('/today');
  });
  it('ignores missing and off-site targets', () => {
    expect(safeNext(null, 'student')).toBe('/today');
    expect(safeNext('//evil.com', 'student')).toBe('/today');
    expect(safeNext('https://evil.com', 'student')).toBe('/today');
  });
});
