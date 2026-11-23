import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { strings } from '@/constants/strings';
import { Providers } from '../../../../test/render';
import OnboardingProfileScreen, { type OnboardingProfileScreenProps } from '../OnboardingProfileScreen';

const t = strings.onboarding;
const e = t.errors;

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
            {() => <OnboardingProfileScreen onNext={onNext} onSkip={onSkip} {...props} />}
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
  it('shows the header with progress "1/3", title and subtitle', async () => {
    await renderScreen();
    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('1/3');
    expect(screen.getByLabelText('Step 1 of 3')).toBeTruthy();
    expect(screen.getByTestId('onboarding-progress').props.accessibilityValue).toMatchObject({ now: 33 });
    expect(screen.getByText(t.profile.title)).toBeTruthy();
    expect(screen.getByText(t.profile.subtitle)).toBeTruthy();
    expect(screen.getByText(t.profile.avatarLabel)).toBeTruthy();
  });

  it('Profile photo, Full Name and Email only (no Date of Birth, no DL fields)', async () => {
    await renderScreen();
    expect(screen.getByTestId('profile-avatar-avatar-01')).toBeTruthy();
    expect(screen.getByTestId('profile-avatar-badge')).toBeTruthy();
    expect(screen.getByTestId('full-name').props.placeholder).toBe(t.profile.fullNamePlaceholder);
    expect(screen.getByTestId('email').props.placeholder).toBe(t.profile.emailPlaceholder);
    expect(screen.getByTestId('email').props.editable).not.toBe(false); // user_details.email can be updated
    expect(screen.queryByTestId('dob')).toBeNull();
    expect(screen.queryByTestId('dl-number')).toBeNull();
  });
});

describe('OnboardingProfileScreen – validation and actions', () => {
  it('saving: Next shows a spinner and both actions are disabled (no double submit)', async () => {
    const { onNext, onSkip } = await renderScreen({ saving: true });
    expect(screen.getByTestId('profile-next').props.accessibilityState).toMatchObject({ busy: true });
    await fireEvent.press(screen.getByTestId('profile-next'));
    await fireEvent.press(screen.getByTestId('profile-skip'));
    expect(onNext).not.toHaveBeenCalled();
    expect(onSkip).not.toHaveBeenCalled();
  });

  it('validates Full Name and Email inline; email format on blur', async () => {
    const { onNext } = await renderScreen();
    await fireEvent.press(screen.getByTestId('profile-next'));
    expect(await screen.findByText(e.fullName)).toBeTruthy();
    expect(screen.getByText(e.emailRequired)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('email'), 'john@gmail');
    await fireEvent(screen.getByTestId('email'), 'blur');
    expect(await screen.findByText(e.emailInvalid)).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('Next submits normalised values; Skip calls onSkip', async () => {
    const { onNext, onSkip } = await renderScreen({ initialValues: { fullName: '  John   Cooper ' } });
    await fireEvent.changeText(screen.getByTestId('email'), ' john.cooper@gmail.com ');
    await fireEvent.press(screen.getByTestId('profile-next'));
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(onNext.mock.calls[0][0]).toEqual({
      avatar: { type: 'preset', id: 'avatar-01' },
      fullName: 'John Cooper',
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
    const { onNext } = await renderScreen();
    await openSheet();
    await fireEvent.press(screen.getByTestId('avatar-option-camera'));
    await pickFromGallery('avatar-photo-source', 'file:///tmp/me.jpg');
    const preview = await screen.findByTestId('avatar-sheet-preview-photo');
    expect(preview.props.source).toEqual({ uri: 'file:///tmp/me.jpg' });
    expect(screen.getByTestId('avatar-option-camera').props.accessibilityState).toMatchObject({ selected: true });

    await fireEvent.press(screen.getByTestId('avatar-sheet-select'));
    await waitFor(() => expect(screen.getByTestId('profile-avatar-photo')).toBeTruthy());

    // …and it is what Next submits.
    await fireEvent.changeText(screen.getByTestId('full-name'), 'John Cooper');
    await fireEvent.changeText(screen.getByTestId('email'), 'john@sterow.in');
    await fireEvent.press(screen.getByTestId('profile-next'));
    await waitFor(() => expect(onNext).toHaveBeenCalled());
    expect(onNext.mock.calls[0][0].avatar).toEqual({ type: 'photo', uri: 'file:///tmp/me.jpg' });
  });
});
