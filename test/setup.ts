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
// Worklets run on the JS thread under Jest.
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args),
  scheduleOnUI: (fn: (...args: unknown[]) => void, ...args: unknown[]) => fn(...args),
}));
// GH3 gesture hooks need the real Reanimated runtime; drags aren't exercised in unit tests.
// Only what src/ imports (spreading requireActual trips RN's DrawerLayoutAndroid deprecation warning).
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }: { children: unknown }) => children,
    usePanGesture: () => ({}),
  };
});
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  const Picker = (props: object) => require('react').createElement(View, props);
  return { __esModule: true, default: Picker, DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() } };
});
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(() => Promise.resolve({ didCancel: true })),
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })),
}));
jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(() => Promise.reject(Object.assign(new Error('cancelled'), { code: 'OPERATION_CANCELED' }))),
  types: { pdf: 'application/pdf', images: 'image/*' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: (e: unknown) => !!e && typeof e === 'object' && 'code' in e,
}));
// Local file bytes for Storage uploads: Node can't fetch file:// uris. 8 bytes per file.
jest.mock('@/api/files', () => ({ readLocalFile: jest.fn(async () => new ArrayBuffer(8)) }));
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
  require('@/api/services/storage.service').__clearSignedUrlCache();
  require('@/store/onboarding.store').__resetOnboardingStoreForTests();
  server.resetHandlers();
  require('react-native-keychain').__store.clear();
});
afterAll(() => server.close());
