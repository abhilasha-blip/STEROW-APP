import { http, HttpResponse } from 'msw';
import { Image } from 'react-native';
import { fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { strings } from '@/constants/strings';
import { localFileFromUri, toProfileStepSave } from '@/hooks/api/useProfileStep';
import type { ProfileStepData } from '@/api/services/profileStep.service';
import { EMPTY_PROFILE } from '@/screens/onboarding/useOnboardingProfileForm';
import { setOnboardingBackend, TEST_OTP, UID } from '../../../test/msw/fixtures';
import { requestLog, server } from '../../../test/msw/server';
import { urls } from '../../../test/msw/urls';
import { goToVerify, typeOtp } from '../../../test/flows';
import { renderApp, resetAppState } from '../../../test/render';

const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;

beforeEach(() => {
  resetAppState();
  mockedLibrary.mockReset();
  // Jest's asset transform has no packager URI; on device this is the bundled PNG's uri.
  jest.spyOn(Image, 'resolveAssetSource').mockImplementation(() => ({
    uri: 'asset:/avatar.png',
    width: 96,
    height: 96,
    scale: 1,
  }));
});
afterEach(resetAppState);

async function newUserOnStep1() {
  setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 0 });
  await renderApp();
  await goToVerify();
  await typeOtp(TEST_OTP);
  await screen.findByTestId('onboarding-profile');
  requestLog.length = 0;
}

async function pickDlPhoto(uri = 'file:///tmp/dl.jpg') {
  mockedLibrary.mockResolvedValueOnce({ assets: [{ uri, type: 'image/jpeg', fileName: 'dl.jpg', fileSize: 2048 }] });
  await fireEvent.press(screen.getByTestId('dl-upload-empty'));
  await fireEvent.press(await screen.findByTestId('dl-photo-source-gallery'));
  await screen.findByTestId('dl-upload-image');
}

async function fillPersonal() {
  await fireEvent.press(screen.getByTestId('dob'));
  const picker = await screen.findByTestId('dob-picker');
  await act(() => picker.props.onChange({ type: 'set' }, new Date(1990, 0, 1)));
  await fireEvent.press(screen.getByTestId('dob-done'));
  await fireEvent.changeText(screen.getByTestId('email'), 'ravi@example.com');
}

const sent = () =>
  requestLog.map(r => `${r.method} ${r.url.split('?')[0].replace(urls.storageRoot, 'storage').replace(/^https:\/\/[^/]+/, '')}`);

describe('onboarding 1/4 with the API (C1 + C2)', () => {
  it('prefills Full Name from user_details; Next saves the preset avatar, name, DL file + DL row → 2/4', async () => {
    await newUserOnStep1();
    await fireEvent.changeText(screen.getByTestId('dl-number'), 'ts0120110012345');
    expect(screen.getByTestId('full-name').props.value).toBe('Test User'); // user_details.full_name
    await fireEvent.changeText(screen.getByTestId('full-name'), 'Ravi Kumar');
    await pickDlPhoto();
    await fillPersonal();

    await fireEvent.press(screen.getByTestId('profile-next'));
    expect(await screen.findByTestId('onboarding-vehicle')).toBeTruthy();
    expect(await screen.findByText(`${strings.onboarding.saved.photo}. ${strings.onboarding.saved.drivingLicence}`)).toBeTruthy();

    const calls = sent();
    // The default (pre-selected) preset avatar is uploaded as its bundled PNG.
    expect(calls[0]).toMatch(new RegExp(`^POST storage/object/avatars/${UID}/\\d+-avatar-01\\.png$`));
    expect(calls[1]).toBe('PATCH /rest/v1/user_details');
    expect(calls[2]).toMatch(new RegExp(`^POST storage/object/driving-licenses/${UID}/\\d+-dl\\.jpg$`));
    expect(calls[3]).toBe('POST /rest/v1/user_driving_licenses');
    const patch = requestLog.find(r => r.method === 'PATCH')!;
    expect(patch.body).toEqual({ full_name: 'Ravi Kumar', avatar_url: expect.stringMatching(/-avatar-01\.png$/) });
    expect(patch.body).not.toHaveProperty('email'); // email / DOB are never sent
    const upsert = requestLog.find(r => r.method === 'POST' && r.url.startsWith(urls.drivingLicenses))!;
    expect(upsert.body).toEqual({ user_id: UID, dl_number: 'TS0120110012345', document_path: expect.stringMatching(/-dl\.jpg$/) });
  });

  it('a failed save shows the mapped error, stays on 1/4 and the retry succeeds without re-uploading', async () => {
    await newUserOnStep1();
    await fireEvent.changeText(screen.getByTestId('dl-number'), 'TS0120110012345');
    await pickDlPhoto();
    await fillPersonal();
    server.use(
      http.post(urls.drivingLicenses, () => HttpResponse.json({ message: 'new row violates row-level security policy' }, { status: 403 }), {
        once: true,
      }),
    );
    await fireEvent.press(screen.getByTestId('profile-next'));
    expect(await screen.findByText(strings.errors.notAllowed)).toBeTruthy();
    expect(screen.getByTestId('onboarding-profile')).toBeTruthy();
    const firstUploads = sent().filter(c => c.startsWith('POST storage/')).length;
    expect(firstUploads).toBe(2);

    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('profile-next'));
    expect(await screen.findByTestId('onboarding-vehicle')).toBeTruthy();
    expect(sent().filter(c => c.startsWith('POST storage/'))).toEqual([]);
  });

  it('while saving, Next is busy and a second press sends nothing more', async () => {
    await newUserOnStep1();
    await fireEvent.changeText(screen.getByTestId('dl-number'), 'TS0120110012345');
    await pickDlPhoto();
    await fillPersonal();
    let release!: () => void;
    const gate = new Promise<void>(r => (release = r));
    server.use(
      http.patch(urls.userDetails, async () => {
        await gate;
        return HttpResponse.json([{ id: UID }]);
      }),
    );
    await fireEvent.press(screen.getByTestId('profile-next'));
    await waitFor(() => expect(screen.getByTestId('profile-next').props.accessibilityState).toMatchObject({ busy: true }));
    await fireEvent.press(screen.getByTestId('profile-next'));
    release();
    expect(await screen.findByTestId('onboarding-vehicle')).toBeTruthy();
    expect(sent().filter(c => c.startsWith('POST storage/object/avatars'))).toHaveLength(1);
    expect(sent().filter(c => c === 'POST /rest/v1/user_driving_licenses')).toHaveLength(1);
  });
});

/** Stand-ins for signed URLs (any string the form holds for a saved file). */
const SIGNED_AVATAR = `${urls.storageRoot}/object/sign/avatars/${UID}/1-me.png?token=t`;
const SIGNED_DL = `${urls.storageRoot}/object/sign/driving-licenses/${UID}/1-dl.jpg?token=t`;

describe('useProfileStep mapping', () => {
  const saved: ProfileStepData = {
    fullName: 'Ravi Kumar',
    avatarPath: `${UID}/1-me.png`,
    avatarUrl: SIGNED_AVATAR,
    dl: { dlNumber: 'TS0120110012345', documentPath: `${UID}/1-dl.jpg`, previewUrl: SIGNED_DL },
  };

  it('nothing changed: no name, no avatar, the saved DL file is kept', () => {
    const values = {
      ...EMPTY_PROFILE,
      fullName: 'Ravi Kumar',
      avatar: { type: 'photo' as const, uri: SIGNED_AVATAR },
      dlNumber: 'TS0120110012345',
      dlImageUri: SIGNED_DL,
    };
    expect(toProfileStepSave(values, saved)).toEqual({
      fullName: undefined,
      avatar: undefined,
      dlNumber: 'TS0120110012345',
      dlFile: undefined,
      existingDlPath: `${UID}/1-dl.jpg`,
    });
  });

  it('a new photo / DL file are uploaded; "No avatar" clears a saved one', () => {
    const values = {
      ...EMPTY_PROFILE,
      avatar: { type: 'photo' as const, uri: 'file:///tmp/me.png' },
      dlNumber: 'TS01',
      dlImageUri: 'file:///tmp/new%20dl.pdf',
    };
    expect(toProfileStepSave(values, saved)).toMatchObject({
      avatar: { uri: 'file:///tmp/me.png', name: 'me.png', mimeType: 'image/png' },
      dlFile: { name: 'new dl.pdf', mimeType: 'application/pdf' },
    });
    expect(toProfileStepSave({ ...values, avatar: null }, saved).avatar).toBeNull();
    expect(toProfileStepSave({ ...values, avatar: null }, { ...saved, avatarPath: null, avatarUrl: null }).avatar).toBeUndefined();
  });

  it('localFileFromUri: type from the extension, JPEG otherwise', () => {
    expect(localFileFromUri('file:///a/b.webp?x=1')).toEqual({ uri: 'file:///a/b.webp?x=1', name: 'b.webp', mimeType: 'image/webp' });
    expect(localFileFromUri('ph://ABC')).toMatchObject({ name: 'ABC', mimeType: 'image/jpeg' });
  });
});
