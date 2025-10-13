import colors from 'tailwindcss/colors';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: colors.neutral,
        'light-bg': 'hsl(0 0% 98%)',
        'light-surface': 'hsl(0 0% 100%)',
        'light-text': 'hsl(0 0% 10%)',
        'light-text-muted': 'hsl(0 0% 40%)',
        'light-accent': 'hsl(217 91% 60%)',
        'light-accent-hover': 'hsl(217 91% 55%)',
        'light-border': 'hsl(0 0% 90%)',

        'dark-bg': 'hsl(0 0% 5%)',
        'dark-surface': 'hsl(0 0% 10%)',
        'dark-text': 'hsl(0 0% 95%)',
        'dark-text-muted': 'hsl(0 0% 60%)',
        'dark-accent': 'hsl(186 98% 52%)',
        'dark-accent-hover': 'hsl(186 98% 47%)',
        'dark-border': 'hsl(0 0% 20%)',
      }
    },
  },
  plugins: [
    forms,
  ],
}
