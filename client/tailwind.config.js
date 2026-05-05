/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
      },
      boxShadow: {
        soft:    '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        ring:    '0 0 0 1px rgb(15 23 42 / 0.05), 0 1px 2px 0 rgb(15 23 42 / 0.05)',
        glow:    '0 10px 30px -10px rgb(99 102 241 / 0.35)',
        card:    '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 4px 12px -4px rgb(15 23 42 / 0.08)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
        'brand-soft':     'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)',
        'mesh':
          'radial-gradient(at 0% 0%, rgba(99,102,241,0.18) 0px, transparent 50%),' +
          'radial-gradient(at 100% 0%, rgba(139,92,246,0.18) 0px, transparent 50%),' +
          'radial-gradient(at 50% 100%, rgba(236,72,153,0.12) 0px, transparent 50%)',
      },
      keyframes: {
        'fade-in':   { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'slide-in':  { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(0)' } },
      },
      animation: {
        'fade-in':  'fade-in 0.25s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
