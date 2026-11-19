import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { ApiError, extractMessageFromRawJson, normalizeError } from '@/api/errors';

const axiosErr = (code?: string, response?: Partial<AxiosResponse>) => {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(
    'boom',
    code,
    config,
    {},
    response
      ? ({ status: 400, statusText: '', headers: {}, config, data: undefined, ...response } as AxiosResponse)
      : undefined,
  );
};

describe('normalizeError', () => {
  it('passes ApiError through', () => {
    const e = new ApiError({ kind: 'server', message: 'x' });
    expect(normalizeError(e)).toBe(e);
  });

  it('maps axios transport failures', () => {
    expect(normalizeError(axiosErr('ECONNABORTED')).kind).toBe('timeout');
    expect(normalizeError(axiosErr('ETIMEDOUT')).kind).toBe('timeout');
    expect(normalizeError(axiosErr('ERR_CANCELED')).kind).toBe('cancelled');
    expect(normalizeError(axiosErr('ERR_NETWORK')).kind).toBe('network');
  });

  it('reads the APP envelope', () => {
    const e = normalizeError(
      axiosErr('ERR_BAD_REQUEST', {
        status: 400,
        data: { error: { code: 'bad_request', message: 'Incorrect OTP.' } },
      }),
    );
    expect(e).toMatchObject({ kind: 'validation', status: 400, code: 'bad_request', message: 'Incorrect OTP.' });
  });

  it('unwraps a raw-JSON validation message inside the APP envelope', () => {
    const raw = JSON.stringify([{ code: 'custom', path: ['phone'], message: 'Enter a valid India or UAE mobile number' }]);
    const e = normalizeError(axiosErr('ERR_BAD_REQUEST', { status: 400, data: { error: { code: 'bad_request', message: raw } } }));
    expect(e.message).toBe('Enter a valid India or UAE mobile number');
  });

  it('handles 5xx, string bodies and missing messages', () => {
    expect(normalizeError(axiosErr('ERR_BAD_RESPONSE', { status: 502, data: '<html>Bad gateway</html>' }))).toMatchObject({
      kind: 'server',
      status: 502,
    });
    expect(normalizeError(axiosErr('ERR_BAD_RESPONSE', { status: 500, data: undefined })).message).toBe('HTTP 500');
    expect(normalizeError(axiosErr('ERR_BAD_RESPONSE', { status: 503, data: { message: 'down' } })).message).toBe('down');
  });

  it('maps Supabase AuthError and PostgrestError shapes', () => {
    const auth = Object.assign(new Error('Invalid Refresh Token: Already Used'), {
      name: 'AuthApiError',
      status: 400,
      code: 'refresh_token_already_used',
    });
    expect(normalizeError(auth)).toMatchObject({ kind: 'validation', status: 400, code: 'refresh_token_already_used' });

    const pg = { code: '42703', details: null, hint: null, message: 'column x does not exist' };
    expect(normalizeError(pg)).toMatchObject({ kind: 'server', code: '42703', message: 'column x does not exist' });

    const gotrue = { error_code: 'otp_expired', msg: 'Token has expired' };
    expect(normalizeError(gotrue)).toMatchObject({ kind: 'unknown', code: 'otp_expired', message: 'Token has expired' });
  });

  it('maps Supabase network failures and aborts', () => {
    expect(normalizeError(Object.assign(new Error('Failed to fetch'), { name: 'AuthRetryableFetchError' })).kind).toBe('network');
    expect(normalizeError(new TypeError('Network request failed')).kind).toBe('network');
    expect(normalizeError(Object.assign(new Error('aborted'), { name: 'AbortError' })).kind).toBe('cancelled');
  });

  it('maps raw strings (incl. JSON) and junk', () => {
    expect(normalizeError('{"error":{"message":"Enter a valid India or UAE mobile number"}}')).toMatchObject({
      kind: 'validation',
      message: 'Enter a valid India or UAE mobile number',
    });
    expect(normalizeError('plain text').message).toBe('plain text');
    expect(normalizeError(42)).toMatchObject({ kind: 'unknown' });
    expect(normalizeError(null)).toMatchObject({ kind: 'unknown' });
    expect(normalizeError({}).kind).toBe('unknown');
  });

  it('extractMessageFromRawJson', () => {
    expect(extractMessageFromRawJson('not json')).toBeUndefined();
    expect(extractMessageFromRawJson('{broken')).toBeUndefined();
    expect(extractMessageFromRawJson('[]')).toBeUndefined();
    expect(extractMessageFromRawJson('{"error":"x"}')).toBe('x');
    expect(extractMessageFromRawJson('{"error_description":"d"}')).toBe('d');
    expect(extractMessageFromRawJson('[{"msg":"m"}]')).toBe('m');
  });
});
