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
});
