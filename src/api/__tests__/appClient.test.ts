import NetInfo from '@react-native-community/netinfo';
import { delay, http, HttpResponse } from 'msw';
import { __resetAppClientForTests, appPost, getAppClient } from '@/api/appClient';
import { ENDPOINTS } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import { __resetSupabaseForTests, getSupabase } from '@/api/supabase';
import { makeSession } from '../../../test/msw/fixtures';
import { requestLog, server } from '../../../test/msw/server';
import { urls } from '../../../test/msw/urls';

const path = ENDPOINTS.APP.AUTH.OTP_REQUEST;

beforeEach(() => {
  __resetAppClientForTests();
  __resetSupabaseForTests();
  requestLog.length = 0;
});

describe('appClient', () => {
  it('unwraps { data } and sends JSON without a token when signed out', async () => {
    const data = await appPost(path, { phone: '9999999999', purpose: 'signin' });
    expect(data).toEqual({ requestId: 'req-1', isNewUser: false });
    const sent = requestLog.at(-1);
    expect(sent?.headers.get('authorization')).toBeNull();
    expect(sent?.headers.get('content-type')).toContain('application/json');
    expect(getAppClient().defaults.timeout).toBe(15000);
  });

  it('adds the Bearer token from the Supabase session', async () => {
    const session = makeSession();
    await getSupabase().auth.setSession(session);
    await appPost(path, {});
    expect(requestLog.at(-1)?.headers.get('authorization')).toBe(`Bearer ${session.access_token}`);
  });

  it('throws ApiError for an { error } envelope (4xx and 2xx)', async () => {
    server.use(
      http.post(urls.otpRequest, () =>
        HttpResponse.json({ error: { code: 'bad_request', message: 'Incorrect OTP.' } }, { status: 400 }),
      ),
    );
    await expect(appPost(path, {})).rejects.toMatchObject({
      kind: 'validation',
      status: 400,
      message: 'Incorrect OTP.',
    });

    server.use(http.post(urls.otpRequest, () => HttpResponse.json({ error: { message: 7 } })));
    await expect(appPost(path, {})).rejects.toMatchObject({ kind: 'validation', message: 'Unknown error', status: 200 });
  });

  it('passes through bodies without an envelope', async () => {
    server.use(http.post(urls.otpRequest, () => HttpResponse.json(['raw'])));
    await expect(appPost(path, {})).resolves.toEqual(['raw']);
  });

  it('maps 500, network failure and timeout', async () => {
    server.use(http.post(urls.otpRequest, () => HttpResponse.json({ message: 'Internal' }, { status: 500 })));
    await expect(appPost(path, {})).rejects.toMatchObject({ kind: 'server', status: 500 });

    server.use(http.post(urls.otpRequest, () => HttpResponse.error()));
    await expect(appPost(path, {})).rejects.toMatchObject({ kind: 'network' });

    server.use(
      http.post(urls.otpRequest, async () => {
        await delay(200);
        return HttpResponse.json({ data: {} });
      }),
    );
    getAppClient().defaults.timeout = 30;
    await expect(appPost(path, {})).rejects.toMatchObject({ kind: 'timeout' });
  });

  it('fails fast while offline without hitting the network', async () => {
    (NetInfo.fetch as jest.Mock).mockResolvedValueOnce({ isConnected: false });
    await expect(appPost(path, {})).rejects.toEqual(expect.objectContaining({ kind: 'network' }));
    expect(requestLog).toHaveLength(0);
  });

  it('reports aborted requests as cancelled', async () => {
    server.use(
      http.post(urls.otpRequest, async () => {
        await delay(200);
        return HttpResponse.json({ data: {} });
      }),
    );
    const controller = new AbortController();
    const p = appPost(path, {}, { signal: controller.signal });
    setTimeout(() => controller.abort(), 10);
    const error = await p.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('cancelled');
  });
});
