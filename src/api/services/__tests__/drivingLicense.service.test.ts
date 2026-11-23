import { http, HttpResponse } from 'msw';
import { toUserError } from '@/api/errorMessages';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import {
  fetchDrivingLicense,
  saveDrivingLicense,
  uploadDrivingLicenseFile,
} from '@/api/services/drivingLicense.service';
import { ocrService } from '@/api/services/ocr.service';
import { loadProfileStep, saveProfileStep, type ProfileStepProgress } from '@/api/services/profileStep.service';
import { strings } from '@/constants/strings';
import { drivingLicenseRow, makeSession, setOnboardingBackend, UID } from '../../../../test/msw/fixtures';
import { requestLog, server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';

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

describe('drivingLicense.service (C2)', () => {
  it('fetchDrivingLicense: the row by user_id, or null', async () => {
    await expect(fetchDrivingLicense(UID)).resolves.toEqual({
      id: 'dl-1',
      dlNumber: drivingLicenseRow.dl_number,
      documentPath: drivingLicenseRow.document_path,
    });
    expect(calls('GET', urls.drivingLicenses)[0].url).toContain(`user_id=eq.${UID}`);
    setOnboardingBackend({ hasDrivingLicense: false });
    await expect(fetchDrivingLicense(UID)).resolves.toBeNull();
  });

  it('upload: driving-licenses/<uid>/<timestamp>-<sanitised name>; jpg/png/webp/pdf only', async () => {
    await expect(uploadDrivingLicenseFile(UID, JPG, NOW)).resolves.toBe(`${UID}/${NOW}-My_Licence__1_.jpg`);
    expect(uploads()).toEqual([`driving-licenses/${UID}/${NOW}-My_Licence__1_.jpg`]);
    for (const mimeType of ['image/png', 'image/webp', 'application/pdf']) {
      await expect(uploadDrivingLicenseFile(UID, { ...JPG, mimeType }, NOW)).resolves.toBeTruthy();
    }
    const error = await uploadDrivingLicenseFile(UID, { ...JPG, mimeType: 'image/heic' }).catch(e => e);
    expect(toUserError(error).userMessage).toBe(strings.errors.unsupportedFile);
  });

  it('save: upsert on_conflict=user_id with the trimmed, upper-cased number and the path', async () => {
    const saved = await saveDrivingLicense(UID, { dlNumber: '  ts0120110012345 ', documentPath: `${UID}/1-dl.jpg` });
    expect(saved).toMatchObject({ dlNumber: 'TS0120110012345', documentPath: `${UID}/1-dl.jpg` });
    const [req] = calls('POST', urls.drivingLicenses);
    expect(req.url).toContain('on_conflict=user_id');
    expect(req.headers.get('prefer')).toContain('resolution=merge-duplicates');
    expect(req.body).toEqual({ user_id: UID, dl_number: 'TS0120110012345', document_path: `${UID}/1-dl.jpg` });
  });

  it('save: the number and a document are both required (web wording)', async () => {
    const noNumber = await saveDrivingLicense(UID, { dlNumber: '  ', documentPath: 'p' }).catch(e => e);
    expect(toUserError(noNumber)).toMatchObject({ userMessage: 'Enter the licence number', field: 'dlNumber' });
    const noFile = await saveDrivingLicense(UID, { dlNumber: 'TS01', documentPath: null }).catch(e => e);
    expect(toUserError(noFile)).toMatchObject({ userMessage: 'Upload a photo or PDF of your licence', field: 'dlFile' });
    expect(calls('POST', urls.drivingLicenses)).toHaveLength(0);
  });
});

describe('ocr.service', () => {
  it('DL OCR is unavailable: the user types the number', async () => {
    expect(ocrService.isAvailable('dl')).toBe(false);
    await expect(ocrService.readDl(JPG)).resolves.toEqual({ status: 'unavailable' });
    expect(requestLog).toHaveLength(0);
  });
});

describe('profileStep.service (1/4 load + Next)', () => {
  it('load: profile + DL, files signed for display', async () => {
    server.use(
      http.get(urls.userDetails, () =>
        HttpResponse.json([{ full_name: 'Ravi', phone: '9999999999', email: null, avatar_url: `${UID}/1-a.png` }]),
      ),
    );
    const data = await loadProfileStep(UID);
    expect(data.fullName).toBe('Ravi');
    expect(data.avatarPath).toBe(`${UID}/1-a.png`);
    expect(data.avatarUrl).toContain('/object/sign/avatars/');
    expect(data.dl).toMatchObject({ dlNumber: drivingLicenseRow.dl_number, documentPath: drivingLicenseRow.document_path });
    expect(data.dl?.previewUrl).toContain('/object/sign/driving-licenses/');
  });

  it('load: a signing failure only drops the preview', async () => {
    server.use(http.post(`${urls.storageRoot}/object/sign/*`, () => HttpResponse.json({ message: 'nope' }, { status: 400 })));
    const data = await loadProfileStep(UID);
    expect(data.dl).toMatchObject({ dlNumber: drivingLicenseRow.dl_number, previewUrl: null });
  });

  it('Next: avatar upload → PATCH (name + avatar_url) → DL upload → DL upsert, in that order', async () => {
    const result = await saveProfileStep(
      UID,
      { fullName: 'Ravi Kumar', avatar: PNG, dlNumber: 'ts0120110012345', dlFile: JPG, existingDlPath: null },
      {},
      () => NOW,
    );
    expect(result).toEqual({ photoUpdated: true });
    expect(requestLog.map(r => `${r.method} ${r.url.split('?')[0].replace(urls.storageRoot, 'storage').replace(/^https:\/\/[^/]+/, '')}`)).toEqual([
      `POST storage/object/avatars/${UID}/${NOW}-me.png`,
      'PATCH /rest/v1/user_details',
      `POST storage/object/driving-licenses/${UID}/${NOW}-My_Licence__1_.jpg`,
      'POST /rest/v1/user_driving_licenses',
    ]);
    expect(calls('PATCH', urls.userDetails)[0].body).toEqual({ full_name: 'Ravi Kumar', avatar_url: `${UID}/${NOW}-me.png` });
    expect(calls('POST', urls.drivingLicenses)[0].body).toEqual({
      user_id: UID,
      dl_number: 'TS0120110012345',
      document_path: `${UID}/${NOW}-My_Licence__1_.jpg`,
    });
  });

  it('Next with nothing changed but the number: no upload, no PATCH; the saved DL file is kept', async () => {
    const result = await saveProfileStep(UID, { dlNumber: 'TS0120110012345', existingDlPath: `${UID}/old.jpg` });
    expect(result).toEqual({ photoUpdated: false });
    expect(uploads()).toEqual([]);
    expect(calls('PATCH', urls.userDetails)).toHaveLength(0);
    expect(calls('POST', urls.drivingLicenses)[0].body).toMatchObject({ document_path: `${UID}/old.jpg` });
  });

  it('"No avatar" clears avatar_url', async () => {
    await saveProfileStep(UID, { avatar: null, dlNumber: 'TS0120110012345', existingDlPath: 'p' });
    expect(calls('PATCH', urls.userDetails)[0].body).toEqual({ avatar_url: null });
  });

  it('invalid DL input fails before anything is uploaded', async () => {
    await expect(saveProfileStep(UID, { avatar: PNG, dlNumber: '', dlFile: JPG, existingDlPath: null })).rejects.toMatchObject({
      code: 'DL_NUMBER_REQUIRED',
    });
    await expect(saveProfileStep(UID, { avatar: PNG, dlNumber: 'TS01', existingDlPath: null })).rejects.toMatchObject({
      code: 'DL_FILE_REQUIRED',
    });
    expect(requestLog).toHaveLength(0);
  });

  it('retry after a failed DL save does not upload the same files again', async () => {
    const progress: ProfileStepProgress = {};
    server.use(
      http.post(urls.drivingLicenses, () => HttpResponse.json({ message: 'boom' }, { status: 500 }), { once: true }),
    );
    const input = { fullName: 'Ravi', avatar: PNG, dlNumber: 'TS0120110012345', dlFile: JPG, existingDlPath: null };
    await expect(saveProfileStep(UID, input, progress, () => NOW)).rejects.toMatchObject({ status: 500 });
    expect(uploads()).toHaveLength(2);
    requestLog.length = 0;
    await expect(saveProfileStep(UID, input, progress, () => NOW + 1)).resolves.toEqual({ photoUpdated: true });
    expect(uploads()).toEqual([]); // reused the paths from the first attempt
    expect(calls('POST', urls.drivingLicenses)[0].body).toMatchObject({ document_path: `${UID}/${NOW}-My_Licence__1_.jpg` });
  });
});
