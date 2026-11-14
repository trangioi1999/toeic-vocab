import { describe, it, expect } from 'vitest';
import { legacyToRoute, rewritePlanLinks } from '../src/lib/legacyHash.js';
import { DAYS } from '../src/lib/plan.js';

describe('legacyToRoute', () => {
  it('maps old vocab hashes', () => {
    expect(legacyToRoute('#set-516980414')).toBe('/vocab/set/516980414');
    expect(legacyToRoute('#g-tu-vung-toeic')).toBe('/vocab/g/tu-vung-toeic');
  });
  it('maps the study4 sync payload to the plan page', () => {
    expect(legacyToRoute('#s4=abc')).toBe('/plan?s4=abc');
  });
  it('leaves router hashes and empty hashes alone', () => {
    expect(legacyToRoute('#/plan')).toBe(null);
    expect(legacyToRoute('')).toBe(null);
  });
});

describe('rewritePlanLinks', () => {
  it('turns links to the old vocab page into in-app links', () => {
    const html = rewritePlanLinks(DAYS[0].tasks[0]);
    expect(html).toContain('href="#/vocab/set/516980414"');
    expect(html).not.toMatch(/href="#\/vocab\/set\/516980414"[^>]*target="_blank"/);
  });
  it('keeps external study4 links opening in a new tab', () => {
    const html = rewritePlanLinks(DAYS[0].tasks[1]);
    expect(html).toContain('href="https://study4.com/tests/6853/');
    expect(html).toContain('target="_blank"');
  });
  it('rewrites group links', () => {
    expect(rewritePlanLinks('<a href="https://trangioi1999.github.io/toeic-vocab/#g-tu-vung-toeic" target="_blank" rel="noopener">Kho Từ</a>'))
      .toBe('<a href="#/vocab/g/tu-vung-toeic">Kho Từ</a>');
  });
});
