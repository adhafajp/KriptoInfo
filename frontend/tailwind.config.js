module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f1ff',
          100: '#b3d9ff',
          200: '#80c1ff',
          300: '#4da9ff',
          400: '#1a91ff',
          500: '#0078e6',
          600: '#005fb3',
          700: '#004680',
          800: '#002d4d',
          900: '#00141a',
        },
        vault: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        dark: {
          50: '#f5f7fa',
          100: '#e4e9f0',
          200: '#c9d3e0',
          300: '#a3b5ca',
          400: '#7891b0',
          500: '#5a7296',
          600: '#47597a',
          700: '#364461',
          800: '#283348',
          900: '#1a2230',
          950: '#0f1419',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(34, 197, 94, 0.2), 0 0 20px rgba(34, 197, 94, 0.1)' },
          '100%': { boxShadow: '0 0 10px rgba(34, 197, 94, 0.4), 0 0 40px rgba(34, 197, 94, 0.2)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
