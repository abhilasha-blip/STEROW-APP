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
    // zod v4's ESM build uses `export * as ns from` (Metro resolves ESM; Jest uses its CJS build).
    '@babel/plugin-transform-export-namespace-from',
    // Must be listed LAST (Reanimated 4 / react-native-worklets docs).
    'react-native-worklets/plugin',
  ],
};
