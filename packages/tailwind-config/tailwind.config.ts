import type { Config } from 'tailwindcss/types/config';

export default {
  darkMode: 'class',
  theme: {
    extend: {
      keyframes: {
        fadeOutDelayed: {
          '0%, 50%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'fade-out-delayed': 'fadeOutDelayed 0.8s ease-out forwards',
      },
    },
  },
  plugins: [],
} as Omit<Config, 'content'>;
