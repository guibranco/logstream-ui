import { scale } from '../palette';
import { defineTheme } from '../types';

/**
 * Nord (https://www.nordtheme.com/docs/colors-and-palettes): Polar Night and
 * Snow Storm as the neutral scale, Frost for the accents. Nord has no official
 * light variant; the light one uses Snow Storm as the page and Polar Night as text.
 */
const nord = {
  '50': '#eceff4', // nord6
  '100': '#e5e9f0', // nord5
  '200': '#d8dee9', // nord4
  '700': '#4c566a', // nord3
  '800': '#434c5e', // nord2
  '900': '#3b4252', // nord1
  '950': '#2e3440', // nord0
} as const;
// Muted text (gray-500) needs a lighter gray on Polar Night than on Snow Storm.
const darkNeutral = scale({ ...nord, '500': '#8590a6' });
const lightNeutral = scale({ ...nord, '500': '#636d82' });
const frostBlue = scale({ '50': '#eef2f7', '400': '#81a1c1', '600': '#5e81ac', '950': '#1a2433' }); // nord9, nord10
const frostCyan = scale({ '50': '#eff8fa', '400': '#88c0d0', '600': '#3f7d8f', '950': '#123039' }); // nord8

export default defineTheme({
  id: 'nord',
  name: 'Nord',
  description: 'Polar Night and Snow Storm, Frost accents',
  order: 13,
  dark: { neutral: darkNeutral, primary: frostBlue, secondary: frostCyan },
  light: { neutral: lightNeutral, primary: frostBlue, secondary: frostCyan },
});
