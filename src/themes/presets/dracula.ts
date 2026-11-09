import { scale } from '../palette';
import { defineTheme } from '../types';

/**
 * Dracula (https://draculatheme.com/spec): Dracula for dark, Alucard for light.
 * Accents run from Dracula's purple/pink (text on dark) to Alucard's
 * (buttons, and text on light).
 */
const purple = scale({ '50': '#f6f1fe', '400': '#bd93f9', '600': '#644ac9', '950': '#1d1442' });
const pink = scale({ '50': '#fff0f8', '400': '#ff79c6', '600': '#a3144d', '950': '#3a0719' });

export default defineTheme({
  id: 'dracula',
  name: 'Dracula',
  description: 'Dracula (dark) and Alucard (light), purple and pink',
  order: 14,
  dark: {
    neutral: scale({
      '50': '#ffffff',
      '100': '#f8f8f2', // foreground
      '500': '#6272a4', // comment
      '700': '#44475a', // selection
      '800': '#343746',
      '900': '#282a36', // background
      '950': '#21222c',
    }),
    primary: purple,
    secondary: pink,
  },
  light: {
    neutral: scale({
      '50': '#fffbeb', // Alucard background
      '200': '#cfcfde', // selection
      '500': '#6c664b', // comment
      '900': '#1f1f1f', // foreground
      '950': '#0f0f0f',
    }),
    primary: purple,
    secondary: pink,
  },
});
