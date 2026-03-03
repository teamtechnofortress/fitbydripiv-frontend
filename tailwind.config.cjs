/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/layouts/public.vue',
    './src/pages/site/**/*.vue',
  ],
  important: '.public-site',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Open Sans', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
