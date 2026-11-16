import { describe, it, expect, beforeEach } from 'vitest';
import { getTheme, setTheme, nextTheme, onTheme } from '../src/lib/theme.js';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.head.innerHTML = '<meta name="theme-color" content="#F3F5F1" media="(prefers-color-scheme: light)">'
      + '<meta name="theme-color" content="#121715" media="(prefers-color-scheme: dark)">';
  });

  it('defaults to following the system', () => {
    expect(getTheme()).toBe('system');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('forces dark: saves it, sets data-theme and both status-bar colours', () => {
    setTheme('dark');
    expect(getTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    const colours = [...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content);
    expect(colours).toEqual(['#121715', '#121715']);
  });

  it('back to system clears the saved choice and restores per-scheme colours', () => {
    setTheme('light');
    setTheme('system');
    expect(localStorage.getItem('theme')).toBeNull();
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    const colours = [...document.querySelectorAll('meta[name="theme-color"]')].map(m => m.content);
    expect(colours).toEqual(['#F3F5F1', '#121715']);
  });

  it('ignores junk in storage and cycles system → light → dark → system', () => {
    localStorage.setItem('theme', 'purple');
    expect(getTheme()).toBe('system');
    expect(['system', 'light', 'dark'].map(nextTheme)).toEqual(['light', 'dark', 'system']);
  });

  it('tells subscribers about changes', () => {
    const seen = [];
    const off = onTheme(t => seen.push(t));
    setTheme('dark');
    off();
    setTheme('light');
    expect(seen).toEqual(['dark']);
  });
});
