/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        green: {
          500: '#1D9E75',
          600: '#1D9E75',
          700: '#0F6E56',
          800: '#0F6E56',
          900: '#094d3c',
          50:  '#f0fdf6',
        },
      },
      fontFamily: {
        sans: ['"LINE Seed Sans TH"', '"Noto Sans Thai"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
