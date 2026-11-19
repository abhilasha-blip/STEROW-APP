/* Global jest setup: native module mocks + msw lifecycle. */
import { queryClient } from '@/api/queryClient';
import { resetHandlerState, server } from './msw/server';

// gcTime: Infinity → React Query schedules no 5-minute GC timers that would keep Jest alive.
const defaults = queryClient.getDefaultOptions();
queryClient.setDefaultOptions({
  queries: { ...defaults.queries, gcTime: Infinity },
  mutations: { ...defaults.mutations, gcTime: Infinity },
});

jest.mock('@react-native-community/netinfo', () =>
  require('@react-native-community/netinfo/jest/netinfo-mock.js'),
);
// Node already implements URL; the polyfill is ESM and only needed on device.
jest.mock('react-native-url-polyfill/auto', () => ({}));
jest.mock('react-native-bootsplash', () => ({
  __esModule: true,
  default: { hide: jest.fn(() => Promise.resolve()), isVisible: jest.fn(() => false) },
}));
jest.mock('react-native-haptic-feedback', () => ({
  __esModule: true,
  default: { trigger: jest.fn() },
}));
jest.mock('react-native-reanimated', () => require('./reanimatedMock'));
jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
// The dev logger is verbose by design; keep test output readable (logger.test.ts re-spies).
beforeEach(() => {
  resetHandlerState();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'info').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  jest.restoreAllMocks();
  server.resetHandlers();
  require('react-native-keychain').__store.clear();
});
afterAll(() => server.close());
