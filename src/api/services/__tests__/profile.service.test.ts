import { http, HttpResponse } from 'msw';
import { toUserError } from '@/api/errorMessages';
import { ENDPOINTS, STORAGE_PATHS, sanitiseFileName } from '@/api/endpoints';
import { readLocalFile } from '@/api/files';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { avatarUrl, fetchProfile, updateProfile, uploadAvatar } from '@/api/services/profile.service';
import { getSignedUrl, removeFile, uploadFile } from '@/api/services/storage.service';
import { strings } from '@/constants/strings';
import { makeSession, UID } from '../../../../test/msw/fixtures';
import { requestLog, server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';

const { STORAGE } = ENDPOINTS.SUPABASE;
const JPG = { uri: 'file:///tmp/My Licence (1).jpg', name: 'My Licence (1).jpg', mimeType: 'image/jpeg' };
const PNG = { uri: 'file:///tmp/me.png', name: 'me.png', mimeType: 'image/png' };
const NOW = 1795400000000;

const uploads = () =>
  requestLog
    .filter(r => r.method === 'POST' && r.url.startsWith(`${urls.storageRoot}/object/`) && !r.url.includes('/object/sign/'))
    .map(r => decodeURIComponent(r.url.slice(`${urls.storageRoot}/object/`.length)));
const calls = (method: string, url: string) => requestLog.filter(r => r.method === method && r.url.startsWith(url));

beforeEach(async () => {
  __resetSupabaseForTests();
  await getSupabase().auth.setSession(makeSession());
  requestLog.length = 0;
});

describe('storage paths (endpoints.ts)', () => {
  it('<uid>/<timestamp>-<name>, unsafe characters replaced like the web', () => {
    expect(sanitiseFileName('My Licence (1).jpg')).toBe('My_Licence__1_.jpg');
    expect(STORAGE_PATHS.avatar(UID, NOW, 'avatar-07.png')).toBe(`${UID}/${NOW}-avatar-07.png`);
    expect(STORAGE_PATHS.drivingLicense(UID, NOW, JPG.name)).toBe(`${UID}/${NOW}-My_Licence__1_.jpg`);
  });
});

describe('storage.service', () => {
  it('uploads the file bytes with its content type (upsert) and returns the path', async () => {
    await expect(uploadFile(STORAGE.AVATARS, `${UID}/x.png`, PNG)).resolves.toBe(`${UID}/x.png`);
    expect(readLocalFile).toHaveBeenCalledWith(PNG.uri);
    const [req] = calls('POST', `${urls.storageRoot}/object/avatars/`);
    expect(req.headers.get('content-type')).toBe('image/png');
    expect(req.headers.get('x-upsert')).toBe('true');
    expect(req.headers.get('authorization')).toMatch(/^Bearer /);
  });

  it('maps storage failures (413 → "File must be 10 MB or smaller")', async () => {
    server.use(
      http.post(`${urls.storageRoot}/object/*`, () =>
        HttpResponse.json({ statusCode: '413', error: 'Payload too large', message: 'The object exceeded the maximum allowed size' }, { status: 413 }),
      ),
    );
    const error = await uploadFile(STORAGE.AVATARS, `${UID}/x.png`, PNG).catch(e => e);
    expect(error).toMatchObject({ name: 'ApiError', status: 413 });
    expect(toUserError(error).userMessage).toBe(strings.errors.fileTooLarge);
  });

  it('signed URLs are cached until a minute before they expire', async () => {
    let now = NOW;
    const clock = () => now;
    const first = await getSignedUrl(STORAGE.AVATARS, `${UID}/a.png`, clock);
    expect(first).toMatch(/\/storage\/v1\/object\/sign\/avatars\/.+\?token=/);
    expect(JSON.parse(JSON.stringify(calls('POST', `${urls.storageRoot}/object/sign/`)[0].body))).toEqual({ expiresIn: 3600 });
    now += 3000 * 1000; // 50 min later: still cached
    expect(await getSignedUrl(STORAGE.AVATARS, `${UID}/a.png`, clock)).toBe(first);
    expect(calls('POST', `${urls.storageRoot}/object/sign/`)).toHaveLength(1);
    now += 560 * 1000; // 59 min 20 s: within the margin → re-signed
    await getSignedUrl(STORAGE.AVATARS, `${UID}/a.png`, clock);
    expect(calls('POST', `${urls.storageRoot}/object/sign/`)).toHaveLength(2);
  });

  it('removeFile deletes the object', async () => {
    await removeFile(STORAGE.AVATARS, `${UID}/a.png`);
    expect(calls('DELETE', `${urls.storageRoot}/object/avatars`)).toHaveLength(1);
  });
});

describe('profile.service (C1)', () => {
  it('fetchProfile reads full_name, phone and the avatar path from user_details by id', async () => {
    await expect(fetchProfile(UID)).resolves.toEqual({ fullName: 'Test User', phone: '9999999999', avatarPath: null });
    const [req] = calls('GET', urls.userDetails);
    expect(req.url).toContain(`id=eq.${UID}`);
    expect(decodeURIComponent(req.url)).toContain('select=full_name,email,phone,avatar_url');
  });

  it('updateProfile PATCHes only the given fields (never email / DOB)', async () => {
    await updateProfile(UID, { fullName: 'Ravi Kumar', avatarPath: `${UID}/1-a.png` });
    const [req] = calls('PATCH', urls.userDetails);
    expect(req.url).toContain(`id=eq.${UID}`);
    expect(req.body).toEqual({ full_name: 'Ravi Kumar', avatar_url: `${UID}/1-a.png` });
    requestLog.length = 0;
    await updateProfile(UID, {});
    expect(calls('PATCH', urls.userDetails)).toHaveLength(0);
  });

  it('a PATCH that updates no row (RLS) is an error', async () => {
    server.use(http.patch(urls.userDetails, () => HttpResponse.json([])));
    const error = await updateProfile(UID, { fullName: 'X' }).catch(e => e);
    expect(error).toMatchObject({ code: 'NOT_UPDATED' });
    expect(toUserError(error).userMessage).toBe(strings.errors.notAllowed);
  });

  it('uploadAvatar → avatars/<uid>/<timestamp>-<name>; avatarUrl signs it', async () => {
    await expect(uploadAvatar(UID, PNG, NOW)).resolves.toBe(`${UID}/${NOW}-me.png`);
    expect(uploads()).toEqual([`avatars/${UID}/${NOW}-me.png`]);
    await expect(avatarUrl(`${UID}/${NOW}-me.png`)).resolves.toContain('/object/sign/avatars/');
  });

  it('a malformed row fails validation', async () => {
    server.use(http.get(urls.userDetails, () => HttpResponse.json([{ full_name: 42 }])));
    await expect(fetchProfile(UID)).rejects.toMatchObject({ code: 'SCHEMA_MISMATCH' });
  });
});

