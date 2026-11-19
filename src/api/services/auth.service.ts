import type { Session } from '@supabase/supabase-js';
import { formatForApi } from '@/utils/phone';
import { normalizeFullName, normalizeReferralCode } from '@/utils/validation';
import { appPost } from '../appClient';
import { ENDPOINTS, type OtpPurpose } from '../endpoints';
import { ApiError, normalizeError } from '../errors';
import { OtpRequestResponse, OtpVerifyResponse, parseOrThrow } from '../schemas/auth.schemas';
import { getSupabase } from '../supabase';

export type RequestOtpInput = {
  /** 10 digits as typed; formatted for the API here. */
  phone: string;
  purpose: OtpPurpose;
  fullName?: string;
  referralCode?: string;
};

export type VerifyOtpInput = { requestId: string; otp: string; purpose: OtpPurpose };

type Opts = { signal?: AbortSignal };

const cancelled = () => new ApiError({ kind: 'cancelled', message: 'Request cancelled' });

/** Body exactly as the backend expects it: empty optional fields are omitted (never null / ""). */
export function buildOtpRequestBody(input: RequestOtpInput): Record<string, string> {
  const body: Record<string, string> = { phone: formatForApi(input.phone), purpose: input.purpose };
  if (input.purpose === 'signup') {
    const fullName = input.fullName ? normalizeFullName(input.fullName) : '';
    if (fullName) {
      body.fullName = fullName;
    }
    const referralCode = input.referralCode ? normalizeReferralCode(input.referralCode) : '';
    if (referralCode) {
      body.referralCode = referralCode;
    }
  }
  return body;
}

export async function requestOtp(input: RequestOtpInput, opts: Opts = {}): Promise<OtpRequestResponse> {
  const data = await appPost(ENDPOINTS.APP.AUTH.OTP_REQUEST, buildOtpRequestBody(input), opts);
  return parseOrThrow(OtpRequestResponse, data, 'otp/request');
}

/**
 * Verifies the code and establishes the Supabase session (persisted to the Keychain by supabase-js,
 * which also notifies onAuthStateChange → the auth store). Handles both response variants.
 * If the caller aborted (user left the screen) the session is NOT established.
 */
export async function verifyOtp(input: VerifyOtpInput, opts: Opts = {}): Promise<Session> {
  const data = await appPost(ENDPOINTS.APP.AUTH.OTP_VERIFY, { ...input }, opts);
  const parsed = parseOrThrow(OtpVerifyResponse, data, 'otp/verify');
  if (opts.signal?.aborted) {
    throw cancelled();
  }
  const auth = getSupabase().auth;
  const result =
    'tokenHash' in parsed
      ? await auth.verifyOtp({ token_hash: parsed.tokenHash, type: 'magiclink' })
      : await auth.setSession({ access_token: parsed.access_token, refresh_token: parsed.refresh_token });
  if (result.error) {
    throw normalizeError(result.error);
  }
  if (!result.data.session) {
    throw new ApiError({ kind: 'server', code: 'NO_SESSION', message: 'No session returned' });
  }
  return result.data.session;
}

/** This device only: other devices stay signed in. */
export async function signOut(): Promise<void> {
  const { error } = await getSupabase().auth.signOut({ scope: 'local' });
  if (error) {
    throw normalizeError(error);
  }
}

/** Current session from the Keychain (refreshed by supabase-js if needed). */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error) {
    throw normalizeError(error);
  }
  return data.session;
}
