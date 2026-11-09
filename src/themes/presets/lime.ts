import colors from 'tailwindcss/colors';
import { defineTheme } from '../types';

/** Olive surfaces with lime actions and yellow filters. */
const accents = {
  primary: colors.lime,
  secondary: colors.yellow,
  // Lime and yellow are too light behind white button text: use darker shades.
  overrides: {
    'primary-500': colors.lime[700],
    'primary-600': colors.lime[800],
    'secondary-500': colors.yellow[700],
    'secondary-600': colors.yellow[800],
  },
};

export default defineTheme({
  id: 'lime',
  name: 'Lime',
  description: 'Olive with lime and yellow accents',
  order: 10,
  dark: {
    neutral: colors.olive,
    ...accents,
  },
  light: {
    neutral: colors.olive,
    ...accents,
    overrides: {
      ...accents.overrides,
      // Accent text on white needs the darker shades too.
      'primary-400': colors.lime[700],
      'secondary-400': colors.yellow[700],
      'gray-950': colors.white,
    },
  },
});
