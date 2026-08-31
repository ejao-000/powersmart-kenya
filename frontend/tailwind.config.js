/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EAF4EE',
          100: '#D4E9DD',
          200: '#A9D3BC',
          300: '#7DBC9A',
          400: '#4FA377',
          500: '#0F5132',
          600: '#0D462C',
          700: '#0A3A24',
          800: '#082E1D',
          900: '#062616',
        },
        canvas: '#F5F6F8',
        ink: '#111827',
        leaf: {
          50: '#ECF9F4',
          100: '#D6F2E7',
          200: '#ADE5D0',
          300: '#7ED3B4',
          400: '#3FB98D',
          500: '#0F9D6E',
          600: '#0D8A62',
          700: '#0B5E3E',
          800: '#094A32',
          900: '#063626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(16, 24, 40, 0.05)',
        cardHover: '0 4px 12px -2px rgba(16, 24, 40, 0.08)',
      },
    },
  },
  plugins: [],
}
