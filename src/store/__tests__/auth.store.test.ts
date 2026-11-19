import { http, HttpResponse } from 'msw';
import { act } from '@testing-library/react-native';
import { __resetAppClientForTests } from '@/api/appClient';
import { queryClient } from '@/api/queryClient';
import { verifyOtp } from '@/api/services/auth.service';
import { __resetSupabaseForTests, getSupabase } from '@/api/supabase';
import { strings } from '@/constants/strings';
import { queryKeys } from '@/hooks/api/queryKeys';
import { __resetAuthStoreForTests, useAuthStore } from '@/store/auth.store';
import { makeSession, TEST_OTP, UID } from '../../../test/msw/fixtures';
import { server } from '../../../test/msw/server';
import { urls } from '../../../test/msw/urls';

const state = () => useAuthStore.getState();
const flush = () => new Promise<void>(r => setTimeout(r, 20));
const waitFor = async (pred: () => boolean, ms = 2000) => {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > ms) {
      throw new Error(`timeout; status=${state().status}`);
    }
    await flush();
  }
};

const keychain = require('react-native-keychain').__store as Map<string, { password: string }>;

/** Make the stored session look expired (as after the app sat closed for > 1 h). */
function expireStoredSession() {
  for (const [service, item] of keychain) {
    const parsed = JSON.parse(item.password) as { expires_at?: number };
    if (parsed.expires_at) {
      parsed.expires_at = Math.floor(Date.now() / 1000) - 60;
      keychain.set(service, { ...item, password: JSON.stringify(parsed) });
    }
  }
}

/** Put a session in the Keychain as if a previous app run had signed in. */
async function storePreviousSession(expired = false) {
  await getSupabase().auth.setSession(makeSession());
  if (expired) {
    expireStoredSession();
  }
  __resetSupabaseForTests(); // new client = "app relaunch", same Keychain
}

beforeEach(() => {
  __resetAuthStoreForTests();
  __resetSupabaseForTests();
  __resetAppClientForTests();
  queryClient.clear();
});
afterEach(() => __resetAuthStoreForTests());

describe('auth store', () => {
  it('launch without a session → signedOut', async () => {
    await act(() => state().hydrate());
    expect(state().status).toBe('signedOut');
    await state().hydrate(); // idempotent
  });

  it('launch with a stored session → signedIn with the bootstrapped user', async () => {
    await storePreviousSession();
    await act(() => state().hydrate());
    expect(state().status).toBe('signedIn');
    expect(state().user).toMatchObject({ id: UID, fullName: 'Test User', roles: ['user'] });
    expect(queryClient.getQueryData(queryKeys.bootstrap(UID))).toBeTruthy();
  });

  it('launch with an expired session refreshes it, then signs in', async () => {
    await storePreviousSession(true);
    await act(() => state().hydrate());
    expect(state().status).toBe('signedIn');
  });

  it('launch with a revoked refresh token → signedOut + "session expired"', async () => {
    await storePreviousSession(true);
    server.use(
      http.post(urls.sbToken, () =>
        HttpResponse.json({ error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token' }, { status: 400 }),
      ),
    );
    await act(() => state().hydrate());
    expect(state().status).toBe('signedOut');
    expect(state().notice?.message).toBe(strings.errors.sessionExpired);
  });

  it('launch offline with an expired session → signedOut after the hydrate timeout, session kept', async () => {
    __resetAuthStoreForTests(300);
    await storePreviousSession(true);
    server.use(http.post(urls.sbToken, () => HttpResponse.error()));
    await act(() => state().hydrate());
    expect(state().status).toBe('signedOut');
    expect(state().notice).toBeNull();
    expect(keychain.size).toBeGreaterThan(0);

    // Back online: supabase-js' pending refresh retry succeeds → TOKEN_REFRESHED → signedIn.
    server.use(http.post(urls.sbToken, () => HttpResponse.json(makeSession())));
    await act(() => waitFor(() => state().status === 'signedIn', 8000));
  }, 15000);

  it('OTP verify → SIGNED_IN → bootstrap → signedIn (no manual navigation)', async () => {
    await act(() => state().hydrate());
    expect(state().status).toBe('signedOut');
    await act(async () => {
      await verifyOtp({ requestId: 'r', otp: TEST_OTP, purpose: 'signin' });
      await waitFor(() => state().status === 'signedIn');
    });
    expect(state().user?.fullName).toBe('Test User');
  });

  it('bootstrap failure → local sign-out + error notice', async () => {
    server.use(
      http.get(urls.userDetails, () => HttpResponse.json({ code: '42501', message: 'permission denied' }, { status: 403 })),
    );
    await storePreviousSession();
    await act(() => state().hydrate());
    expect(state().status).toBe('signedOut');
    expect(state().notice?.message).toBe(strings.errors.generic);
    expect((await getSupabase().auth.getSession()).data.session).toBeNull();
  });

  it('bootstrap network failure keeps the user in with session data (partial)', async () => {
    server.use(http.get(urls.userDetails, () => HttpResponse.error()));
    await storePreviousSession();
    await act(() => state().hydrate());
    expect(state().status).toBe('signedIn');
    expect(state().user).toMatchObject({ partial: true, fullName: 'Test User', roles: [] });
  });

  it('refresh rejected while signed in → signedOut + "session expired"', async () => {
    await storePreviousSession();
    await act(() => state().hydrate());
    expect(state().status).toBe('signedIn');
    server.use(
      http.post(urls.sbToken, () =>
        HttpResponse.json(
          { error_code: 'refresh_token_already_used', msg: 'Invalid Refresh Token: Already Used' },
          { status: 400 },
        ),
      ),
    );
    expireStoredSession(); // only an expired access token makes supabase-js drop the session
    await act(async () => {
      await getSupabase().auth.refreshSession();
      await waitFor(() => state().status === 'signedOut');
    });
    expect(state().notice?.message).toBe(strings.errors.sessionExpired);
  });

  it('token refresh keeps the user and updates the session', async () => {
    await storePreviousSession();
    await act(() => state().hydrate());
    const before = state().session?.access_token;
    await act(async () => {
      await getSupabase().auth.refreshSession();
      await waitFor(() => state().session?.access_token !== before);
    });
    expect(state().status).toBe('signedIn');
  });

  it('signOut → signedOut, Keychain + query cache cleared, no expired notice', async () => {
    await storePreviousSession();
    await act(() => state().hydrate());
    await act(async () => {
      await state().signOut();
      await flush();
    });
    expect(state()).toMatchObject({ status: 'signedOut', user: null, session: null, notice: null });
    expect(queryClient.getQueryData(queryKeys.bootstrap(UID))).toBeUndefined();
    expect((await getSupabase().auth.getSession()).data.session).toBeNull();
  });

  it('signOut still succeeds locally when the network call fails', async () => {
    await storePreviousSession();
    await act(() => state().hydrate());
    server.use(http.post(urls.sbLogout, () => HttpResponse.error()));
    jest.spyOn(getSupabase().auth, 'signOut').mockResolvedValueOnce({
      error: Object.assign(new Error('fetch failed'), { name: 'AuthRetryableFetchError' }) as never,
    });
    await act(() => state().signOut());
    expect(state().status).toBe('signedOut');
  });

  it('clearNotice', async () => {
    useAuthStore.setState({ notice: { id: 1, type: 'error', message: 'x' } });
    state().clearNotice();
    expect(state().notice).toBeNull();
  });

  it('hydrate: getSession throwing → signedOut; rejected → expired notice, network → none', async () => {
    const authErr = Object.assign(new Error('Invalid Refresh Token'), { name: 'AuthApiError', status: 400 });
    jest.spyOn(getSupabase().auth, 'getSession').mockResolvedValueOnce({ data: { session: null }, error: authErr as never });
    await act(() => state().hydrate());
    expect(state()).toMatchObject({ status: 'signedOut', notice: { message: strings.errors.sessionExpired } });

    __resetAuthStoreForTests();
    __resetSupabaseForTests();
    const netErr = Object.assign(new Error('fetch failed'), { name: 'AuthRetryableFetchError' });
    jest.spyOn(getSupabase().auth, 'getSession').mockResolvedValueOnce({ data: { session: null }, error: netErr as never });
    await act(() => state().hydrate());
    expect(state()).toMatchObject({ status: 'signedOut', notice: null });
  });

  it('a bootstrap that finishes after sign-out is ignored (success and failure)', async () => {
    let release: () => void = () => undefined;
    let gate = new Promise<void>(r => (release = r));
    let fail = false;
    server.use(
      http.get(urls.userDetails, async () => {
        await gate;
        return fail
          ? HttpResponse.json({ code: '42501', message: 'denied' }, { status: 403 })
          : HttpResponse.json([{ id: UID, full_name: 'Late' }]);
      }),
    );
    await storePreviousSession();
    const hydrating = state().hydrate();
    await flush();
    await state().signOut();
    release();
    await act(() => hydrating);
    expect(state()).toMatchObject({ status: 'signedOut', user: null, notice: null });

    // Same race, bootstrap fails late: no notice, no second sign-out side effects.
    __resetAuthStoreForTests();
    __resetSupabaseForTests();
    fail = true;
    gate = new Promise<void>(r => (release = r));
    await storePreviousSession();
    const second = state().hydrate();
    await flush();
    await state().signOut();
    release();
    await act(() => second);
    expect(state()).toMatchObject({ status: 'signedOut', notice: null });
  });

  it('dedupes concurrent bootstraps for the same user', async () => {
    let calls = 0;
    server.use(
      http.get(urls.userDetails, async () => {
        calls += 1;
        await new Promise<void>(r => setTimeout(r, 30));
        return HttpResponse.json([{ id: UID, full_name: 'Test User' }]);
      }),
    );
    await storePreviousSession();
    await act(async () => {
      const a = state().hydrate();
      // A SIGNED_IN for the same user while hydrate's bootstrap is in flight.
      await getSupabase().auth.setSession(makeSession());
      await a;
      await flush();
    });
    expect(state().status).toBe('signedIn');
    expect(calls).toBe(1);
  });

  it('fallback user from session copes with missing metadata', async () => {
    const session = makeSession();
    server.use(
      http.get(urls.userDetails, () => HttpResponse.error()),
      http.get(urls.sbUser, () => HttpResponse.json({ ...session.user, user_metadata: { full_name: 7 } })),
    );
    await getSupabase().auth.setSession(session);
    __resetSupabaseForTests();
    await act(() => state().hydrate());
    expect(state().user).toMatchObject({ partial: true, fullName: '', phone: '' });
  });
});

