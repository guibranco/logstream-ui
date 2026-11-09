import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

/**
 * Warm taupe surfaces with amber actions and yellow filters; the light variant
 * keeps a paper-coloured page instead of white.
 */
const accents = {
  primary: colors.amber,
  secondary: colors.yellow,
  // Amber and yellow are too light behind white button text: use one shade darker.
  overrides: {
    'primary-500': colors.amber[600],
    'primary-600': colors.amber[700],
    'secondary-500': colors.yellow[600],
    'secondary-600': colors.yellow[700],
  },
};

export default defineTheme({
  id: 'sepia',
  name: 'Sepia',
  description: 'Taupe with amber and yellow accents',
  order: 9,
  dark: {
    neutral: colors.taupe,
    ...accents,
  },
  light: {
    neutral: colors.taupe,
    ...accents,
    overrides: {
      ...accents.overrides,
      // Accent text on the paper page needs the darker shades too.
      'primary-400': colors.amber[700],
      'secondary-400': colors.yellow[700],
    },
  },
});
