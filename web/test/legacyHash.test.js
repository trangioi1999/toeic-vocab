import { describe, it, expect } from 'vitest';
import { legacyToPath, rewritePlanLinks } from '../src/lib/legacyHash.js';
import { DAYS } from '../src/lib/plan.js';

describe('legacyToPath', () => {
  it('maps old vocab hashes', () => {
    expect(legacyToPath('#set-516980414')).toBe('/vocab/set/516980414');
    expect(legacyToPath('#g-tu-vung-toeic')).toBe('/vocab/g/tu-vung-toeic');
  });
  it('maps the study4 sync payload to the plan page', () => {
    expect(legacyToPath('#s4=abc')).toBe('/plan?s4=abc');
  });
  it('maps hash-router links of the first React app', () => {
    expect(legacyToPath('#/plan')).toBe('/plan');
    expect(legacyToPath('#/')).toBe('/today');
    expect(legacyToPath('#/teacher/day/2026-12-01')).toBe('/coach/day/2026-12-01');
    expect(legacyToPath('#/teacher')).toBe('/coach');
  });
  it('leaves empty and in-page anchors alone', () => {
    expect(legacyToPath('')).toBe(null);
    expect(legacyToPath('#tinh-nang')).toBe(null);
    expect(legacyToPath('#d=abc')).toBe(null);
  });
});

describe('rewritePlanLinks', () => {
  it('turns links to the old vocab page into in-app links', () => {
    const html = rewritePlanLinks(DAYS[0].tasks[0]);
    expect(html).toContain('href="/vocab/set/516980414"');
    expect(html).not.toMatch(/href="\/vocab\/set\/516980414"[^>]*target="_blank"/);
  });
  it('keeps external study4 links opening in a new tab', () => {
    const html = rewritePlanLinks(DAYS[0].tasks[1]);
    expect(html).toContain('href="https://study4.com/tests/6853/');
    expect(html).toContain('target="_blank"');
  });
  it('rewrites group links', () => {
    expect(rewritePlanLinks('<a href="https://trangioi1999.github.io/toeic-vocab/#g-tu-vung-toeic" target="_blank" rel="noopener">Kho Từ</a>'))
      .toBe('<a href="/vocab/g/tu-vung-toeic" data-inapp="">Kho Từ</a>');
  });
});

describe('in-app plan links', () => {
  it('marks rewritten vocab links so the plan view can route them without a reload', () => {
    expect(rewritePlanLinks('<a href="https://trangioi1999.github.io/toeic-vocab/#set-516980414" target="_blank">Thẻ 1</a>'))
      .toBe('<a href="/vocab/set/516980414" data-inapp="">Thẻ 1</a>');
  });
});
