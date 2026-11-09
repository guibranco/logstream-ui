import { describe, it, expect } from 'vitest';
import colors from 'tailwindcss/colors';
import { contrast, parseColor, scale } from '@/src/themes/palette';
import { SHADES } from '@/src/themes/types';

describe('parseColor', () => {
  it('reads hex and Tailwind oklch colours', () => {
    expect(parseColor('#ffffff').map((c) => c.toFixed(3))).toEqual(['1.000', '1.000', '1.000']);
    expect(parseColor('#000').map((c) => c.toFixed(3))).toEqual(['0.000', '0.000', '0.000']);
    expect(() => parseColor(colors.blue[500])).not.toThrow();
    expect(() => parseColor(colors.neutral[500])).not.toThrow(); // oklch(… 0 none)
  });

  it('rejects other formats', () => {
    expect(() => parseColor('rgb(0, 0, 0)')).toThrow(/Unsupported colour/);
  });
});

describe('contrast', () => {
  it('matches the WCAG extremes', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });
});

describe('scale', () => {
  const anchors = { '50': '#f6f0fe', '400': '#cba6f7', '600': '#8839ef', '950': '#2b0d55' } as const;
  const result = scale(anchors);

  it('fills every shade and keeps the anchors as given', () => {
    expect(Object.keys(result).sort()).toEqual([...SHADES].sort());
    for (const [shade, value] of Object.entries(anchors)) {
      expect(result[shade as keyof typeof result]).toBe(value);
    }
    for (const shade of SHADES) {
      expect(result[shade]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('gets darker from 50 to 950', () => {
    const towardsWhite = SHADES.map((shade) => contrast(result[shade], '#ffffff'));
    for (let i = 1; i < towardsWhite.length; i++) {
      expect(towardsWhite[i]).toBeGreaterThan(towardsWhite[i - 1]);
    }
  });

  it('accepts Tailwind colours as anchors', () => {
    const mixed = scale({ '50': colors.white, '500': colors.blue[500], '950': colors.black });
    expect(mixed['500']).toBe(colors.blue[500]);
    expect(mixed['300']).toMatch(/^#[0-9a-f]{6}$/);
  });
});
