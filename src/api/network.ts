import NetInfo from '@react-native-community/netinfo';
import { ApiError } from './errors';

/**
 * Fail fast when the device is definitely offline, instead of waiting for the 15 s timeout.
 * `isConnected === null` (unknown, e.g. at startup) is treated as online.
 */
export async function assertOnline(): Promise<void> {
  const state = await NetInfo.fetch();
  if (state.isConnected === false) {
    throw new ApiError({ kind: 'network', message: 'Offline' });
  }
}
