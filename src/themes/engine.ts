import colors from 'tailwindcss/colors';
import { ColorMode, ColorScale, SHADES, Shade, ThemeDefinition } from './types';

/** CSS custom property → value, e.g. `{ '--color-gray-950': 'oklch(…)' }`. */
export type ThemeVariables = Record<string, string>;

/**
 * Light variants flip the neutral scale end to end: the darkest surface the
 * components ask for (`gray-950`) becomes the lightest, and light text (`gray-100`)
 * becomes dark.
 */
const NEUTRAL_LIGHT: Record<Shade, Shade> = {
  '50': '950',
  '100': '900',
  '200': '800',
  '300': '700',
  '400': '600',
  '500': '500',
  '600': '400',
  '700': '300',
  '800': '200',
  '900': '100',
  '950': '50',
};

/**
 * Light variants flip accent and status colours around the middle but keep
 * 500–700, so solid buttons (`bg-primary-600 text-white`) look the same in both
 * modes while text (`-300`/`-400`) and tinted backgrounds (`-900/30`) stay readable.
 */
const CHROMATIC_LIGHT: Record<Shade, Shade> = {
  '50': '950',
  '100': '900',
  '200': '800',
  '300': '700',
  '400': '600',
  '500': '500',
  '600': '600',
  '700': '700',
  '800': '300',
  '900': '200',
  '950': '100',
};

const NEUTRAL_FAMILIES = new Set(['slate', 'gray', 'zinc', 'neutral', 'stone', 'mauve', 'olive', 'mist', 'taupe']);

/** Tailwind's chromatic palettes (red, amber, green, sky…), used for statuses and log levels. */
export const STATUS_FAMILIES: ReadonlyArray<[string, ColorScale]> = Object.entries(colors)
  .filter(([name, value]) => typeof value === 'object' && value !== null && !NEUTRAL_FAMILIES.has(name))
  .map(([name, value]) => [name, value as ColorScale]);

function mapScale(
  target: ThemeVariables,
  name: string,
  scale: ColorScale,
  mapping: Record<Shade, Shade> | null,
): void {
  for (const shade of SHADES) {
    target[`--color-${name}-${shade}`] = scale[mapping ? mapping[shade] : shade];
  }
}

/** Every CSS variable a theme variant sets, ready to put on `<html>`. */
export function resolveThemeVariables(theme: ThemeDefinition, mode: ColorMode): ThemeVariables {
  const variant = theme[mode];
  const light = mode === 'light';
  const vars: ThemeVariables = {};

  mapScale(vars, 'gray', variant.neutral, light ? NEUTRAL_LIGHT : null);
  mapScale(vars, 'primary', variant.primary, light ? CHROMATIC_LIGHT : null);
  mapScale(vars, 'secondary', variant.secondary ?? variant.primary, light ? CHROMATIC_LIGHT : null);

  if (light) {
    for (const [name, scale] of STATUS_FAMILIES) {
      mapScale(vars, name, scale, CHROMATIC_LIGHT);
    }
  }

  for (const [name, value] of Object.entries(variant.overrides ?? {})) {
    vars[`--color-${name.replace(/^--color-/, '')}`] = value;
  }

  return vars;
}

/**
 * Puts a resolved theme on an element (normally `document.documentElement`),
 * removing colour variables a previous theme (or the first-paint script in
 * `index.html`) set and this one does not.
 */
export function applyThemeVariables(root: HTMLElement, vars: ThemeVariables, mode: ColorMode): void {
  const stale: string[] = [];
  for (let i = 0; i < root.style.length; i++) {
    const name = root.style.item(i);
    if (name.startsWith('--color-') && !(name in vars)) stale.push(name);
  }
  for (const name of stale) {
    root.style.removeProperty(name);
  }
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }

  root.dataset.mode = mode;
  root.style.colorScheme = mode;
}
