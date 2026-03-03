import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0F766E',
        secondary: '#14B8A6',
        cta: '#0369A1',
        background: '#020617', // Deep black/blue for OLED
        surface: '#0F172A', // Slightly lighter for cards
        text: '#F8FAFC', // Light text
        muted: '#94A3B8',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['"Josefin Sans"', 'sans-serif'],
        heading: ['Cinzel', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;