import { EnvError, getEnv, parseEnv } from '@/config/env';

const valid = {
  APP_API_BASE_URL: 'https://app.example.com/api/public/v1/',
  SUPABASE_URL: 'https://p.supabase.co',
  SUPABASE_ANON_KEY: 'key',
  TEST_PHONE: '9999999999',
};

describe('env', () => {
  it('parses, trims trailing slashes and keeps TEST_PHONE in dev only', () => {
    expect(parseEnv(valid, true)).toEqual({
      APP_API_BASE_URL: 'https://app.example.com/api/public/v1',
      SUPABASE_URL: 'https://p.supabase.co',
      SUPABASE_ANON_KEY: 'key',
      TEST_PHONE: '9999999999',
    });
    expect(parseEnv(valid, false).TEST_PHONE).toBeUndefined();
  });

  it('throws a clear error naming missing variables', () => {
    expect(() => parseEnv({ ...valid, SUPABASE_ANON_KEY: undefined }, true)).toThrow(EnvError);
    expect(() => parseEnv({ ...valid, SUPABASE_ANON_KEY: undefined }, true)).toThrow(
      /SUPABASE_ANON_KEY: missing/,
    );
  });

  it('rejects non-https URLs', () => {
    expect(() => parseEnv({ ...valid, SUPABASE_URL: 'http://p.supabase.co' }, true)).toThrow(
      /SUPABASE_URL: invalid/,
    );
  });

  it('reads react-native-config once', () => {
    expect(getEnv()).toBe(getEnv());
    expect(getEnv().SUPABASE_ANON_KEY).toBe('test-anon-key');
  });
});
