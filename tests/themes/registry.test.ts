import { describe, it, expect } from 'vitest';
import { DEFAULT_THEME_ID, getTheme, themes } from '@/src/themes/registry';
import { SHADES } from '@/src/themes/types';

describe('theme registry', () => {
  it('picks up every preset, ordered', () => {
    expect(themes.map((t) => t.id).slice(0, 5)).toEqual(['blue', 'green', 'red', 'orange', 'pink']);
  });

  it('has unique ids', () => {
    const ids = themes.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(themes.map((t) => [t.id, t] as const))('%s has complete light and dark variants', (_id, theme) => {
    for (const variant of [theme.light, theme.dark]) {
      for (const scale of [variant.neutral, variant.primary, variant.secondary ?? variant.primary]) {
        for (const shade of SHADES) {
          expect(typeof scale[shade]).toBe('string');
        }
      }
    }
  });

  it('falls back to the default theme for unknown ids', () => {
    expect(getTheme('does-not-exist').id).toBe(DEFAULT_THEME_ID);
    expect(getTheme(null).id).toBe(DEFAULT_THEME_ID);
    expect(getTheme('blue').id).toBe('blue');
    expect(DEFAULT_THEME_ID).toBe('green');
  });
});
