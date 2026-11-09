import { describe, it, expect, beforeEach } from 'vitest';
import colors from 'tailwindcss/colors';
import { applyThemeVariables, resolveThemeVariables, STATUS_FAMILIES } from '@/src/themes/engine';
import { defineTheme, SHADES } from '@/src/themes/types';

const theme = defineTheme({
  id: 'test',
  name: 'Test',
  dark: { neutral: colors.zinc, primary: colors.emerald, secondary: colors.green },
  light: { neutral: colors.zinc, primary: colors.emerald, overrides: { 'gray-950': '#ffffff' } },
});

describe('resolveThemeVariables', () => {
  it('maps the dark variant scales one to one', () => {
    const vars = resolveThemeVariables(theme, 'dark');
    for (const shade of SHADES) {
      expect(vars[`--color-gray-${shade}`]).toBe(colors.zinc[shade]);
      expect(vars[`--color-primary-${shade}`]).toBe(colors.emerald[shade]);
      expect(vars[`--color-secondary-${shade}`]).toBe(colors.green[shade]);
    }
  });

  it('leaves status colours alone in dark mode', () => {
    const vars = resolveThemeVariables(theme, 'dark');
    expect(vars['--color-red-400']).toBeUndefined();
    expect(Object.keys(vars)).toHaveLength(33);
  });

  it('flips the neutral scale end to end in light mode', () => {
    const vars = resolveThemeVariables(theme, 'light');
    expect(vars['--color-gray-50']).toBe(colors.zinc['950']);
    expect(vars['--color-gray-100']).toBe(colors.zinc['900']);
    expect(vars['--color-gray-500']).toBe(colors.zinc['500']);
    expect(vars['--color-gray-900']).toBe(colors.zinc['100']);
  });

  it('keeps solid accent shades and darkens accent text in light mode', () => {
    const vars = resolveThemeVariables(theme, 'light');
    expect(vars['--color-primary-600']).toBe(colors.emerald['600']);
    expect(vars['--color-primary-400']).toBe(colors.emerald['600']);
    expect(vars['--color-primary-300']).toBe(colors.emerald['700']);
    expect(vars['--color-primary-900']).toBe(colors.emerald['200']);
  });

  it('falls back to the primary scale when no secondary is given', () => {
    const vars = resolveThemeVariables(theme, 'light');
    expect(vars['--color-secondary-400']).toBe(vars['--color-primary-400']);
  });

  it('flips status palettes in light mode so log levels stay readable', () => {
    const vars = resolveThemeVariables(theme, 'light');
    expect(vars['--color-red-400']).toBe(colors.red['600']);
    expect(vars['--color-sky-900']).toBe(colors.sky['200']);
    expect(STATUS_FAMILIES.map(([name]) => name)).not.toContain('gray');
  });

  it('applies overrides last, with or without the --color- prefix', () => {
    const vars = resolveThemeVariables(theme, 'light');
    expect(vars['--color-gray-950']).toBe('#ffffff');
    const prefixed = resolveThemeVariables(
      { ...theme, dark: { ...theme.dark, overrides: { '--color-primary-500': 'red' } } },
      'dark',
    );
    expect(prefixed['--color-primary-500']).toBe('red');
  });
});

describe('applyThemeVariables', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
  });

  it('sets the variables, the mode and the colour scheme', () => {
    const root = document.documentElement;
    applyThemeVariables(root, { '--color-gray-950': 'rgb(1, 2, 3)' }, 'light');
    expect(root.style.getPropertyValue('--color-gray-950')).toBe('rgb(1, 2, 3)');
    expect(root.dataset.mode).toBe('light');
    expect(root.style.colorScheme).toBe('light');
  });

  it('removes colour variables the new theme does not set', () => {
    const root = document.documentElement;
    root.style.setProperty('--color-red-400', 'pink');
    root.style.setProperty('--font-sans', 'serif');
    applyThemeVariables(root, { '--color-gray-950': 'black' }, 'dark');
    expect(root.style.getPropertyValue('--color-red-400')).toBe('');
    expect(root.style.getPropertyValue('--font-sans')).toBe('serif');
  });
});
