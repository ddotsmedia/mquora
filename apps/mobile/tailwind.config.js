const { hairlineWidth } = require('nativewind/theme');
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        primary: '#1F6B45',
        accent: '#D4A017',
      },
      borderWidth: { hairline: hairlineWidth() },
    },
  },
  plugins: [],
};
