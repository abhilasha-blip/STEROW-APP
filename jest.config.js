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
  collectCoverageFrom: [
    'src/api/**/*.{ts,tsx}',
    'src/store/**/*.{ts,tsx}',
    'src/hooks/api/**/*.{ts,tsx}',
    'src/utils/**/*.{ts,tsx}',
  ],
  coverageThreshold: {
    './src/api/': { lines: 80, branches: 80, functions: 80, statements: 80 },
    './src/store/': { lines: 80, branches: 80, functions: 80, statements: 80 },
    './src/hooks/api/': { lines: 80, branches: 80, functions: 80, statements: 80 },
    './src/utils/': { lines: 80, branches: 80, functions: 80, statements: 80 },
  },
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
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  transformIgnorePatterns: [`node_modules/(?!(${ESM_PACKAGES.join('|')})/)`],
};
