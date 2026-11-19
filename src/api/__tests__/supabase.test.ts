import { AppState } from 'react-native';
import { __resetSupabaseForTests, bindAutoRefreshToAppState, getSupabase } from '@/api/supabase';
import { makeSession } from '../../../test/msw/fixtures';

const keychain = require('react-native-keychain').__store as Map<string, { password: string }>;

beforeEach(() => __resetSupabaseForTests());

describe('supabase client', () => {
  it('is a singleton that persists the session in the Keychain', async () => {
    expect(getSupabase()).toBe(getSupabase());
    const session = makeSession();
    const { error } = await getSupabase().auth.setSession(session);
    expect(error).toBeNull();
    const stored = [...keychain.values()].map(v => v.password).join();
    expect(stored).toContain(session.refresh_token);
  });

  it('starts auto-refresh only while active', () => {
    const listeners: Array<(s: string) => void> = [];
    const remove = jest.fn();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, fn) => {
      listeners.push(fn as (s: string) => void);
      return { remove };
    });
    const auth = getSupabase().auth;
    const start = jest.spyOn(auth, 'startAutoRefresh').mockResolvedValue();
    const stop = jest.spyOn(auth, 'stopAutoRefresh').mockResolvedValue();

    const unbind = bindAutoRefreshToAppState();
    listeners[0]('active');
    expect(start).toHaveBeenCalled();
    listeners[0]('background');
    expect(stop).toHaveBeenCalled();
    unbind();
    expect(remove).toHaveBeenCalled();
  });
});
