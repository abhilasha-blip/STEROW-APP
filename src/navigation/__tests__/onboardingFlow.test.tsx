import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { pick } from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { strings } from '@/constants/strings';
import OnboardingStack from '@/navigation/OnboardingStack';
import { useOnboardingStore } from '@/store/onboarding.store';
import { logger } from '@/utils/logger';
import { Providers } from '../../../test/render';

const HIDDEN = { includeHiddenElements: true };
const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const mockedPick = pick as jest.MockedFunction<typeof pick>;

const AppLike = createNativeStackNavigator();
const DashboardStub = () => <Text testID="dashboard">Dashboard</Text>;

/** Onboarding on top of a Dashboard, as in AppStack. */
async function renderFlow() {
  await render(
    <Providers>
      <NavigationContainer
        initialState={{ routes: [{ name: 'Dashboard' }, { name: 'Onboarding' }] } as never}
      >
        <AppLike.Navigator screenOptions={{ headerShown: false }}>
          <AppLike.Screen name="Dashboard" component={DashboardStub} />
          <AppLike.Screen name="Onboarding" component={OnboardingStack} />
        </AppLike.Navigator>
      </NavigationContainer>
    </Providers>,
  );
  await screen.findByTestId('onboarding-profile');
}

async function chooseOption(select: string, option: string) {
  await fireEvent.press(screen.getByTestId(select));
  await fireEvent.press(await screen.findByTestId(`${select}-option-${option}`));
  await waitFor(() => expect(screen.queryByTestId(`${select}-sheet`)).toBeNull());
}

const disabled = (testID: string) => screen.getByTestId(testID).props.accessibilityState?.disabled === true;
const back = async () => {
  const buttons = screen.getAllByLabelText(strings.common.back);
  await fireEvent.press(buttons[buttons.length - 1]); // the top screen's
};

async function pickImage(sheet: string, uri: string) {
  mockedLibrary.mockResolvedValueOnce({ assets: [{ uri, type: 'image/jpeg', fileName: uri.split('/').pop(), fileSize: 1024 }] });
  await fireEvent.press(await screen.findByTestId(`${sheet}-gallery`));
  await waitFor(() => expect(mockedLibrary).toHaveBeenCalled());
  mockedLibrary.mockClear();
}

// End-to-end walks through four screens: ~2 s idle, but well over Jest's 5 s default on a loaded machine.
jest.setTimeout(20000);

beforeEach(() => {
  mockedLibrary.mockReset();
  mockedPick.mockReset();
});

describe('onboarding flow (steps 1–4)', () => {
  it('step 2 entry → form → step 3 (RC prefilled, no DL) → step 4 (odometer) → finish; Back keeps values', async () => {
    const info = jest.spyOn(logger, 'info');
    await renderFlow();

    // Step 1: upload the DL photo, then skip. Step 3 no longer collects the DL.
    await fireEvent.press(screen.getByTestId('dl-upload-empty'));
    await pickImage('dl-photo-source', 'file:///dl.jpg');
    expect(await screen.findByTestId('dl-upload-image')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('profile-skip'));

    // Step 2 entry: attach the RC → Next opens the form with the RC (no lookup: details empty).
    expect(await screen.findByTestId('onboarding-vehicle')).toBeTruthy();
    expect(screen.getAllByTestId('onboarding-step').pop()).toHaveTextContent('2/4');
    await fireEvent.press(screen.getByTestId('vehicle-rc-box-empty'));
    await pickImage('vehicle-rc-source', 'file:///rc.jpg');
    expect(await screen.findByTestId('vehicle-rc-box-image')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('vehicle-next'));

    // Step 2 form: still 2/4; fill the required details → step 3.
    expect(await screen.findByTestId('onboarding-vehicle-form')).toBeTruthy();
    expect(screen.getAllByTestId('onboarding-step').pop()).toHaveTextContent('2/4');
    expect(disabled('vehicle-form-next')).toBe(true);
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09EV1234');
    await chooseOption('vehicle-make', 'tata');
    await chooseOption('vehicle-model', 'nexon');
    await fireEvent.press(screen.getByTestId('vehicle-fuel-diesel'));
    await fireEvent.press(screen.getByTestId('vehicle-transmission-manual'));
    await fireEvent.press(screen.getByTestId('vehicle-form-next'));

    // Step 3: RC, Insurance, Pollution Certificate only; the RC from step 2 is attached.
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    expect(screen.getAllByTestId('onboarding-step').pop()).toHaveTextContent('3/4');
    expect(screen.getByTestId('document-rc-box-image').props.source).toEqual({ uri: 'file:///rc.jpg' });
    expect(screen.queryByTestId('document-license')).toBeNull();
    expect(screen.getByTestId('document-pollution')).toHaveTextContent(new RegExp(strings.onboarding.documents.pollutionLabel));
    expect(screen.getByTestId('document-insurance-box-empty')).toBeTruthy();
    expect(disabled('documents-next')).toBe(false);

    // Back to the form: the details are kept. Next again → a fresh step 3 restores from the store.
    await back();
    await waitFor(() => expect(screen.queryByTestId('onboarding-documents')).toBeNull());
    expect(screen.getByTestId('vehicle-number').props.value).toBe('TS09EV1234');
    await fireEvent.press(screen.getByTestId('vehicle-form-next'));
    expect(await screen.findByTestId('document-rc-box-image')).toBeTruthy();

    // Removing the RC disables Next; a PDF insurance re-enables it.
    await fireEvent.press(screen.getByLabelText(strings.onboarding.upload.removeA11y(strings.onboarding.documents.rcLabel)));
    expect(disabled('documents-next')).toBe(true);
    mockedPick.mockResolvedValueOnce([
      { uri: 'file:///ins.pdf', name: 'insurance.pdf', type: 'application/pdf', size: 2048 },
    ] as never);
    await fireEvent.press(screen.getByTestId('document-insurance-box-empty'));
    await fireEvent.press(await screen.findByTestId('document-insurance-source-document'));
    expect(await screen.findByText('insurance.pdf')).toBeTruthy();
    expect(disabled('documents-next')).toBe(false);
    await fireEvent.press(screen.getByTestId('documents-next'));

    // Step 4 → Back → step 3 keeps its choices (removal included) → Next.
    expect(await screen.findByTestId('onboarding-service')).toBeTruthy();
    await back();
    await waitFor(() => expect(screen.queryByTestId('onboarding-service')).toBeNull());
    expect(screen.getByText('insurance.pdf')).toBeTruthy();
    expect(screen.getByTestId('document-rc-box-empty')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('documents-next'));

    // Step 4: 4/4 with a full bar; Next needs the date, the service type and the odometer.
    expect(await screen.findByTestId('onboarding-service')).toBeTruthy();
    expect(screen.getAllByTestId('onboarding-step').pop()).toHaveTextContent('4/4');
    expect(screen.getAllByTestId('onboarding-progress').pop()!.props.accessibilityValue).toMatchObject({ now: 100 });
    expect(screen.queryByText('Mileage')).toBeNull();
    expect(disabled('service-next')).toBe(true);

    await fireEvent.press(screen.getByTestId('service-date'));
    await fireEvent.press(await screen.findByTestId('service-date-done'));
    await fireEvent.press(screen.getByTestId('service-type'));
    await fireEvent.press(await screen.findByTestId('service-type-option-general-service'));
    expect(disabled('service-next')).toBe(true); // odometer missing

    // Odometer: digits only, at most 5.
    await fireEvent.changeText(screen.getByTestId('service-odometer'), '12a4507');
    expect(screen.getByTestId('service-odometer').props.value).toBe('12450');
    expect(screen.getByText(strings.onboarding.service.odometerUnit)).toBeTruthy();
    expect(disabled('service-next')).toBe(false);

    await fireEvent.press(screen.getByTestId('service-centre-type-authorised'));
    await fireEvent.changeText(screen.getByTestId('service-amount'), '123456');
    expect(screen.getByTestId('service-amount').props.value).toBe('1,23,456');

    await fireEvent.press(screen.getByTestId('service-next'));
    expect(await screen.findByTestId('onboarding-complete')).toBeTruthy();

    const done = info.mock.calls.find(([message]) => message === 'onboarding complete');
    expect(done?.[1]).toMatchObject({
      profile: { dlImage: true },
      vehicle: { entryMode: 'rc', rc: 'image/jpeg', number: true, make: 'tata', model: 'nexon' },
      documents: { rc: null, insurance: 'application/pdf', pollution: null },
      service: {
        lastServiceDate: true,
        centreType: 'authorised',
        serviceType: 'general-service',
        odometer: true,
        amount: true,
      },
    });
    expect((done?.[1] as { documents: object }).documents).not.toHaveProperty('license');
    // No PII in the log: no uris, numbers or names.
    expect(JSON.stringify(done)).not.toMatch(/file:\/\/|insurance\.pdf|123456|TS09EV1234|12450/);
    expect(useOnboardingStore.getState().service.odometer).toBe('12450');
  });

  it('"Add your vehicle details manually" opens an empty form; Back returns to the entry', async () => {
    await renderFlow();
    await fireEvent.press(screen.getByTestId('profile-skip'));
    await fireEvent.press(await screen.findByTestId('vehicle-manual'));
    expect(await screen.findByTestId('onboarding-vehicle-form')).toBeTruthy();
    expect(screen.getByTestId('vehicle-number').props.value).toBe('');
    expect(screen.getByTestId('vehicle-make-input', HIDDEN).props.value).toBe('');
    expect(useOnboardingStore.getState().vehicleMode).toBe('manual');
    await back();
    await waitFor(() => expect(screen.queryByTestId('onboarding-vehicle-form')).toBeNull());
    expect(screen.getByTestId('onboarding-vehicle')).toBeTruthy();
  });

  it.each([
    ['the entry screen', 'vehicle-skip'],
    ['the form', 'vehicle-form-skip'],
  ])('"Skip for now" on 2/4 (%s) goes to the Dashboard and clears onboarding', async (_where, skipID) => {
    await renderFlow();
    await fireEvent.press(screen.getByTestId('profile-skip'));
    if (skipID === 'vehicle-form-skip') {
      await fireEvent.press(await screen.findByTestId('vehicle-manual'));
    }
    await fireEvent.changeText(await screen.findByTestId('vehicle-number'), 'TS09');
    await fireEvent.press(await screen.findByTestId(skipID));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('onboarding-vehicle', HIDDEN)).toBeNull());
    expect(useOnboardingStore.getState().vehicle.vehicleNumber).toBe('');
  });

  it('"Skip for now" walks steps 3 → 4 and finishes', async () => {
    await renderFlow();
    await fireEvent.press(screen.getByTestId('profile-skip'));
    await fireEvent.press(await screen.findByTestId('vehicle-manual'));
    await fireEvent.changeText(await screen.findByTestId('vehicle-number'), 'TS09EV1234');
    await chooseOption('vehicle-make', 'kia');
    await chooseOption('vehicle-model', 'seltos');
    await fireEvent.press(screen.getByTestId('vehicle-fuel-petrol'));
    await fireEvent.press(screen.getByTestId('vehicle-transmission-automatic'));
    await fireEvent.press(screen.getByTestId('vehicle-form-next'));
    await fireEvent.press(await screen.findByTestId('documents-skip'));
    await fireEvent.press(await screen.findByTestId('service-skip'));
    expect(await screen.findByTestId('onboarding-complete')).toBeTruthy();
  });

  it('service centre search shows mock suggestions narrowed by the chip; picking one fills the field', async () => {
    await renderFlow();
    await fireEvent.press(screen.getByTestId('profile-skip'));
    await fireEvent.press(await screen.findByTestId('vehicle-manual'));
    await fireEvent.changeText(await screen.findByTestId('vehicle-number'), 'TS09EV1234');
    await chooseOption('vehicle-make', 'kia');
    await chooseOption('vehicle-model', 'seltos');
    await fireEvent.press(screen.getByTestId('vehicle-fuel-petrol'));
    await fireEvent.press(screen.getByTestId('vehicle-transmission-automatic'));
    await fireEvent.press(screen.getByTestId('vehicle-form-next'));
    await fireEvent.press(await screen.findByTestId('documents-skip'));
    const search = await screen.findByTestId('service-centre-search');

    await fireEvent(search, 'focus');
    await fireEvent.changeText(search, 'hyderabad');
    expect(screen.getByTestId('service-centre-option-c1')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('service-centre-type-other'));
    expect(screen.queryByTestId('service-centre-option-c1')).toBeNull(); // authorised centres hidden
    await fireEvent.changeText(search, 'speedy');
    await fireEvent.press(screen.getByTestId('service-centre-option-c7'));
    expect(screen.getByTestId('service-centre-search').props.value).toBe('Speedy Car Care');
    expect(screen.queryByTestId('service-centre-suggestions')).toBeNull();

    await fireEvent.changeText(search, 'zzz');
    expect(screen.getByText(strings.onboarding.service.centreNoResults)).toBeTruthy();
    await fireEvent(search, 'blur');
    expect(screen.queryByTestId('service-centre-suggestions')).toBeNull();
    expect(screen.queryByTestId('service-centre-search', HIDDEN)).toBeTruthy();
  });

  it('leaving onboarding clears the store', async () => {
    await renderFlow();
    await fireEvent.press(screen.getByTestId('profile-skip'));
    await fireEvent.changeText(await screen.findByTestId('vehicle-number'), 'TS09');
    expect(useOnboardingStore.getState().vehicle.vehicleNumber).toBe('TS09');
    await screen.unmount();
    expect(useOnboardingStore.getState().vehicle.vehicleNumber).toBe('');
  });
});
