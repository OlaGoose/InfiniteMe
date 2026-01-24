import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm caramel/amber theme from u0
        primary: {
          DEFAULT: '#c3815a',
          hover: '#b07350',
          light: '#d4956f',
          50: '#fff8f5',
          100: '#fff1ea',
          200: '#ffeadf',
          300: '#ffe3d4',
          400: '#ffbe98',
          500: '#c3815a',
          600: '#b07350',
          700: '#8a5940',
          800: '#6d4733',
          900: '#4a2f22',
        },
        warm: {
          50: '#fefcfb',
          100: '#fff8f5',
          200: '#fff1ea',
          300: '#ffeadf',
          400: '#ffe3d4',
          500: '#c3815a',
        },
        // Keep original brand colors as backup
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
        },
      },
      borderRadius: {
        'warm-sm': '8px',
        'warm-md': '10px',
        'warm': '12px',
        'warm-lg': '14px',
        'warm-xl': '16px',
        'warm-2xl': '20px',
        'warm-3xl': '24px',
      },
      boxShadow: {
        'warm': '0 10px 40px -10px rgba(195, 129, 90, 0.3)',
        'warm-sm': '0 2px 8px rgba(195, 129, 90, 0.15)',
        'warm-md': '0 4px 12px rgba(195, 129, 90, 0.2)',
        'warm-lg': '0 8px 24px rgba(195, 129, 90, 0.25)',
        'warm-xl': '0 12px 32px rgba(195, 129, 90, 0.3)',
      },
      backgroundImage: {
        'gradient-warm': 'linear-gradient(135deg, #c3815a 0%, #d4956f 100%)',
        'gradient-warm-soft': 'linear-gradient(135deg, #fff1ea 0%, #ffeadf 100%)',
        'gradient-warm-hero': 'linear-gradient(135deg, #c3815a 0%, #d4956f 50%, #e8a984 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
