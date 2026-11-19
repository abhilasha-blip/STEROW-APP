/**
 * PARKED: stubs used only by the parked PinSignInScreen (no PIN/biometric endpoint exists yet).
 * The real auth flow lives in src/api/services/auth.service.ts.
 *
 * Auth service – typed stubs with simulated network latency.
 * Swap the bodies for real API calls; the screens only depend on these signatures.
 */

export type AuthSession = { token: string };

export class AuthError extends Error {
  constructor(public readonly code: 'INVALID_PIN' | 'INVALID_OTP' | 'NETWORK', message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** Stub: any 4–6 digit PIN works except '0000'. */
async function loginWithPin(pin: string): Promise<AuthSession> {
  await delay(800);
  if (pin === '0000') {
    throw new AuthError('INVALID_PIN', 'Incorrect PIN');
  }
  return { token: `pin-${Date.now()}` };
}

/** Stub: pretends to send an SMS with a one-time code. */
async function sendOtp(_phone: string): Promise<void> {
  await delay(800);
}

/** Stub: '1234' is the only valid code. */
async function verifyOtp(_phone: string, code: string): Promise<AuthSession> {
  await delay(800);
  if (code !== '1234') {
    throw new AuthError('INVALID_OTP', 'Invalid code');
  }
  return { token: `otp-${Date.now()}` };
}

/** Called after a successful device biometric check. */
async function loginWithBiometrics(): Promise<AuthSession> {
  await delay(300);
  return { token: `bio-${Date.now()}` };
}

export const authService = { loginWithPin, sendOtp, verifyOtp, loginWithBiometrics };
