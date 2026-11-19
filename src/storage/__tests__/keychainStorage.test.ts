import * as Keychain from 'react-native-keychain';
import { keychainStorage } from '@/storage/keychainStorage';

describe('keychainStorage', () => {
  it('round-trips a value per key in its own Keychain item', async () => {
    await keychainStorage.setItem('sb-auth', '{"a":1}');
    await keychainStorage.setItem('other', 'x');
    expect(await keychainStorage.getItem('sb-auth')).toBe('{"a":1}');
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith('sterow', '{"a":1}', {
      service: 'sterow.auth.sb-auth',
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
    await keychainStorage.removeItem('sb-auth');
    expect(await keychainStorage.getItem('sb-auth')).toBeNull();
    expect(await keychainStorage.getItem('other')).toBe('x');
  });

  it('returns null when the Keychain read fails', async () => {
    (Keychain.getGenericPassword as jest.Mock).mockRejectedValueOnce(new Error('corrupt'));
    expect(await keychainStorage.getItem('sb-auth')).toBeNull();
    (Keychain.getGenericPassword as jest.Mock).mockRejectedValueOnce('weird');
    expect(await keychainStorage.getItem('sb-auth')).toBeNull();
  });
});
