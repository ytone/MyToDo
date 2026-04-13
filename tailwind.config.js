/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1e293b',
          raised: '#334155',
          overlay: '#475569',
        }
      }
    },
  },
  plugins: [],
}
