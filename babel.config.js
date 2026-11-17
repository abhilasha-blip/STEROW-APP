module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: { '@': './src' },
      },
    ],
    // Must be listed LAST (Reanimated 4 / react-native-worklets docs).
    'react-native-worklets/plugin',
  ],
};
