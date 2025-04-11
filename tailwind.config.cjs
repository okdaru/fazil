/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
    theme: {
      extend: {
        colors: {
          primary: {
            DEFAULT: '#2D3BF5',
            light: '#4D5BFF',
            dark: '#1D2AE5',
          },
          secondary: {
            DEFAULT: '#8C52FF',
            light: '#A772FF',
            dark: '#7C42FF',
          },
          accent: {
            DEFAULT: '#10DAE7',
            light: '#30EAF7',
            dark: '#00CAD7',
          },
          highlight: {
            DEFAULT: '#FF3D8A',
            light: '#FF5D9A',
            dark: '#FF1D7A',
          },
        },
      },
    },
    plugins: [],
  }