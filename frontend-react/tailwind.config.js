/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg1: '#070c17',
        bg2: '#0f1d35',
        glass: 'rgba(255,255,255,0.05)',
        tg: {
          50: '#F0FBEF',
          100: '#D1F2E1',
          200: '#B0E8CC',
          300: '#80DDB3',
          400: '#51D89A',
          500: '#2FBF71',
          600: '#24A560',
          700: '#1A8D52',
          800: '#107043',
          900: '#0D4629',
        },
      },
      boxShadow: {
        soft: '0 8px 30px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
}
