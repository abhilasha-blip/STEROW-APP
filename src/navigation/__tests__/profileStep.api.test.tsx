import { http, HttpResponse } from 'msw';
import { Image } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import type { DrivingLicenceStepData } from '@/api/services/drivingLicenceStep.service';
import type { ProfileStepData } from '@/api/services/profileStep.service';
import { strings } from '@/constants/strings';
import { drivingLicencePrefill, toDrivingLicenceStepSave } from '@/hooks/api/useDrivingLicenceStep';
import { localFileFromUri, toProfileStepSave } from '@/hooks/api/useProfileStep';
import { EMPTY_DRIVING_LICENCE } from '@/screens/onboarding/schemas';
import { EMPTY_PROFILE } from '@/screens/onboarding/useOnboardingProfileForm';
import { drivingLicenseRow, setOnboardingBackend, TEST_OTP, UID } from '../../../test/msw/fixtures';
import { requestLog, server } from '../../../test/msw/server';
import { urls } from '../../../test/msw/urls';
import { goToVerify, typeOtp } from '../../../test/flows';
import { renderApp, resetAppState } from '../../../test/render';

const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const s = strings.onboarding.saved;

beforeEach(() => {
  resetAppState();
  mockedLibrary.mockReset();
  // Jest's asset transform has no packager URI; on device this is the bundled PNG's uri.
  jest
    .spyOn(Image, 'resolveAssetSource')
    .mockImplementation(() => ({ uri: 'asset:/avatar.png', width: 96, height: 96, scale: 1 }));
});
afterEach(resetAppState);

async function signInFresh() {
  setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 0 });
  await renderApp();
  await goToVerify();
  await typeOtp(TEST_OTP);
  await screen.findByTestId('onboarding-profile');
  requestLog.length = 0;
}

async function pickDate(testID: string, date: Date) {
  await fireEvent.press(screen.getByTestId(testID));
  const picker = await screen.findByTestId(`${testID}-picker`);
  await act(() => picker.props.onChange({ type: 'set' }, date));
  await fireEvent.press(screen.getByTestId(`${testID}-done`));
}

async function completeProfile() {
  await fireEvent.changeText(screen.getByTestId('email'), 'ravi@example.com');
}

async function fillDl() {
  await fireEvent.changeText(screen.getByTestId('dl-number'), 'ts0120110012345');
  mockedLibrary.mockResolvedValueOnce({
    assets: [{ uri: 'file:///tmp/dl.jpg', type: 'image/jpeg', fileName: 'dl.jpg', fileSize: 2048 }],
  });
  await fireEvent.press(screen.getByTestId('dl-upload-empty'));
  await fireEvent.press(await screen.findByTestId('dl-photo-source-gallery'));
  await screen.findByTestId('dl-upload-image');
  await pickDate('dl-issued-on', new Date(2020, 0, 15));
  await pickDate('dl-valid-upto', new Date(2040, 0, 14));
}

/** Writes only (saving refetches the step's data afterwards: GET / sign are left out). */
const sent = () =>
  requestLog.filter(r => r.method !== 'GET' && r.method !== 'HEAD' && !r.url.includes('/object/sign/')).map(
    r => `${r.method} ${r.url.split('?')[0].replace(urls.storageRoot, 'storage').replace(/^https:\/\/[^/]+/, '')}`,
  );

describe('1/3 My Profile with the API', () => {
  it('prefills Full Name; Next uploads the preset avatar + PATCHes name/avatar_url → "Photo updated" → 2/3', async () => {
    await signInFresh();
    expect(screen.getByTestId('full-name').props.value).toBe('Test User'); // user_details.full_name
    await fireEvent.changeText(screen.getByTestId('full-name'), 'Ravi Kumar');
    await completeProfile();
    await fireEvent.press(screen.getByTestId('profile-next'));
    expect(await screen.findByTestId('onboarding-dl')).toBeTruthy();
    expect(await screen.findByText(s.photo)).toBeTruthy();

    const writes = sent();
    expect(writes[0]).toMatch(new RegExp(`^POST storage/object/avatars/${UID}/\\d+-avatar-01\\.png$`));
    expect(writes[1]).toBe('PATCH /rest/v1/user_details');
    expect(writes).toHaveLength(2); // no DL write on 1/3
    const patch = requestLog.find(r => r.method === 'PATCH')!;
    expect(patch.body).toEqual({
      full_name: 'Ravi Kumar',
      email: 'ravi@example.com',
      avatar_url: expect.stringMatching(/-avatar-01\.png$/),
    });
  });

  it('a failed PATCH shows the mapped error and stays; the retry does not re-upload the avatar', async () => {
    await signInFresh();
    await completeProfile();
    server.use(http.patch(urls.userDetails, () => HttpResponse.json([])));
    await fireEvent.press(screen.getByTestId('profile-next'));
    expect(await screen.findByText(strings.errors.notAllowed)).toBeTruthy();
    expect(screen.getByTestId('onboarding-profile')).toBeTruthy();
    server.resetHandlers();
    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('profile-next'));
    expect(await screen.findByTestId('onboarding-dl')).toBeTruthy();
    expect(sent().filter(c => c.startsWith('POST storage/object/avatars'))).toEqual([]);
  });
});

describe('2/3 Driving Licence with the API', () => {
  async function onStep2() {
    await signInFresh();
    await fireEvent.press(screen.getByTestId('profile-skip'));
    await screen.findByTestId('onboarding-dl');
    requestLog.length = 0;
  }

  it('Next uploads the file, upserts number, path, Issued on, Valid up to → "Driving licence saved" → 3/3', async () => {
    await onStep2();
    await fillDl();
    await fireEvent.press(screen.getByTestId('dl-next'));
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    expect(await screen.findByText(s.drivingLicence)).toBeTruthy();
    expect(sent()).toEqual([
      expect.stringMatching(new RegExp(`^POST storage/object/driving-licenses/${UID}/\\d+-dl\\.jpg$`)),
      'POST /rest/v1/user_driving_licenses',
    ]);
    expect(requestLog[1].body).toEqual({
      user_id: UID,
      dl_number: 'TS0120110012345',
      document_path: expect.stringMatching(/-dl\.jpg$/),
      issued_on: '2020-01-15',
      valid_upto: '2040-01-14',
    });
  });

  it('a failed upsert shows the mapped error, stays on 2/3; the retry does not re-upload', async () => {
    await onStep2();
    await fillDl();
    server.use(
      http.post(urls.drivingLicenses, () =>
        HttpResponse.json({ message: 'new row violates row-level security policy' }, { status: 403 }),
      ),
    );
    await fireEvent.press(screen.getByTestId('dl-next'));
    expect(await screen.findByText(strings.errors.notAllowed)).toBeTruthy();
    expect(screen.getByTestId('onboarding-dl')).toBeTruthy();
    server.resetHandlers();
    requestLog.length = 0;
    await fireEvent.press(screen.getByTestId('dl-next'));
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    expect(sent()).toEqual(['POST /rest/v1/user_driving_licenses']);
  });

  it('while saving, Next is busy and a second press sends nothing more', async () => {
    await onStep2();
    await fillDl();
    let release!: () => void;
    const gate = new Promise<void>(r => (release = r));
    server.use(
      http.post(urls.drivingLicenses, async ({ request }) => {
        await gate;
        return HttpResponse.json({ ...drivingLicenseRow, ...((await request.json()) as object) }, { status: 201 });
      }),
    );
    await fireEvent.press(screen.getByTestId('dl-next'));
    await waitFor(() => expect(screen.getByTestId('dl-next').props.accessibilityState).toMatchObject({ busy: true }));
    await fireEvent.press(screen.getByTestId('dl-next'));
    release();
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    expect(sent().filter(c => c.startsWith('POST storage/object/driving-licenses'))).toHaveLength(1);
  });
});

/** Stand-ins for signed URLs (any string the form holds for a saved file). */
const SIGNED_AVATAR = `${urls.storageRoot}/object/sign/avatars/${UID}/1-me.png?token=t`;
const SIGNED_DL = `${urls.storageRoot}/object/sign/driving-licenses/${UID}/1-dl.jpg?token=t`;

describe('form → request mapping', () => {
  const profile: ProfileStepData = {
    fullName: 'Ravi Kumar',
    email: 'ravi@example.com',
    avatarPath: `${UID}/1-me.png`,
    avatarUrl: SIGNED_AVATAR,
  };
  const dl: DrivingLicenceStepData = {
    dlNumber: 'TS0120110012345',
    documentPath: `${UID}/1-dl.jpg`,
    previewUrl: SIGNED_DL,
    issuedOn: '2020-01-15',
    validUpto: null,
  };

  it('profile: nothing changed → nothing sent; a new photo is uploaded; "No avatar" clears a saved one', () => {
    const same = {
      ...EMPTY_PROFILE,
      fullName: 'Ravi Kumar',
      email: 'ravi@example.com',
      avatar: { type: 'photo' as const, uri: SIGNED_AVATAR },
    };
    expect(toProfileStepSave(same, profile)).toEqual({ fullName: undefined, email: undefined, avatar: undefined });
    expect(toProfileStepSave({ ...same, email: 'new@example.com' }, profile).email).toBe('new@example.com');
    expect(toProfileStepSave({ ...same, avatar: { type: 'photo', uri: 'file:///tmp/me.png' } }, profile).avatar).toEqual({
      uri: 'file:///tmp/me.png',
      name: 'me.png',
      mimeType: 'image/png',
    });
    expect(toProfileStepSave({ ...same, avatar: null }, profile).avatar).toBeNull();
    expect(
      toProfileStepSave({ ...same, avatar: null }, { ...profile, avatarPath: null, avatarUrl: null }).avatar,
    ).toBeUndefined();
  });

  it('licence: the saved file is kept; a new file is uploaded; dates pass through', () => {
    const values = { ...EMPTY_DRIVING_LICENCE, ...drivingLicencePrefill(dl) };
    expect(toDrivingLicenceStepSave(values, dl)).toEqual({
      dlNumber: 'TS0120110012345',
      dlFile: undefined,
      existingDlPath: `${UID}/1-dl.jpg`,
      issuedOn: '2020-01-15',
      validUpto: null,
    });
    expect(toDrivingLicenceStepSave({ ...values, dlImageUri: 'file:///tmp/new%20dl.pdf' }, dl).dlFile).toMatchObject({
      name: 'new dl.pdf',
      mimeType: 'application/pdf',
    });
    expect(drivingLicencePrefill(null)).toEqual({});
  });

  it('localFileFromUri: type from the extension, JPEG otherwise', () => {
    expect(localFileFromUri('file:///a/b.webp?x=1')).toEqual({
      uri: 'file:///a/b.webp?x=1',
      name: 'b.webp',
      mimeType: 'image/webp',
    });
    expect(localFileFromUri('ph://ABC')).toMatchObject({ name: 'ABC', mimeType: 'image/jpeg' });
  });
});
