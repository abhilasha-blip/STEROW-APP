import { http, HttpResponse } from 'msw';
import { toUserError } from '@/api/errorMessages';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import {
  fetchDrivingLicense,
  saveDrivingLicense,
  uploadDrivingLicenseFile,
} from '@/api/services/drivingLicense.service';
import { ocrService } from '@/api/services/ocr.service';
import {
  loadDrivingLicenceStep,
  saveDrivingLicenceStep,
  type DrivingLicenceStepProgress,
} from '@/api/services/drivingLicenceStep.service';
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
      issuedOn: null,
      validUpto: null,
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
    expect(req.body).toEqual({
      user_id: UID,
      dl_number: 'TS0120110012345',
      document_path: `${UID}/1-dl.jpg`,
      issued_on: null,
      valid_upto: null,
    });
  });

  it('save: Issued on / Valid up to as YYYY-MM-DD; read back on the model', async () => {
    const saved = await saveDrivingLicense(UID, {
      dlNumber: 'TS0120110012345',
      documentPath: 'p',
      issuedOn: '2020-01-15',
      validUpto: '2040-01-14',
    });
    expect(calls('POST', urls.drivingLicenses)[0].body).toMatchObject({ issued_on: '2020-01-15', valid_upto: '2040-01-14' });
    expect(saved).toMatchObject({ issuedOn: '2020-01-15', validUpto: '2040-01-14' });
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

describe('profileStep.service (1/3 load + Next)', () => {
  it('load: the profile, the avatar signed for display', async () => {
    server.use(
      http.get(urls.userDetails, () =>
        HttpResponse.json([{ full_name: 'Ravi', phone: '9999999999', email: null, avatar_url: `${UID}/1-a.png` }]),
      ),
    );
    const data = await loadProfileStep(UID);
    expect(data).toMatchObject({ fullName: 'Ravi', avatarPath: `${UID}/1-a.png` });
    expect(data.avatarUrl).toContain('/object/sign/avatars/');
    expect(calls('GET', urls.drivingLicenses)).toHaveLength(0); // the DL has its own step now
  });

  it('Next: avatar upload → PATCH (name + avatar_url)', async () => {
    const result = await saveProfileStep(UID, { fullName: 'Ravi Kumar', avatar: PNG }, {}, () => NOW);
    expect(result).toEqual({ photoUpdated: true, profileUpdated: true });
    expect(uploads()).toEqual([`avatars/${UID}/${NOW}-me.png`]);
    expect(calls('PATCH', urls.userDetails)[0].body).toEqual({ full_name: 'Ravi Kumar', avatar_url: `${UID}/${NOW}-me.png` });
  });

  it('Next with nothing changed sends nothing', async () => {
    await expect(saveProfileStep(UID, {})).resolves.toEqual({ photoUpdated: false, profileUpdated: false });
    expect(requestLog).toHaveLength(0);
  });

  it('name only → "Profile saved" case; "No avatar" clears avatar_url', async () => {
    await expect(saveProfileStep(UID, { fullName: 'Ravi' })).resolves.toEqual({ photoUpdated: false, profileUpdated: true });
    await saveProfileStep(UID, { avatar: null });
    expect(calls('PATCH', urls.userDetails).map(r => r.body)).toEqual([{ full_name: 'Ravi' }, { avatar_url: null }]);
  });

  it('retry after a failed PATCH does not upload the avatar again', async () => {
    const progress: ProfileStepProgress = {};
    server.use(http.patch(urls.userDetails, () => HttpResponse.json({ message: 'boom' }, { status: 500 }), { once: true }));
    await expect(saveProfileStep(UID, { avatar: PNG }, progress, () => NOW)).rejects.toMatchObject({ status: 500 });
    await saveProfileStep(UID, { avatar: PNG }, progress, () => NOW + 1);
    expect(uploads()).toHaveLength(1);
  });
});

describe('drivingLicenceStep.service (2/3 load + Next)', () => {
  it('load: the licence with dates, the file signed for display; none → null', async () => {
    server.use(
      http.get(urls.drivingLicenses, () =>
        HttpResponse.json([{ ...drivingLicenseRow, issued_on: '2020-01-15', valid_upto: '2040-01-14' }]),
      ),
    );
    const data = await loadDrivingLicenceStep(UID);
    expect(data).toMatchObject({
      dlNumber: drivingLicenseRow.dl_number,
      documentPath: drivingLicenseRow.document_path,
      issuedOn: '2020-01-15',
      validUpto: '2040-01-14',
    });
    expect(data?.previewUrl).toContain('/object/sign/driving-licenses/');
    server.resetHandlers();
    setOnboardingBackend({ hasDrivingLicense: false });
    await expect(loadDrivingLicenceStep(UID)).resolves.toBeNull();
  });

  it('load: a signing failure only drops the preview', async () => {
    server.use(http.post(`${urls.storageRoot}/object/sign/*`, () => HttpResponse.json({ message: 'nope' }, { status: 400 })));
    await expect(loadDrivingLicenceStep(UID)).resolves.toMatchObject({ previewUrl: null });
  });

  it('Next: DL upload → upsert with number, path and dates', async () => {
    await saveDrivingLicenceStep(
      UID,
      { dlNumber: 'ts0120110012345', dlFile: JPG, existingDlPath: null, issuedOn: '2020-01-15', validUpto: null },
      {},
      () => NOW,
    );
    expect(uploads()).toEqual([`driving-licenses/${UID}/${NOW}-My_Licence__1_.jpg`]);
    expect(calls('POST', urls.drivingLicenses)[0].body).toEqual({
      user_id: UID,
      dl_number: 'TS0120110012345',
      document_path: `${UID}/${NOW}-My_Licence__1_.jpg`,
      issued_on: '2020-01-15',
      valid_upto: null,
    });
  });

  it('the saved file is kept when no new file was picked', async () => {
    await saveDrivingLicenceStep(UID, {
      dlNumber: 'TS0120110012345',
      existingDlPath: `${UID}/old.jpg`,
      issuedOn: null,
      validUpto: null,
    });
    expect(uploads()).toEqual([]);
    expect(calls('POST', urls.drivingLicenses)[0].body).toMatchObject({ document_path: `${UID}/old.jpg` });
  });

  it('invalid input fails before anything is uploaded', async () => {
    const base = { existingDlPath: null, issuedOn: null, validUpto: null };
    await expect(saveDrivingLicenceStep(UID, { ...base, dlNumber: '', dlFile: JPG })).rejects.toMatchObject({
      code: 'DL_NUMBER_REQUIRED',
    });
    await expect(saveDrivingLicenceStep(UID, { ...base, dlNumber: 'TS01' })).rejects.toMatchObject({ code: 'DL_FILE_REQUIRED' });
    expect(requestLog).toHaveLength(0);
  });

  it('retry after a failed upsert does not upload the file again', async () => {
    const progress: DrivingLicenceStepProgress = {};
    server.use(http.post(urls.drivingLicenses, () => HttpResponse.json({ message: 'boom' }, { status: 500 }), { once: true }));
    const input = { dlNumber: 'TS0120110012345', dlFile: JPG, existingDlPath: null, issuedOn: null, validUpto: null };
    await expect(saveDrivingLicenceStep(UID, input, progress, () => NOW)).rejects.toMatchObject({ status: 500 });
    await saveDrivingLicenceStep(UID, input, progress, () => NOW + 1);
    expect(uploads()).toHaveLength(1);
    // (the failing override doesn't log; the logged upsert is the successful retry)
    expect(calls('POST', urls.drivingLicenses)[0].body).toMatchObject({ document_path: `${UID}/${NOW}-My_Licence__1_.jpg` });
  });
});
