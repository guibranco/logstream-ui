import { describe, it, expect } from 'vitest';
import { themes } from '@/src/themes/registry';
import { resolveThemeVariables } from '@/src/themes/engine';
import { contrast } from '@/src/themes/palette';

/**
 * Minimum WCAG contrast for every theme, both modes. 3:1 is the WCAG level for
 * UI components and large text, which the original themes already meet; body
 * text is held to 7:1.
 */
const cases = themes.flatMap((theme) =>
  (['dark', 'light'] as const).map((mode) => [`${theme.id} ${mode}`, resolveThemeVariables(theme, mode)] as const),
);

describe.each(cases)('%s', (_name, vars) => {
  const color = (name: string) => vars[`--color-${name}`];
  const page = color('gray-950');

  it('keeps white button text readable', () => {
    expect(contrast('#ffffff', color('primary-600'))).toBeGreaterThanOrEqual(3);
    expect(contrast('#ffffff', color('secondary-600'))).toBeGreaterThanOrEqual(3);
  });

  it('keeps accent text readable on the page', () => {
    expect(contrast(color('primary-400'), page)).toBeGreaterThanOrEqual(3);
    expect(contrast(color('secondary-400'), page)).toBeGreaterThanOrEqual(3);
  });

  it('keeps body and muted text readable on the page', () => {
    expect(contrast(color('gray-100'), page)).toBeGreaterThanOrEqual(7);
    expect(contrast(color('gray-500'), page)).toBeGreaterThanOrEqual(3);
  });
});
