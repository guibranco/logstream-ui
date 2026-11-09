import { ColorScale, SHADES, Shade } from './types';

/**
 * Colour helpers for themes whose palettes do not come from Tailwind.
 *
 * `scale()` turns a few anchor colours (an official palette's hex values) into
 * the full 50–950 scale the engine needs, interpolating the missing shades in
 * OKLab so the steps look even. `contrast()` gives the WCAG contrast ratio and
 * is used by the tests to keep every theme readable.
 */

type Rgb = [number, number, number];
type Lab = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);

function linearToOklab([r, g, b]: Rgb): Lab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear([L, a, b]: Lab): Rgb {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Parses `#rgb`, `#rrggbb` or `oklch(L% C H)` (Tailwind's format, `none` allowed) to linear sRGB. */
export function parseColor(value: string): Rgb {
  const color = value.trim().toLowerCase();

  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(color);
  if (hex) {
    const digits = hex[1].length === 3 ? hex[1].replace(/./g, (d) => d + d) : hex[1];
    return [0, 2, 4].map((i) => toLinear(parseInt(digits.slice(i, i + 2), 16) / 255)) as Rgb;
  }

  const oklch = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+|none)\s+([\d.]+|none)\s*\)$/.exec(color);
  if (oklch) {
    const L = parseFloat(oklch[1]) / (oklch[2] ? 100 : 1);
    // `none` (an achromatic Tailwind gray) means 0.
    const C = oklch[3] === 'none' ? 0 : parseFloat(oklch[3]);
    const h = oklch[4] === 'none' ? 0 : (parseFloat(oklch[4]) * Math.PI) / 180;
    return oklabToLinear([L, C * Math.cos(h), C * Math.sin(h)]);
  }

  throw new Error(`Unsupported colour "${value}": use #rrggbb or oklch(L% C H).`);
}

function toHex(rgb: Rgb): string {
  return (
    '#' +
    rgb
      .map((c) => Math.round(Math.min(1, Math.max(0, fromLinear(c))) * 255).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** WCAG 2 contrast ratio between two colours (1 to 21). */
export function contrast(a: string, b: string): number {
  const luminance = (c: string) => {
    const [r, g, bl] = parseColor(c).map((v) => Math.min(1, Math.max(0, v)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * A full colour scale from anchor colours. `50` and `950` are required; any
 * other shade given is used as is, and the rest are interpolated in OKLab
 * between the nearest anchors.
 *
 * ```ts
 * scale({ 50: '#f6f0fe', 400: '#cba6f7', 600: '#8839ef', 950: '#2b0d55' })
 * ```
 */
export function scale(anchors: Partial<Record<Shade, string>> & { '50': string; '950': string }): ColorScale {
  const points = SHADES.map((shade, index) => ({ shade, index, value: anchors[shade] })).filter(
    (p): p is { shade: Shade; index: number; value: string } => typeof p.value === 'string',
  );
  const labs = points.map((p) => linearToOklab(parseColor(p.value)));

  const result = {} as ColorScale;
  SHADES.forEach((shade, index) => {
    const given = anchors[shade];
    if (given) {
      result[shade] = given;
      return;
    }
    const after = points.findIndex((p) => p.index > index);
    const [lo, hi] = [after - 1, after];
    const t = (index - points[lo].index) / (points[hi].index - points[lo].index);
    const lab = labs[lo].map((v, i) => v + (labs[hi][i] - v) * t) as Lab;
    result[shade] = toHex(oklabToLinear(lab));
  });
  return result;
}
