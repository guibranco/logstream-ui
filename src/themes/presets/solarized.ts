import { scale } from '../palette';
import { defineTheme } from '../types';

/**
 * Solarized (https://ethanschoonover.com/solarized/). Its base colours are
 * symmetric, so one scale serves both variants: base03…base3 from 950 to 50.
 */
const base = scale({
  '50': '#fdf6e3', // base3
  '100': '#eee8d5', // base2
  '300': '#93a1a1', // base1
  '400': '#839496', // base0
  '500': '#657b83', // base00
  '600': '#586e75', // base01
  '900': '#073642', // base02
  '950': '#002b36', // base03
});
const blue = scale({ '50': '#e9f3fb', '500': '#268bd2', '950': '#08263b' });
const cyan = scale({ '50': '#e8f6f5', '500': '#2aa198', '950': '#08302d' });

export default defineTheme({
  id: 'solarized',
  name: 'Solarized',
  description: 'Solarized dark and light, blue and cyan',
  order: 12,
  dark: { neutral: base, primary: blue, secondary: cyan },
  light: { neutral: base, primary: blue, secondary: cyan },
});
