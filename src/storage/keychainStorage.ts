import * as Keychain from 'react-native-keychain';
import { logger } from '@/utils/logger';

/**
 * Supabase auth storage adapter backed by the iOS Keychain / Android Keystore.
 * The session (access + refresh token) NEVER goes to AsyncStorage or MMKV.
 * Each key is its own Keychain item: service = `sterow.auth.<key>`.
 */
const SERVICE_PREFIX = 'sterow.auth.';
const ACCOUNT = 'sterow';

const options = (key: string) => ({
  service: `${SERVICE_PREFIX}${key}`,
  // Readable after the first unlock so background token refresh works; never migrates to backups.
  accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
});

export const keychainStorage = {
  async getItem(key: string): Promise<string | null> {
    try {
      const result = await Keychain.getGenericPassword({ service: options(key).service });
      return result ? result.password : null;
    } catch (e) {
      // A corrupt/unreadable item must not crash launch: treat as signed out.
      logger.warn('keychain read failed', { key, error: e instanceof Error ? e.message : String(e) });
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    await Keychain.setGenericPassword(ACCOUNT, value, options(key));
  },
  async removeItem(key: string): Promise<void> {
    await Keychain.resetGenericPassword({ service: options(key).service });
  },
};

export type KeychainStorage = typeof keychainStorage;
