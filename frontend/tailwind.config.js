/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FDF2FA',
          100: '#FAE0F3',
          200: '#F5B8E4',
          300: '#E87CC8',
          400: '#D946A8',
          500: '#C026A0',
          600: '#A21882',
          700: '#831468',
          800: '#6B1255',
          900: '#4A0E3B',
        },
        violet: {
          400: '#9333EA',
          500: '#7B2FF7',
          600: '#6D28D9',
        },
        surface: {
          bg: '#FAFAFB',
          card: '#FFFFFF',
        },
        text: {
          primary: '#030229',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        success: '#22C55E',
        danger: '#EF4444',
        warning: '#F59E0B',
        accent: {
          blue: '#4C78FF',
          cyan: '#22D3EE',
          purple: '#8B5CF6',
          pink: '#EC4899',
          orange: '#FF8F6B',
          gold: '#FFD66B',
          teal: '#14B8A6',
          coral: '#F97066',
        },
      },
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 24px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
        'card-colored': '0 4px 20px rgba(192,38,160,0.15)',
        'kpi-blue': '0 4px 16px rgba(76,120,255,0.18)',
        'kpi-emerald': '0 4px 16px rgba(34,197,94,0.18)',
        'kpi-amber': '0 4px 16px rgba(245,158,11,0.18)',
        'kpi-purple': '0 4px 16px rgba(192,38,160,0.2)',
      },
    },
  },
  plugins: [],
};
