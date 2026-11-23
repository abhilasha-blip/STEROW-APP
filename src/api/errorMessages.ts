import { strings } from '@/constants/strings';
import { ApiError, normalizeError } from './errors';

export type UserErrorAction = 'GO_SIGN_IN' | 'GO_SIGN_UP' | 'WAIT_COOLDOWN' | 'RESEND_OTP';

/** What a screen needs to react to a failure. `field` routes the message inline instead of a toast. */
export type UserError = {
  userMessage: string;
  action?: UserErrorAction;
  field?: 'phone' | 'otp' | 'dlNumber' | 'dlFile';
  kind: ApiError['kind'];
};

const e = strings.errors;

/**
 * Backend messages (verbatim, matched case-insensitively on a stable fragment) → user copy.
 * The APP server's code is always "bad_request", so the message is the only signal.
 */
const RULES: ReadonlyArray<{ match: RegExp; error: Omit<UserError, 'kind'> }> = [
  {
    match: /already registered/i,
    error: { userMessage: e.alreadyRegistered, action: 'GO_SIGN_IN' },
  },
  {
    match: /no account found/i,
    error: { userMessage: e.noAccount, action: 'GO_SIGN_UP' },
  },
  {
    match: /wait \d+ seconds/i,
    error: { userMessage: e.cooldown, action: 'WAIT_COOLDOWN' },
  },
  {
    // Fixed test login (9999999999) wording for any wrong code.
    match: /incorrect, expired or disabled test otp/i,
    error: { userMessage: e.incorrectOtp, field: 'otp' },
  },
  {
    match: /incorrect otp/i,
    error: { userMessage: e.incorrectOtp, field: 'otp' },
  },
  {
    match: /otp expired|no longer valid/i,
    error: { userMessage: e.otpExpired, action: 'RESEND_OTP', field: 'otp' },
  },
  {
    match: /valid india or uae mobile number/i,
    error: { userMessage: e.invalidPhone, field: 'phone' },
  },
];

/** App-side codes (services) → user copy. Checked before the backend message rules. */
const CODES: Readonly<Record<string, Omit<UserError, 'kind'>>> = {
  DL_NUMBER_REQUIRED: { userMessage: e.dlNumberRequired, field: 'dlNumber' },
  DL_FILE_REQUIRED: { userMessage: e.dlFileRequired, field: 'dlFile' },
  UNSUPPORTED_FILE: { userMessage: e.unsupportedFile },
  FILE_UNREADABLE: { userMessage: e.fileUnreadable },
  NOT_UPDATED: { userMessage: e.notAllowed },
};

/** Storage / PostgREST messages → user copy. */
const STORAGE_RULES: ReadonlyArray<{ match: RegExp; error: Omit<UserError, 'kind'> }> = [
  { match: /payload too large|exceeded the maximum allowed size|entity too large/i, error: { userMessage: e.fileTooLarge } },
  { match: /mime type .* is not supported|invalid_mime_type/i, error: { userMessage: e.unsupportedFile } },
  { match: /row-level security|permission denied/i, error: { userMessage: e.notAllowed } },
];

/** Success messages the APP server may send with an OTP request (all mean "sent"). */
export const OTP_REQUEST_SUCCESS_MESSAGES = [
  'OTP sent to your mobile number',
  'OTP sent to your mobile',
  'OTP request ready',
] as const;

/** Never returns raw backend text or JSON. */
export function toUserError(error: unknown): UserError {
  const apiError = normalizeError(error);
  switch (apiError.kind) {
    case 'network':
      return { userMessage: e.network, kind: apiError.kind };
    case 'timeout':
      return { userMessage: e.timeout, kind: apiError.kind };
    case 'cancelled':
      return { userMessage: '', kind: apiError.kind };
    default:
      break;
  }
  const coded = apiError.code ? CODES[apiError.code] : undefined;
  if (coded) {
    return { ...coded, kind: apiError.kind };
  }
  const rule = RULES.find(r => r.match.test(apiError.message)) ?? STORAGE_RULES.find(r => r.match.test(apiError.message));
  if (rule) {
    return { ...rule.error, kind: apiError.kind };
  }
  if (apiError.status === 413) {
    return { userMessage: e.fileTooLarge, kind: apiError.kind };
  }
  if (apiError.status === 401) {
    return { userMessage: e.sessionExpired, action: 'GO_SIGN_IN', kind: apiError.kind };
  }
  return { userMessage: e.generic, kind: apiError.kind };
}
