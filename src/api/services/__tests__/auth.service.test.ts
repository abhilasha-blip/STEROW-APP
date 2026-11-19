import { http, HttpResponse } from 'msw';
import { __resetAppClientForTests } from '@/api/appClient';
import { toUserError } from '@/api/errorMessages';
import { ApiError } from '@/api/errors';
import {
  buildOtpRequestBody,
  getSession,
  requestOtp,
  signOut,
  verifyOtp,
} from '@/api/services/auth.service';
import { __resetSupabaseForTests, getSupabase } from '@/api/supabase';
import { strings } from '@/constants/strings';
import { appError, backendMessages, makeSession, TEST_OTP } from '../../../../test/msw/fixtures';
import { requestLog, server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';

beforeEach(() => {
  __resetAppClientForTests();
  __resetSupabaseForTests();
  requestLog.length = 0;
});

const lastBody = (url: string) => requestLog.filter(r => r.url.startsWith(url)).at(-1)?.body;
const failWith = (message: string) =>
  server.use(http.post(urls.otpRequest, () => HttpResponse.json(appError(message), { status: 400 })));

describe('requestOtp', () => {
  it('signin: sends only phone (10 digits) + purpose', async () => {
    const r = await requestOtp({ phone: '9876543210', purpose: 'signin', fullName: 'Ignored' });
    expect(r).toEqual({ requestId: 'req-1', isNewUser: false });
    expect(lastBody(urls.otpRequest)).toEqual({ phone: '9876543210', purpose: 'signin' });
  });

  it('signup: sends normalized fullName and referralCode, omitting empty optionals', async () => {
    await requestOtp({ phone: '9876543210', purpose: 'signup', fullName: '  Ravi   Kumar ', referralCode: 'str ab12' });
    expect(lastBody(urls.otpRequest)).toEqual({
      phone: '9876543210',
      purpose: 'signup',
      fullName: 'Ravi Kumar',
      referralCode: 'STRAB12',
    });
    expect(buildOtpRequestBody({ phone: '9876543210', purpose: 'signup', fullName: ' ', referralCode: '' })).toEqual({
      phone: '9876543210',
      purpose: 'signup',
    });
  });

  it.each([
    [backendMessages.alreadyRegistered, strings.errors.alreadyRegistered, 'GO_SIGN_IN'],
    [backendMessages.noAccount, strings.errors.noAccount, 'GO_SIGN_UP'],
    [backendMessages.cooldown, strings.errors.cooldown, 'WAIT_COOLDOWN'],
  ])('maps "%s"', async (backend, userMessage, action) => {
    failWith(backend);
    const error = await requestOtp({ phone: '9876543210', purpose: 'signin' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(toUserError(error)).toMatchObject({ userMessage, action });
  });

  it('maps a raw-JSON validation error to the inline phone error', async () => {
    failWith(JSON.stringify([{ code: 'custom', message: backendMessages.invalidPhone, path: ['phone'] }]));
    const error = await requestOtp({ phone: '9876543210', purpose: 'signin' }).catch((e: unknown) => e);
    expect(toUserError(error)).toMatchObject({ field: 'phone', userMessage: strings.errors.invalidPhone });
  });

  it('maps network failure and a schema mismatch', async () => {
    server.use(http.post(urls.otpRequest, () => HttpResponse.error()));
    await expect(requestOtp({ phone: '9876543210', purpose: 'signin' })).rejects.toMatchObject({ kind: 'network' });

    server.use(http.post(urls.otpRequest, () => HttpResponse.json({ data: { nope: true } })));
    await expect(requestOtp({ phone: '9876543210', purpose: 'signin' })).rejects.toMatchObject({
      kind: 'server',
      code: 'SCHEMA_MISMATCH',
    });
  });
});

describe('verifyOtp', () => {
  it('session variant: stores the session in Supabase (Keychain)', async () => {
    const session = await verifyOtp({ requestId: 'req-1', otp: TEST_OTP, purpose: 'signin' });
    expect(session.user.id).toBeTruthy();
    expect(lastBody(urls.otpVerify)).toEqual({ requestId: 'req-1', otp: TEST_OTP, purpose: 'signin' });
    expect((await getSession())?.access_token).toBe(session.access_token);
  });

  it('tokenHash variant: exchanges it with verifyOtp(magiclink)', async () => {
    server.use(http.post(urls.otpVerify, () => HttpResponse.json({ data: { tokenHash: 'th-1' } })));
    const session = await verifyOtp({ requestId: 'req-1', otp: TEST_OTP, purpose: 'signup' });
    expect(session.access_token).toBeTruthy();
    expect(lastBody(urls.sbVerify)).toMatchObject({ token_hash: 'th-1', type: 'magiclink' });
  });

  it('incorrect OTP keeps the user signed out', async () => {
    const error = await verifyOtp({ requestId: 'req-1', otp: '000000', purpose: 'signin' }).catch((e: unknown) => e);
    expect(toUserError(error)).toMatchObject({ userMessage: strings.errors.incorrectOtp, field: 'otp' });
    expect(await getSession()).toBeNull();
  });

  it('expired OTP asks for a resend', async () => {
    server.use(http.post(urls.otpVerify, () => HttpResponse.json(appError(backendMessages.expired), { status: 400 })));
    const error = await verifyOtp({ requestId: 'req-1', otp: TEST_OTP, purpose: 'signin' }).catch((e: unknown) => e);
    expect(toUserError(error)).toMatchObject({ action: 'RESEND_OTP' });
  });

  it('rejects a payload matching neither variant', async () => {
    server.use(http.post(urls.otpVerify, () => HttpResponse.json({ data: { access_token: 'x' } })));
    await expect(verifyOtp({ requestId: 'r', otp: TEST_OTP, purpose: 'signin' })).rejects.toMatchObject({
      code: 'SCHEMA_MISMATCH',
    });
  });

  it('does not establish a session if the caller aborted meanwhile', async () => {
    const controller = new AbortController();
    server.use(
      http.post(urls.otpVerify, () => {
        controller.abort();
        return HttpResponse.json({ data: makeSession() });
      }),
    );
    await expect(
      verifyOtp({ requestId: 'r', otp: TEST_OTP, purpose: 'signin' }, { signal: controller.signal }),
    ).rejects.toMatchObject({ kind: 'cancelled' });
    expect(await getSession()).toBeNull();
  });

  it('maps a Supabase failure while establishing the session', async () => {
    server.use(
      http.post(urls.otpVerify, () => HttpResponse.json({ data: { tokenHash: 'bad' } })),
      http.post(urls.sbVerify, () =>
        HttpResponse.json({ code: 403, error_code: 'otp_expired', msg: 'Email link is invalid or has expired' }, { status: 403 }),
      ),
    );
    await expect(verifyOtp({ requestId: 'r', otp: TEST_OTP, purpose: 'signin' })).rejects.toMatchObject({
      status: 403,
    });
  });

  it('reports a missing session', async () => {
    server.use(http.post(urls.otpVerify, () => HttpResponse.json({ data: { tokenHash: 'th' } })));
    jest.spyOn(getSupabase().auth, 'verifyOtp').mockResolvedValueOnce({
      data: { session: null, user: null },
      error: null,
    });
    await expect(verifyOtp({ requestId: 'r', otp: TEST_OTP, purpose: 'signin' })).rejects.toMatchObject({
      code: 'NO_SESSION',
    });
  });
});

describe('signOut / getSession', () => {
  it('signs out locally and clears the stored session', async () => {
    await verifyOtp({ requestId: 'r', otp: TEST_OTP, purpose: 'signin' });
    await signOut();
    expect(await getSession()).toBeNull();
    expect(requestLog.some(r => r.url.startsWith(urls.sbLogout) && r.url.includes('scope=local'))).toBe(true);
  });

  it('maps errors from signOut and getSession', async () => {
    const auth = getSupabase().auth;
    const err = Object.assign(new Error('boom'), { name: 'AuthApiError', status: 500 });
    jest.spyOn(auth, 'signOut').mockResolvedValueOnce({ error: err as never });
    await expect(signOut()).rejects.toMatchObject({ kind: 'server' });
    jest.spyOn(auth, 'getSession').mockResolvedValueOnce({ data: { session: null }, error: err as never });
    await expect(getSession()).rejects.toMatchObject({ kind: 'server' });
  });
});
