import { http, HttpResponse } from 'msw';
import { fetchBootstrap } from '@/api/services/user.service';
import { __resetSupabaseForTests, getSupabase } from '@/api/supabase';
import { authUser, makeSession, permissionsRows, UID } from '../../../../test/msw/fixtures';
import { requestLog, server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';

beforeEach(async () => {
  __resetSupabaseForTests();
  requestLog.length = 0;
  await getSupabase().auth.setSession(makeSession());
});

describe('fetchBootstrap', () => {
  it('combines auth user, user_details (by id), roles and permissions', async () => {
    const user = await fetchBootstrap(UID);
    expect(user).toEqual({
      id: UID,
      fullName: 'Test User',
      phone: '9999999999',
      roles: ['user'],
      permissions: permissionsRows,
    });
    const details = requestLog.find(r => r.url.startsWith(urls.userDetails));
    expect(details?.url).toContain(`id=eq.${UID}`);
    expect(details?.headers.get('apikey')).toBe('test-anon-key');
    expect(requestLog.find(r => r.url.startsWith(urls.userRoles))?.url).toContain(`user_id=eq.${UID}`);
  });

  it('falls back to user_metadata when user_details has no row, and dedupes array-embedded roles', async () => {
    server.use(
      http.get(urls.userDetails, () => HttpResponse.json([])),
      http.get(urls.userRoles, () =>
        HttpResponse.json([{ roles: [{ name: 'vendor' }, { name: 'user' }] }, { roles: { name: 'vendor' } }, { roles: null }]),
      ),
      http.post(urls.myPermissions, () => HttpResponse.json(null)),
    );
    const user = await fetchBootstrap(UID);
    expect(user.fullName).toBe(authUser.user_metadata.full_name);
    expect(user.phone).toBe(authUser.user_metadata.phone);
    expect(user.roles).toEqual(['vendor', 'user']);
    expect(user.permissions).toEqual([]);
  });

  it('treats roles and permissions as best-effort', async () => {
    server.use(
      http.get(urls.userRoles, () => HttpResponse.json({ code: '500', message: 'x' }, { status: 500 })),
      http.post(urls.myPermissions, () => HttpResponse.json({ code: '500', message: 'y' }, { status: 500 })),
    );
    const user = await fetchBootstrap(UID);
    expect(user.roles).toEqual([]);
    expect(user.permissions).toEqual([]);
  });

  it('fails when user_details or the auth user fails, or the user does not match', async () => {
    server.use(
      http.get(urls.userDetails, () =>
        HttpResponse.json({ code: '42703', message: 'column does not exist', details: null, hint: null }, { status: 400 }),
      ),
    );
    await expect(fetchBootstrap(UID)).rejects.toMatchObject({ code: '42703' });

    server.resetHandlers();
    await expect(fetchBootstrap('someone-else')).rejects.toMatchObject({ code: 'USER_MISMATCH' });

    server.use(http.get(urls.sbUser, () => HttpResponse.json({ msg: 'JWT expired' }, { status: 401 })));
    await expect(fetchBootstrap(UID)).rejects.toMatchObject({ status: 401 });
  });

  it('rejects malformed rows', async () => {
    server.use(http.get(urls.userDetails, () => HttpResponse.json([{ full_name: 'no id' }])));
    await expect(fetchBootstrap(UID)).rejects.toMatchObject({ code: 'SCHEMA_MISMATCH' });
  });
});
