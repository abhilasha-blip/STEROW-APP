import React from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { strings } from '@/constants/strings';
import { Providers } from '../../../../test/render';
import OnboardingProfileScreen, { type OnboardingProfileScreenProps } from '../OnboardingProfileScreen';

const t = strings.onboarding;
const e = t.errors;
const TODAY = new Date(2026, 10, 19);
const VALID_DL = 'TS0120110012345';

const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const mockedCamera = launchCamera as jest.MockedFunction<typeof launchCamera>;

const Stack = createNativeStackNavigator();

async function renderScreen(props: Partial<OnboardingProfileScreenProps> = {}) {
  const onNext = jest.fn();
  const onSkip = jest.fn();
  await render(
    <Providers>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Step1">
            {() => <OnboardingProfileScreen onNext={onNext} onSkip={onSkip} today={() => TODAY} {...props} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </Providers>,
  );
  await screen.findByTestId('onboarding-profile');
  return { onNext, onSkip };
}

/** Picks a photo through the photo-source sheet (the picker opens after the sheet closes). */
async function pickFromGallery(sheetTestID: string, uri: string) {
  mockedLibrary.mockResolvedValueOnce({ assets: [{ uri, fileSize: 1024, width: 640, height: 360 }] });
  await fireEvent.press(await screen.findByTestId(`${sheetTestID}-gallery`));
  await waitFor(() => expect(mockedLibrary).toHaveBeenCalled());
}

beforeEach(() => {
  mockedLibrary.mockClear();
  mockedCamera.mockClear();
});

describe('OnboardingProfileScreen – layout', () => {
  it('shows the header with progress "1/4", title and subtitle', async () => {
    await renderScreen();
    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('1/4');
    expect(screen.getByLabelText('Step 1 of 4')).toBeTruthy();
    expect(screen.getByTestId('onboarding-progress').props.accessibilityValue).toMatchObject({ now: 25 });
    expect(screen.getByText(t.profile.title)).toBeTruthy();
    expect(screen.getByText(t.profile.subtitle)).toBeTruthy();
    expect(screen.getByText(t.profile.avatarLabel)).toBeTruthy();
  });

  it('starts with the default avatar, an empty DL field and the empty upload box (no "Or" without OCR)', async () => {
    await renderScreen();
    expect(screen.getByTestId('profile-avatar-avatar-01')).toBeTruthy();
    expect(screen.getByTestId('profile-avatar-badge')).toBeTruthy();
    expect(screen.getByTestId('dl-number').props.placeholder).toBe(t.profile.dlNumberPlaceholder);
    expect(screen.queryByText(t.profile.or)).toBeNull();
    expect(screen.getByTestId('dl-upload-empty')).toBeTruthy();
    expect(screen.queryByTestId('personal-fields')).toBeNull();
  });
});

describe('OnboardingProfileScreen – DL state switching', () => {
  it('typing the DL keeps the upload box (both are required); a valid number reveals the personal fields', async () => {
    await renderScreen();
    const dl = screen.getByTestId('dl-number');

    await fireEvent.changeText(dl, 'ts-01 2011');
    expect(dl.props.value).toBe('TS012011'); // upper-case, alphanumerics only
    expect(screen.getByTestId('dl-upload-empty')).toBeTruthy();
    expect(screen.queryByText(t.profile.or)).toBeNull();
    expect(screen.queryByTestId('personal-fields')).toBeNull();

    await fireEvent.changeText(dl, VALID_DL);
    expect(screen.getByTestId('personal-fields')).toBeTruthy();
    expect(screen.getByTestId('full-name').props.placeholder).toBe(t.profile.fullNamePlaceholder);
    expect(screen.getByTestId('email').props.placeholder).toBe(t.profile.emailPlaceholder);
    expect(screen.getByTestId('dob').props.accessibilityLabel).toBe(`${t.profile.dobLabel}, ${t.profile.dobPlaceholder}`);

    await fireEvent.changeText(dl, '');
    expect(screen.getByTestId('dl-upload-empty')).toBeTruthy();
    expect(screen.queryByTestId('personal-fields')).toBeNull();
  });

  it('caps the DL number at 16 characters', async () => {
    await renderScreen();
    expect(screen.getByTestId('dl-number').props.maxLength).toBe(16);
    await fireEvent.changeText(screen.getByTestId('dl-number'), 'TS011234567891234XYZ');
    expect(screen.getByTestId('dl-number').props.value).toBe('TS01123456789123');
  });

  it('upload: empty → photo source sheet → filled preview + personal fields; X → empty again', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId('dl-upload-empty'));
    expect(await screen.findByText(t.photoSource.camera)).toBeTruthy();
    expect(screen.getByText(t.photoSource.gallery)).toBeTruthy();

    await pickFromGallery('dl-photo-source', 'file:///tmp/dl.jpg');
    const image = await screen.findByTestId('dl-upload-image');
    expect(image.props.source).toEqual({ uri: 'file:///tmp/dl.jpg' });
    expect(image.props.resizeMode).toBe('contain');
    expect(screen.getByTestId('personal-fields')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('dl-upload-remove'));
    expect(screen.getByTestId('dl-upload-empty')).toBeTruthy();
    expect(screen.queryByTestId('personal-fields')).toBeNull();
  });

  it('"Take photo" opens the camera; cancelling keeps the box empty', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId('dl-upload-empty'));
    await fireEvent.press(await screen.findByTestId('dl-photo-source-camera'));
    await waitFor(() => expect(mockedCamera).toHaveBeenCalled());
    expect(screen.getByTestId('dl-upload-empty')).toBeTruthy();
  });

  it('a too-large photo is rejected with an alert', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    await renderScreen();
    await fireEvent.press(screen.getByTestId('dl-upload-empty'));
    mockedLibrary.mockResolvedValueOnce({ assets: [{ uri: 'file:///big.jpg', fileSize: 11 * 1024 * 1024 }] });
    await fireEvent.press(await screen.findByTestId('dl-photo-source-gallery'));
    await waitFor(() => expect(alert).toHaveBeenCalledWith(t.photoSource.tooLarge));
    expect(screen.getByTestId('dl-upload-empty')).toBeTruthy();
  });
});

describe('OnboardingProfileScreen – validation and actions', () => {
  it('Next with nothing entered asks for the licence number and the licence file', async () => {
    const { onNext } = await renderScreen();
    await fireEvent.press(screen.getByTestId('profile-next'));
    expect(await screen.findByText('Enter the licence number')).toBeTruthy();
    expect(screen.getByText('Upload a photo or PDF of your licence')).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('saving: Next shows a spinner and both actions are disabled (no double submit)', async () => {
    const { onNext, onSkip } = await renderScreen({ saving: true });
    expect(screen.getByTestId('profile-next').props.accessibilityState).toMatchObject({ busy: true });
    await fireEvent.press(screen.getByTestId('profile-next'));
    await fireEvent.press(screen.getByTestId('profile-skip'));
    expect(onNext).not.toHaveBeenCalled();
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('Next flags an incomplete DL number', async () => {
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId('dl-number'), 'TS01');
    await fireEvent.press(screen.getByTestId('profile-next'));
    expect(await screen.findByText(e.dlInvalid)).toBeTruthy();
  });

  it('validates the visible personal fields inline, email on blur and DOB 18+', async () => {
    const { onNext } = await renderScreen();
    await fireEvent.changeText(screen.getByTestId('dl-number'), VALID_DL);
    await fireEvent.press(screen.getByTestId('profile-next'));
    expect(await screen.findByText(e.fullName)).toBeTruthy();
    expect(screen.getByText(e.dobRequired)).toBeTruthy();
    expect(screen.getByText(e.emailRequired)).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('email'), 'john@gmail');
    await fireEvent(screen.getByTestId('email'), 'blur');
    expect(await screen.findByText(e.emailInvalid)).toBeTruthy();

    // A 16-year-old picked in the DOB sheet.
    await fireEvent.press(screen.getByTestId('dob'));
    const picker = await screen.findByTestId('dob-picker');
    expect(picker.props.maximumDate).toEqual(new Date(2008, 10, 19));
    await act(() => picker.props.onChange({ type: 'set' }, new Date(2010, 4, 5)));
    await fireEvent.press(screen.getByTestId('dob-done'));
    expect(await screen.findByText(e.dobTooYoung(18))).toBeTruthy();
    expect(screen.getByTestId('dob').props.accessibilityLabel).toBe(`${t.profile.dobLabel}, 05-05-2010`);
    expect(onNext).not.toHaveBeenCalled();
  });

  it('Next submits normalised values; Skip calls onSkip', async () => {
    const { onNext, onSkip } = await renderScreen({
      initialValues: { fullName: '  John   Cooper ', dlImageUri: 'file:///dl.jpg' },
    });
    await fireEvent.changeText(screen.getByTestId('dl-number'), 'ts0120110012345');
    expect(screen.getByTestId('full-name').props.value).toBe('  John   Cooper ');

    await fireEvent.press(screen.getByTestId('dob'));
    const picker = await screen.findByTestId('dob-picker');
    await act(() => picker.props.onChange({ type: 'set' }, new Date(1990, 0, 1)));
    await fireEvent.press(screen.getByTestId('dob-done'));
    await waitFor(() =>
      expect(screen.getByTestId('dob').props.accessibilityLabel).toBe(`${t.profile.dobLabel}, 01-01-1990`),
    );

    await fireEvent.changeText(screen.getByTestId('email'), ' john.cooper@gmail.com ');
    await fireEvent.press(screen.getByTestId('profile-next'));
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(onNext.mock.calls[0][0]).toEqual({
      avatar: { type: 'preset', id: 'avatar-01' },
      dlNumber: VALID_DL,
      dlImageUri: 'file:///dl.jpg',
      fullName: 'John Cooper',
      dob: '1990-01-01',
      email: 'john.cooper@gmail.com',
    });

    await fireEvent.press(screen.getByTestId('profile-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});

describe('OnboardingProfileScreen – avatar picker', () => {
  async function openSheet() {
    await fireEvent.press(screen.getByTestId('profile-avatar'));
    return await screen.findByTestId('avatar-sheet');
  }

  it('opens with the current avatar highlighted and 12 presets + none + camera', async () => {
    await renderScreen();
    const sheet = await openSheet();
    expect(within(sheet).getByText(t.avatarSheet.title)).toBeTruthy();
    expect(screen.getByTestId('avatar-sheet-preview-avatar-01')).toBeTruthy();
    expect(screen.getByTestId('avatar-option-avatar-01').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getAllByTestId(/^avatar-option-avatar-\d\d$/)).toHaveLength(12);
    expect(screen.getByTestId('avatar-option-none')).toBeTruthy();
    expect(screen.getByTestId('avatar-option-camera')).toBeTruthy();
  });

  it('Select applies the highlighted avatar', async () => {
    await renderScreen();
    await openSheet();
    await fireEvent.press(screen.getByTestId('avatar-option-avatar-03'));
    expect(screen.getByTestId('avatar-sheet-preview-avatar-03')).toBeTruthy();
    expect(screen.getByTestId('avatar-option-avatar-03').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('avatar-option-avatar-01').props.accessibilityState).toMatchObject({ selected: false });

    await fireEvent.press(screen.getByTestId('avatar-sheet-select'));
    await waitFor(() => expect(screen.queryByTestId('avatar-sheet')).toBeNull());
    expect(screen.getByTestId('profile-avatar-avatar-03')).toBeTruthy();
  });

  it('Cancel (and X) close without changes', async () => {
    await renderScreen();
    await openSheet();
    await fireEvent.press(screen.getByTestId('avatar-option-avatar-05'));
    await fireEvent.press(screen.getByTestId('avatar-sheet-cancel'));
    await waitFor(() => expect(screen.queryByTestId('avatar-sheet')).toBeNull());
    expect(screen.getByTestId('profile-avatar-avatar-01')).toBeTruthy();

    await openSheet();
    // Re-opens from the applied value, not the discarded draft.
    expect(screen.getByTestId('avatar-sheet-preview-avatar-01')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('avatar-option-avatar-05'));
    await fireEvent.press(screen.getByTestId('avatar-sheet-close'));
    await waitFor(() => expect(screen.queryByTestId('avatar-sheet')).toBeNull());
    expect(screen.getByTestId('profile-avatar-avatar-01')).toBeTruthy();
  });

  it('"No avatar" shows the silhouette', async () => {
    await renderScreen();
    await openSheet();
    await fireEvent.press(screen.getByTestId('avatar-option-none'));
    expect(screen.getByTestId('avatar-sheet-preview-none')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('avatar-sheet-select'));
    await waitFor(() => expect(screen.getByTestId('profile-avatar-none')).toBeTruthy());
  });

  it('the camera tile picks a photo, previews it and Select applies it', async () => {
    const { onNext } = await renderScreen({ initialValues: { dlImageUri: 'file:///dl.jpg' } });
    await openSheet();
    await fireEvent.press(screen.getByTestId('avatar-option-camera'));
    await pickFromGallery('avatar-photo-source', 'file:///tmp/me.jpg');
    const preview = await screen.findByTestId('avatar-sheet-preview-photo');
    expect(preview.props.source).toEqual({ uri: 'file:///tmp/me.jpg' });
    expect(screen.getByTestId('avatar-option-camera').props.accessibilityState).toMatchObject({ selected: true });

    await fireEvent.press(screen.getByTestId('avatar-sheet-select'));
    await waitFor(() => expect(screen.getByTestId('profile-avatar-photo')).toBeTruthy());

    // …and it is what Next submits.
    await fireEvent.changeText(screen.getByTestId('dl-number'), VALID_DL);
    await fireEvent.changeText(screen.getByTestId('full-name'), 'John Cooper');
    await fireEvent.press(screen.getByTestId('dob'));
    const picker = await screen.findByTestId('dob-picker');
    await act(() => picker.props.onChange({ type: 'set' }, new Date(1990, 0, 1)));
    await fireEvent.press(screen.getByTestId('dob-done'));
    await fireEvent.changeText(screen.getByTestId('email'), 'john@sterow.in');
    await fireEvent.press(screen.getByTestId('profile-next'));
    await waitFor(() => expect(onNext).toHaveBeenCalled());
    expect(onNext.mock.calls[0][0].avatar).toEqual({ type: 'photo', uri: 'file:///tmp/me.jpg' });
  });
});
