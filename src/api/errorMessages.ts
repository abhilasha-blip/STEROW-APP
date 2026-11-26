import { strings } from '@/constants/strings';
import { ApiError, normalizeError } from './errors';

export type UserErrorAction =
  | 'GO_SIGN_IN'
  | 'GO_SIGN_UP'
  | 'WAIT_COOLDOWN'
  | 'RESEND_OTP'
  /** Verify: too many wrong codes. The code is locked: clear + disable it, offer Resend now. */
  | 'OTP_LOCKED'
  /** OTP request: too many requests (server: otp_max_resends). */
  | 'TOO_MANY_REQUESTS'
  /**
   * Licence save refused for good: a soft-deleted user_driving_licenses row is hidden from the user by
   * the RLS policy "Hide deleted rows" but still owns user_id (42501 on upsert, 23505 on insert). A
   * backend fix is needed (docs/api/dl-hidden-row-42501.md): show it inline, offer "Skip for now", never retry.
   */
  | 'DL_DELETED_BLOCKED';

/** Where the failure happened, when the same backend text means different things. */
export type ErrorContext = 'otpVerify' | 'otpRequest' | 'dlSave';

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

/**
 * "Too many" from the backend. The APP server answers 400 { error: { code: "bad_request", message } }
 * (openapi: /auth/otp/verify and /auth/otp/request list only 400/401), the exact wording isn't
 * published (the web shows the server text as is), and the web admin sets the limits
 * (otp_max_wrong_attempts: "After this many wrong codes the user must choose Resend OTP";
 * otp_max_resends per mobile + purpose in 30 min). So: any "too many" text, HTTP 429, or a dedicated
 * code (GoTrue / gateway rate limits).
 */
const TOO_MANY_TEXT = /too many/i;
const TOO_MANY_CODES = /^(too_many_(attempts|requests)|rate_limit(ed)?|otp_(locked|attempts_exceeded|max_attempts)|max_attempts_exceeded|over_(request|sms_send|email_send)_rate_limit)$/i;

const isTooMany = (err: ApiError) =>
  err.status === 429 || TOO_MANY_TEXT.test(err.message) || (!!err.code && TOO_MANY_CODES.test(err.code));

/** The server's own sentence, if it's safe to show (never JSON, HTML or a bare status). */
const serverText = (message: string): string | undefined => {
  const m = message.trim();
  return m && m.length <= 200 && !/^[[{<]/.test(m) && !/^HTTP \d+$/.test(m) ? m : undefined;
};

/** App-side codes (services) → user copy. Checked before the backend message rules. */
const CODES: Readonly<Record<string, Omit<UserError, 'kind'>>> = {
  DL_NUMBER_REQUIRED: { userMessage: e.dlNumberRequired, field: 'dlNumber' },
  DL_FILE_REQUIRED: { userMessage: e.dlFileRequired, field: 'dlFile' },
  UNSUPPORTED_FILE: { userMessage: e.unsupportedFile },
  FILE_UNREADABLE: { userMessage: e.fileUnreadable },
  NOT_UPDATED: { userMessage: e.notAllowed },
  VEHICLE_NUMBER_TAKEN: { userMessage: e.vehicleNumberTaken },
  DOCUMENT_FIELD_REQUIRED: { userMessage: e.documentFieldRequired },
};

/** Storage / PostgREST messages → user copy. */
const STORAGE_RULES: ReadonlyArray<{ match: RegExp; error: Omit<UserError, 'kind'> }> = [
  // Before the generic RLS rule: the DL row was soft-deleted and now blocks saves (backend bug O6).
  { match: /"?Hide deleted rows"?|user_driving_licenses_user_id_key/i, error: { userMessage: e.dlDeletedBlocked, action: 'DL_DELETED_BLOCKED' } },
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

/**
 * Never returns raw JSON / HTML; never falls through to the generic message for a known case.
 * `context` tells a too-many-attempts on Verify from a too-many-requests on the OTP request.
 */
export function toUserError(error: unknown, context?: ErrorContext): UserError {
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
  if (isTooMany(apiError)) {
    return context === 'otpRequest'
      ? {
          userMessage: serverText(apiError.message) && TOO_MANY_TEXT.test(apiError.message)
            ? serverText(apiError.message)!
            : e.tooManyRequests,
          action: 'TOO_MANY_REQUESTS',
          kind: apiError.kind,
        }
      : { userMessage: e.tooManyAttempts, action: 'OTP_LOCKED', field: 'otp', kind: apiError.kind };
  }
  // Licence save: any RLS refusal (42501) is the hidden soft-deleted row (the user can always write
  // their own licence otherwise), even when the message is generic.
  if (context === 'dlSave' && apiError.code === '42501') {
    return { userMessage: e.dlDeletedBlocked, action: 'DL_DELETED_BLOCKED', kind: apiError.kind };
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
