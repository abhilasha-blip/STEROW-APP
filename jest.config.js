/**
 * Jest: RN preset + msw (node). A few msw dependencies resolve to ESM builds under the
 * 'react-native' export condition, so they're transformed with babel like RN packages.
 */
const ESM_PACKAGES = [
  '(jest-)?react-native',
  '@react-native(-community)?',
  'rettime',
  'until-async',
  '@open-draft',
];

module.exports = {
  preset: '@react-native/jest-preset',
  transform: {
    '^.+\\.(js|mjs|cjs|ts|tsx)$': 'babel-jest',
    '^.+\\.(bmp|gif|jpg|jpeg|mp4|png|psd|svg|webp)$': require.resolve(
      '@react-native/jest-preset/jest/assetFileTransformer.js',
    ),
  },
  moduleNameMapper: {
    // msw/node is excluded under the 'react-native' export condition; tests run in Node.
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
  },
  transformIgnorePatterns: [`node_modules/(?!(${ESM_PACKAGES.join('|')})/)`],
};
