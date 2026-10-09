import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        malayalam: ['Noto Sans Malayalam', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#1B4332',
          light: '#2D6A4F',
        },
        accent: {
          DEFAULT: '#D4A017',
          light: '#F0C040',
        },
        background: 'hsl(0, 0%, 100%)',
        foreground: 'hsl(0, 0%, 3.6%)',
        card: 'hsl(0, 0%, 100%)',
        'card-foreground': 'hsl(0, 0%, 3.6%)',
        muted: 'hsl(0, 0%, 96.1%)',
        'muted-foreground': 'hsl(0, 0%, 45.1%)',
        border: 'hsl(0, 0%, 89.8%)',
      },
      borderRadius: {
        xl: '10px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};

export default config;
