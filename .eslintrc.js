module.exports = {
  root: true,
  extends: '@react-native',
  plugins: ['react-native'],
  rules: {
    'react-native/no-color-literals': 'error',
    'react-native/no-inline-styles': 'error',
  },
  overrides: [
    {
      // The palette is the single source of raw colour values.
      files: ['src/theme/palette.ts'],
      rules: { 'react-native/no-color-literals': 'off' },
    },
  ],
};
