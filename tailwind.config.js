// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
 theme: {
    extend: {
      keyframes: {
        'spin-slow': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        // Name this whatever you like; we'll use `spin-slow`
        'spin-slow': 'spin-slow 4s linear infinite',
      },
    },
  },
  variants: {
    extend: {
      animation: ['before'], // (if you ever go back to before:animate-*)
    },
  },
  plugins: [],
}
