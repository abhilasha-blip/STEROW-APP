import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

export type BiometricResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'unavailable' }
  | { status: 'error'; error?: string };

/**
 * Face ID / Touch ID on iOS, BiometricPrompt on Android.
 * Both of the app's biometric buttons route here.
 */
export async function authenticateWithBiometrics(promptMessage: string): Promise<BiometricResult> {
  try {
    const { available } = await rnBiometrics.isSensorAvailable();
    if (!available) {
      return { status: 'unavailable' };
    }
    const { success, error } = await rnBiometrics.simplePrompt({ promptMessage });
    if (success) {
      return { status: 'success' };
    }
    return error ? { status: 'error', error } : { status: 'cancelled' };
  } catch (e) {
    return { status: 'error', error: e instanceof Error ? e.message : String(e) };
  }
}
