import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

/**
 * Pure black or white pages, brighter text and stronger borders, for low
 * vision or bright screens.
 */
export default defineTheme({
  id: 'high-contrast',
  name: 'High contrast',
  description: 'Black or white, strong borders and text',
  order: 15,
  dark: {
    neutral: {
      '50': '#ffffff',
      '100': '#ffffff',
      '200': '#f5f5f5',
      '300': '#e5e5e5',
      '400': '#d4d4d4',
      '500': '#bdbdbd',
      '600': '#a3a3a3',
      '700': '#737373',
      '800': '#525252',
      '900': '#0a0a0a',
      '950': '#000000',
    },
    primary: colors.blue,
    secondary: colors.cyan,
    overrides: {
      'primary-400': colors.blue[300],
      'secondary-400': colors.cyan[300],
      'secondary-500': colors.cyan[700],
      'secondary-600': colors.cyan[800],
    },
  },
  light: {
    // Lightest first; the engine flips it.
    neutral: {
      '50': '#ffffff',
      '100': '#f5f5f5',
      '200': '#a3a3a3',
      '300': '#737373',
      '400': '#525252',
      '500': '#404040',
      '600': '#333333',
      '700': '#262626',
      '800': '#171717',
      '900': '#000000',
      '950': '#000000',
    },
    primary: colors.blue,
    secondary: colors.cyan,
    overrides: {
      'primary-400': colors.blue[700],
      'secondary-400': colors.cyan[800],
      'secondary-500': colors.cyan[700],
      'secondary-600': colors.cyan[800],
    },
  },
});
