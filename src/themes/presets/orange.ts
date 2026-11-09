import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

/** Warm stone surfaces with orange actions and amber filters. */
export default defineTheme({
  id: 'orange',
  name: 'Orange',
  description: 'Warm stone with orange and amber accents',
  order: 3,
  dark: {
    neutral: colors.stone,
    primary: colors.orange,
    secondary: colors.amber,
  },
  light: {
    neutral: colors.stone,
    primary: colors.orange,
    secondary: colors.amber,
    overrides: {
      'gray-950': colors.white,
    },
  },
});
