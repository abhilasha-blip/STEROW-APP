import React from 'react';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { strings } from '@/constants/strings';
import { Providers } from '../../../../test/render';
import DrivingLicenceScreen, { type DrivingLicenceScreenProps } from '../DrivingLicenceScreen';

const t = strings.onboarding;
const d = t.drivingLicence;
const e = t.errors;
const TODAY = new Date(2026, 10, 19);
const VALID_DL = 'TS0120110012345';

const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const mockedCamera = launchCamera as jest.MockedFunction<typeof launchCamera>;
const Stack = createNativeStackNavigator();

async function renderScreen(props: Partial<DrivingLicenceScreenProps> = {}) {
  const onNext = jest.fn();
  const onSkip = jest.fn();
  await render(
    <Providers>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Step2">
            {() => <DrivingLicenceScreen onNext={onNext} onSkip={onSkip} today={() => TODAY} {...props} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </Providers>,
  );
  await screen.findByTestId('onboarding-dl');
  return { onNext, onSkip };
}

async function pickFromGallery(uri: string) {
  mockedLibrary.mockResolvedValueOnce({ assets: [{ uri, fileSize: 1024, width: 640, height: 360 }] });
  await fireEvent.press(await screen.findByTestId('dl-photo-source-gallery'));
  await waitFor(() => expect(mockedLibrary).toHaveBeenCalled());
}

async function pickDate(testID: string, date: Date) {
  await fireEvent.press(screen.getByTestId(testID));
  const picker = await screen.findByTestId(`${testID}-picker`);
  await act(() => picker.props.onChange({ type: 'set' }, date));
  await fireEvent.press(screen.getByTestId(`${testID}-done`));
}

beforeEach(() => {
  mockedLibrary.mockClear();
  mockedCamera.mockClear();
});

describe('DrivingLicenceScreen (2/3)', () => {
  it('header "2/3"; DL Number, upload (no "Or" without OCR), Issued on, Valid up to', async () => {
    await renderScreen();
    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('2/3');
    expect(screen.getByTestId('onboarding-progress').props.accessibilityValue).toMatchObject({ now: 67 });
    expect(screen.getByText(d.title)).toBeTruthy();
    expect(screen.getByTestId('dl-number').props.placeholder).toBe(d.dlNumberPlaceholder);
    expect(screen.getByTestId('dl-upload-empty')).toBeTruthy();
    expect(screen.queryByText(d.or)).toBeNull();
    expect(screen.getByTestId('dl-issued-on').props.accessibilityLabel).toBe(`${d.issuedOnLabel}, ${d.datePlaceholder}`);
    expect(screen.getByTestId('dl-valid-upto').props.accessibilityLabel).toBe(`${d.validUptoLabel}, ${d.datePlaceholder}`);
  });

  it('"Or" appears when OCR is available', async () => {
    await renderScreen({ ocrAvailable: true });
    expect(screen.getByText(d.or)).toBeTruthy();
  });

  it('normalises and caps the number at 16 characters', async () => {
    await renderScreen();
    expect(screen.getByTestId('dl-number').props.maxLength).toBe(16);
    await fireEvent.changeText(screen.getByTestId('dl-number'), 'ts-01 2011');
    expect(screen.getByTestId('dl-number').props.value).toBe('TS012011');
  });

  it('upload: empty → photo source → preview; X → empty; camera cancel keeps it empty', async () => {
    await renderScreen();
    await fireEvent.press(screen.getByTestId('dl-upload-empty'));
    await pickFromGallery('file:///tmp/dl.jpg');
    expect((await screen.findByTestId('dl-upload-image')).props.source).toEqual({ uri: 'file:///tmp/dl.jpg' });
    await fireEvent.press(screen.getByTestId('dl-upload-remove'));
    expect(screen.getByTestId('dl-upload-empty')).toBeTruthy();

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
  });

  it('Next with nothing entered asks for the number and the file', async () => {
    const { onNext } = await renderScreen();
    await fireEvent.press(screen.getByTestId('dl-next'));
    expect(await screen.findByText(e.dlRequired)).toBeTruthy();
    expect(screen.getByText(e.dlFileRequired)).toBeTruthy();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('Issued on is capped at today; Valid up to before Issued on is flagged', async () => {
    const { onNext } = await renderScreen({ initialValues: { dlNumber: VALID_DL, dlImageUri: 'file:///dl.jpg' } });
    await fireEvent.press(screen.getByTestId('dl-issued-on'));
    expect((await screen.findByTestId('dl-issued-on-picker')).props.maximumDate).toEqual(TODAY);
    await fireEvent.press(screen.getByTestId('dl-issued-on-done'));
    await pickDate('dl-issued-on', new Date(2020, 0, 15));
    await pickDate('dl-valid-upto', new Date(2019, 11, 31));
    expect(await screen.findByText(e.validUptoBeforeIssued)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('dl-next'));
    expect(onNext).not.toHaveBeenCalled();
  });

  it('Next submits number, file and dates; Skip calls onSkip; saving disables both', async () => {
    const { onNext, onSkip } = await renderScreen({ initialValues: { dlImageUri: 'file:///dl.jpg' } });
    await fireEvent.changeText(screen.getByTestId('dl-number'), 'ts0120110012345');
    await pickDate('dl-issued-on', new Date(2020, 0, 15));
    await pickDate('dl-valid-upto', new Date(2040, 0, 14));
    await fireEvent.press(screen.getByTestId('dl-next'));
    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(onNext.mock.calls[0][0]).toEqual({
      dlNumber: VALID_DL,
      dlImageUri: 'file:///dl.jpg',
      issuedOn: '2020-01-15',
      validUpto: '2040-01-14',
    });
    await fireEvent.press(screen.getByTestId('dl-skip'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('saving: spinner on Next, Next and Skip ignored', async () => {
    const { onNext, onSkip } = await renderScreen({ saving: true });
    expect(screen.getByTestId('dl-next').props.accessibilityState).toMatchObject({ busy: true });
    await fireEvent.press(screen.getByTestId('dl-next'));
    await fireEvent.press(screen.getByTestId('dl-skip'));
    expect(onNext).not.toHaveBeenCalled();
    expect(onSkip).not.toHaveBeenCalled();
  });
});
