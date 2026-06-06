/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: {
          400: '#22C55E',   // used on dark hero backgrounds
          500: '#16A34A',   // primary green (darker for light bg contrast)
          600: '#15803D',
        },
        gold: {
          300: '#FEF3C7',
          400: '#FCD34D',
          500: '#F59E0B',
          600: '#D97706',
        },
        stadium: {
          950: '#FFFFFF',
          900: '#F8FAFC',
          800: '#F1F5F9',
          700: '#E2E8F0',
          600: '#CBD5E1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'stadium-hero': 'radial-gradient(ellipse at 50% -20%, rgba(22,163,74,0.1) 0%, transparent 60%), linear-gradient(180deg, #EDF0F7 0%, #E2E8F0 100%)',
        'card-glow-green': 'linear-gradient(135deg, rgba(22,163,74,0.04) 0%, transparent 60%)',
        'card-glow-gold': 'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, transparent 60%)',
        'pitch-lines': 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(22,163,74,0.02) 40px, rgba(22,163,74,0.02) 41px)',
      },
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(22,163,74,0.25)' },
          '50%': { boxShadow: '0 0 24px rgba(22,163,74,0.5)' },
        },
        'gold-pulse': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(245,158,11,0.35)' },
          '50%': { boxShadow: '0 0 28px rgba(245,158,11,0.65)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.92)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.4s ease-out forwards',
        'slide-up-delay': 'slide-up 0.4s ease-out 0.1s forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'gold-pulse': 'gold-pulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'scale-in': 'scale-in 0.3s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
      },
      dropShadow: {
        'green': '0 0 12px rgba(22,163,74,0.4)',
        'gold': '0 0 12px rgba(245,158,11,0.5)',
      },
    },
  },
  plugins: [],
}
