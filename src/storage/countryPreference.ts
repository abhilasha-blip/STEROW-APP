import * as Keychain from 'react-native-keychain';
import { DEFAULT_COUNTRY, isCountryCode, type CountryCode } from '@/constants/countries';
import { logger } from '@/utils/logger';

/**
 * The last phone country picked on this device (not a secret). Stored with react-native-keychain,
 * which the app already ships, to avoid adding a native storage dependency for one small value.
 * Separate service from the auth session, so signing out never touches it.
 */
const SERVICE = 'sterow.pref.phoneCountry';
const ACCOUNT = 'sterow';

export async function loadCountry(): Promise<CountryCode> {
  try {
    const result = await Keychain.getGenericPassword({ service: SERVICE });
    return result && isCountryCode(result.password) ? result.password : DEFAULT_COUNTRY;
  } catch (e) {
    logger.warn('country preference read failed', { error: e instanceof Error ? e.message : String(e) });
    return DEFAULT_COUNTRY;
  }
}

export async function saveCountry(country: CountryCode): Promise<void> {
  try {
    await Keychain.setGenericPassword(ACCOUNT, country, {
      service: SERVICE,
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  } catch (e) {
    // Best-effort: the picker still works for this session.
    logger.warn('country preference write failed', { error: e instanceof Error ? e.message : String(e) });
  }
}
