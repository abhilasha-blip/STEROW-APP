// In-memory Keychain for tests. `__store` is exposed so tests can inspect / reset it.
const store = new Map();

module.exports = {
  __store: store,
  ACCESSIBLE: { AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 'AccessibleAfterFirstUnlockThisDeviceOnly' },
  setGenericPassword: jest.fn(async (username, password, options = {}) => {
    store.set(options.service, { username, password, service: options.service });
    return { service: options.service, storage: 'keychain' };
  }),
  getGenericPassword: jest.fn(async (options = {}) => store.get(options.service) ?? false),
  resetGenericPassword: jest.fn(async (options = {}) => store.delete(options.service)),
};
