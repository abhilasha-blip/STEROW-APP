import { logger, redact } from '@/utils/logger';

describe('logger', () => {
  it('redacts secrets, phones and JWTs', () => {
    const out = redact({
      phone: '9876543210',
      otp: '123456',
      requestId: 'abc',
      access_token: 'eyJhbGciOi.eyJzdWIiOi.sig',
      nested: { refresh_token: 'r', note: 'call 9876543210', jwt: 'Bearer eyJa.eyJb.c' },
      list: [{ apikey: 'k' }],
      count: 3,
      flag: true,
    });
    expect(out).toEqual({
      phone: '********10',
      otp: '[REDACTED]',
      requestId: '[REDACTED]',
      access_token: '[REDACTED]',
      nested: { refresh_token: '[REDACTED]', note: 'call ********10', jwt: 'Bearer [JWT]' },
      list: [{ apikey: '[REDACTED]' }],
      count: 3,
      flag: true,
    });
  });

  it('stops at a max depth', () => {
    const deep = { a: { b: { c: { d: { e: { f: { g: { h: 1 } } } } } } } };
    expect(JSON.stringify(redact(deep))).toContain('[…]');
  });

  it('logs only in dev, always redacted', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);
    const err = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    logger.debug('otp for 9876543210', { otp: '123456' });
    logger.warn('w');
    logger.info('i');
    logger.error('e');
    expect(spy).toHaveBeenCalledWith('[sterow] otp for ********10', { otp: '[REDACTED]' });
    expect(warn).toHaveBeenCalled();
    expect(info).toHaveBeenCalled();
    expect(err).toHaveBeenCalled();
  });
});
