import { ApiError } from '@/api/errors';
import { toUserError } from '@/api/errorMessages';
import { strings } from '@/constants/strings';

const v = (message: string, status = 400) => new ApiError({ kind: 'validation', message, status });
const e = strings.errors;

describe('toUserError', () => {
  it.each([
    ['This mobile number is already registered. Please sign in.', e.alreadyRegistered, 'GO_SIGN_IN', undefined],
    ['No account found for this mobile number.', e.noAccount, 'GO_SIGN_UP', undefined],
    ['Please wait 30 seconds before requesting another OTP.', e.cooldown, 'WAIT_COOLDOWN', undefined],
    ['Incorrect OTP.', e.incorrectOtp, undefined, 'otp'],
    ['Incorrect, expired or disabled test OTP.', e.incorrectOtp, undefined, 'otp'],
    ['OTP expired. Request a new one.', e.otpExpired, 'RESEND_OTP', 'otp'],
    ['This OTP request is no longer valid. Request a new one.', e.otpExpired, 'RESEND_OTP', 'otp'],
    ['Enter a valid India or UAE mobile number', e.invalidPhone, undefined, 'phone'],
  ])('maps "%s"', (message, userMessage, action, field) => {
    expect(toUserError(v(message))).toEqual({ userMessage, action, field, kind: 'validation' });
  });

  it('maps raw-JSON validation strings without leaking JSON', () => {
    const r = toUserError('[{"message":"Enter a valid India or UAE mobile number"}]');
    expect(r.userMessage).toBe(e.invalidPhone);
    expect(r.field).toBe('phone');
  });

  it('maps transport kinds', () => {
    expect(toUserError(new ApiError({ kind: 'network', message: '' })).userMessage).toBe(e.network);
    expect(toUserError(new ApiError({ kind: 'timeout', message: '' })).userMessage).toBe(e.timeout);
    expect(toUserError(new ApiError({ kind: 'cancelled', message: '' })).userMessage).toBe('');
  });

  it('maps 401 to session expired and anything else to the generic message', () => {
    expect(toUserError(v('JWT expired', 401))).toMatchObject({ userMessage: e.sessionExpired, action: 'GO_SIGN_IN' });
    expect(toUserError(v('{"weird":true}'))).toMatchObject({ userMessage: e.generic });
    expect(toUserError(new ApiError({ kind: 'server', message: 'Internal', status: 500 })).userMessage).toBe(e.generic);
    expect(toUserError(undefined).userMessage).toBe(e.generic);
  });

  describe('too many attempts / requests (never the generic message)', () => {
    const locked = { userMessage: e.tooManyAttempts, action: 'OTP_LOCKED', field: 'otp' };

    it.each([
      ['Too many wrong attempts. Request a new OTP.', 400],
      ['too many attempts', 400],
      ['TOO MANY REQUESTS, REQUEST A NEW OTP', 400],
      ['Too many incorrect codes. Please request a new OTP.', 400],
      ['Rate limited', 429], // any 429
      ['HTTP 429', 429],
    ])('verify: "%s" (%s) → "Too many attempts. Please request a new OTP."', (message, status) => {
      expect(toUserError(v(message, status), 'otpVerify')).toMatchObject(locked);
      expect(toUserError(v(message, status))).toMatchObject(locked); // default: the verify meaning
    });

    it.each(['too_many_attempts', 'TOO_MANY_REQUESTS', 'otp_locked', 'over_request_rate_limit', 'rate_limited'])(
      'verify: dedicated code %s',
      code => {
        const err = new ApiError({ kind: 'validation', message: 'Request a new OTP.', status: 400, code });
        expect(toUserError(err, 'otpVerify')).toMatchObject(locked);
      },
    );

    it('OTP request: the server sentence is shown as is', () => {
      const msg = 'Too many OTP requests for this number. Try again in 30 minutes.';
      expect(toUserError(v(msg), 'otpRequest')).toMatchObject({ userMessage: msg, action: 'TOO_MANY_REQUESTS' });
    });

    it('OTP request: a 429 without a usable sentence → our fallback (no JSON / status text)', () => {
      expect(toUserError(v('HTTP 429', 429), 'otpRequest').userMessage).toBe(e.tooManyRequests);
      expect(toUserError(v('{"limit":5}', 429), 'otpRequest').userMessage).toBe(e.tooManyRequests);
      expect(toUserError(new ApiError({ kind: 'validation', message: 'Slow down', status: 400, code: 'rate_limited' }), 'otpRequest').userMessage).toBe(e.tooManyRequests);
    });

    it('unrelated errors are untouched: a 500 is still generic, a wrong code still "Incorrect OTP."', () => {
      expect(toUserError(new ApiError({ kind: 'server', message: 'boom', status: 500 }), 'otpVerify').userMessage).toBe(
        'Something went wrong. Please try again.',
      );
      expect(toUserError(v('Incorrect OTP.'), 'otpVerify')).toMatchObject({ userMessage: e.incorrectOtp, field: 'otp' });
      expect(toUserError(v('Please wait 30 seconds before requesting another OTP.'), 'otpRequest').action).toBe('WAIT_COOLDOWN');
    });
  });
});
