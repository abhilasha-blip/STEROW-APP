import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { pick } from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { strings } from '@/constants/strings';
import OnboardingStack from '@/navigation/OnboardingStack';
import type { OnboardingStackParamList } from '@/navigation/types';
import { EMPTY_VEHICLE } from '@/screens/onboarding/schemas';
import { EMPTY_PROFILE } from '@/screens/onboarding/useOnboardingProfileForm';
import { useOnboardingStore } from '@/store/onboarding.store';
import { logger } from '@/utils/logger';
import type { UploadedFile } from '@/utils/uploadFile';
import { Providers } from '../../../test/render';

/*
 * Each test starts at the step it covers (store seeded, earlier steps in the stack for Back) instead of
 * walking the whole flow: one test that walked steps 1–4 took ~2.5 s under load (two photo picks wait on
 * BottomSheet's real 400 ms iOS dismiss fallback, plus four select sheets) and timed out at Jest's 5 s.
 */

const HIDDEN = { includeHiddenElements: true };
const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const mockedPick = pick as jest.MockedFunction<typeof pick>;
const store = () => useOnboardingStore.getState();

const RC: UploadedFile = { uri: 'file:///rc.jpg', name: 'rc.jpg', mimeType: 'image/jpeg' };
const VEHICLE = {
  ...EMPTY_VEHICLE,
  vehicleNumber: 'TS09EV1234',
  rcFile: RC,
  make: 'tata',
  model: 'nexon',
  fuelType: 'diesel' as const,
  transmission: 'manual' as const,
};

const AppLike = createNativeStackNavigator();
const DashboardStub = () => <Text testID="dashboard">Dashboard</Text>;
const navRef = createNavigationContainerRef();

/** Onboarding on top of a Dashboard, as in AppStack, opened at `routes` (the last one on top). */
async function renderFlow(
  routes: (keyof OnboardingStackParamList)[] = ['Step1Profile'],
  firstTestID = 'onboarding-profile',
) {
  await render(
    <Providers>
      <NavigationContainer
        ref={navRef}
        initialState={
          {
            routes: [
              { name: 'Dashboard' },
              {
                name: 'Onboarding',
                state: { routes: routes.map(name => ({ name })), index: routes.length - 1 },
              },
            ],
            index: 1,
          } as never
        }
      >
        <AppLike.Navigator screenOptions={{ headerShown: false }}>
          <AppLike.Screen name="Dashboard" component={DashboardStub} />
          <AppLike.Screen name="Onboarding" component={OnboardingStack} />
        </AppLike.Navigator>
      </NavigationContainer>
    </Providers>,
  );
  await screen.findByTestId(firstTestID);
}

const rootRouteNames = () => navRef.getRootState()?.routes.map(r => r.name);

async function chooseOption(select: string, option: string) {
  await fireEvent.press(screen.getByTestId(select));
  await fireEvent.press(await screen.findByTestId(`${select}-option-${option}`));
  await waitFor(() => expect(screen.queryByTestId(`${select}-sheet`)).toBeNull());
}

const disabled = (testID: string) =>
  screen.getByTestId(testID).props.accessibilityState?.disabled === true;
const back = async () => {
  const buttons = screen.getAllByLabelText(strings.common.back);
  await fireEvent.press(buttons[buttons.length - 1]); // the top screen's
};

async function pickImage(sheet: string, uri: string) {
  mockedLibrary.mockResolvedValueOnce({
    assets: [{ uri, type: 'image/jpeg', fileName: uri.split('/').pop(), fileSize: 1024 }],
  });
  await fireEvent.press(await screen.findByTestId(`${sheet}-gallery`));
  await waitFor(() => expect(mockedLibrary).toHaveBeenCalled());
  mockedLibrary.mockClear();
}

beforeEach(() => {
  mockedLibrary.mockReset();
  mockedPick.mockReset();
});

describe('onboarding flow (steps 1–4)', () => {
  it('step 2: RC on the entry → Next → form (RC kept, no details) → fill → step 3 with the RC and no DL', async () => {
    await renderFlow(['Step1Profile', 'Step2Vehicle'], 'onboarding-vehicle');
    expect(screen.getAllByTestId('onboarding-step').pop()).toHaveTextContent('2/4');
    await fireEvent.press(screen.getByTestId('vehicle-rc-box-empty'));
    await pickImage('vehicle-rc-source', 'file:///rc.jpg');
    expect(await screen.findByTestId('vehicle-rc-box-image')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('vehicle-next'));

    expect(await screen.findByTestId('onboarding-vehicle-form')).toBeTruthy();
    expect(screen.getAllByTestId('onboarding-step').pop()).toHaveTextContent('2/4');
    expect(store().vehicleMode).toBe('rc');
    expect(disabled('vehicle-form-next')).toBe(true);
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09EV1234');
    await chooseOption('vehicle-make', 'tata');
    await chooseOption('vehicle-model', 'nexon');
    await fireEvent.press(screen.getByTestId('vehicle-fuel-diesel'));
    await fireEvent.press(screen.getByTestId('vehicle-transmission-manual'));
    await fireEvent.press(screen.getByTestId('vehicle-form-next'));

    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    expect(screen.getAllByTestId('onboarding-step').pop()).toHaveTextContent('3/4');
    expect(screen.getByTestId('document-rc-box-image').props.source).toEqual({
      uri: 'file:///rc.jpg',
    });
    expect(screen.queryByTestId('document-license')).toBeNull();
    expect(screen.getByTestId('document-pollution')).toHaveTextContent(
      new RegExp(strings.onboarding.documents.pollutionLabel),
    );
    expect(screen.getByTestId('document-insurance-box-empty')).toBeTruthy();
    expect(disabled('documents-next')).toBe(false);

    // Back to the form: the details are kept.
    await back();
    await waitFor(() => expect(screen.queryByTestId('onboarding-documents')).toBeNull());
    expect(screen.getByTestId('vehicle-number').props.value).toBe('TS09EV1234');
    expect(screen.getByTestId('vehicle-make-input', HIDDEN).props.value).toBe('Tata');
  });

  it('step 3: RC prefilled from step 2; removal + a PDF; Back from step 4 keeps the choices', async () => {
    store().setVehicle(VEHICLE);
    await renderFlow(['Step2VehicleForm', 'Step3Documents'], 'onboarding-documents');
    expect(screen.getByTestId('document-rc-box-image').props.source).toEqual({
      uri: 'file:///rc.jpg',
    });

    await fireEvent.press(
      screen.getByLabelText(
        strings.onboarding.upload.removeA11y(strings.onboarding.documents.rcLabel),
      ),
    );
    expect(disabled('documents-next')).toBe(true);
    mockedPick.mockResolvedValueOnce([
      { uri: 'file:///ins.pdf', name: 'insurance.pdf', type: 'application/pdf', size: 2048 },
    ] as never);
    await fireEvent.press(screen.getByTestId('document-insurance-box-empty'));
    await fireEvent.press(await screen.findByTestId('document-insurance-source-document'));
    expect(await screen.findByText('insurance.pdf')).toBeTruthy();
    expect(disabled('documents-next')).toBe(false);
    await fireEvent.press(screen.getByTestId('documents-next'));

    expect(await screen.findByTestId('onboarding-service')).toBeTruthy();
    await back();
    await waitFor(() => expect(screen.queryByTestId('onboarding-service')).toBeNull());
    expect(screen.getByText('insurance.pdf')).toBeTruthy();
    expect(screen.getByTestId('document-rc-box-empty')).toBeTruthy();

    // Back to the form and Next again → a fresh step 3 restores from the store.
    await back();
    await waitFor(() => expect(screen.queryByTestId('onboarding-documents')).toBeNull());
    await fireEvent.press(screen.getByTestId('vehicle-form-next'));
    expect(await screen.findByText('insurance.pdf')).toBeTruthy();
    expect(screen.getByTestId('document-rc-box-empty')).toBeTruthy();
  });

  it('step 4: Next needs date + type + odometer (digits, max 5); finishing logs without PII', async () => {
    const info = jest.spyOn(logger, 'info');
    store().setProfile({ ...EMPTY_PROFILE, dlImageUri: 'file:///dl.jpg' });
    store().setVehicle(VEHICLE);
    store().setVehicleMode('rc');
    store().setDocument('rc', null);
    store().setDocument('insurance', {
      uri: 'file:///ins.pdf',
      name: 'insurance.pdf',
      mimeType: 'application/pdf',
    });
    await renderFlow(['Step4Service'], 'onboarding-service');

    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('4/4');
    expect(screen.getByTestId('onboarding-progress').props.accessibilityValue).toMatchObject({
      now: 100,
    });
    expect(screen.queryByText('Mileage')).toBeNull();
    expect(disabled('service-next')).toBe(true);

    await fireEvent.press(screen.getByTestId('service-date'));
    await fireEvent.press(await screen.findByTestId('service-date-done'));
    await fireEvent.press(screen.getByTestId('service-type'));
    await fireEvent.press(await screen.findByTestId('service-type-option-general-service'));
    expect(disabled('service-next')).toBe(true); // odometer missing

    await fireEvent.changeText(screen.getByTestId('service-odometer'), '12a4507');
    expect(screen.getByTestId('service-odometer').props.value).toBe('12450');
    expect(screen.getByText(strings.onboarding.service.odometerUnit)).toBeTruthy();
    expect(disabled('service-next')).toBe(false);

    await fireEvent.press(screen.getByTestId('service-centre-type-authorised'));
    await fireEvent.changeText(screen.getByTestId('service-amount'), '123456');
    expect(screen.getByTestId('service-amount').props.value).toBe('1,23,456');

    await fireEvent.press(screen.getByTestId('service-next'));
    // 4/4 → straight to the Dashboard, onboarding reset out of history.
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(rootRouteNames()).toEqual(['Dashboard']);

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
    // Finished: onboarding unmounted, its in-memory data dropped.
    await waitFor(() => expect(store().service.odometer).toBe(''));
  });

  it("finishing removes onboarding from the stack (Back can't return) and clears it", async () => {
    store().setVehicle(VEHICLE);
    await renderFlow(
      ['Step1Profile', 'Step2Vehicle', 'Step2VehicleForm', 'Step3Documents', 'Step4Service'],
      'onboarding-service',
    );
    await fireEvent.press(screen.getByTestId('service-skip'));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(rootRouteNames()).toEqual(['Dashboard']);
    expect(navRef.canGoBack()).toBe(false);
    await waitFor(() => expect(screen.queryByTestId('onboarding-service', HIDDEN)).toBeNull());
    expect(store().vehicle).toEqual(EMPTY_VEHICLE);
  });

  it('"Add your vehicle details manually" opens an empty form; Back returns to the entry', async () => {
    await renderFlow(['Step1Profile', 'Step2Vehicle'], 'onboarding-vehicle');
    await fireEvent.press(screen.getByTestId('vehicle-manual'));
    expect(await screen.findByTestId('onboarding-vehicle-form')).toBeTruthy();
    expect(screen.getByTestId('vehicle-number').props.value).toBe('');
    expect(screen.getByTestId('vehicle-make-input', HIDDEN).props.value).toBe('');
    expect(store().vehicleMode).toBe('manual');
    await back();
    await waitFor(() => expect(screen.queryByTestId('onboarding-vehicle-form')).toBeNull());
    expect(screen.getByTestId('onboarding-vehicle')).toBeTruthy();
  });

  it.each([
    ['the entry screen', 'vehicle-skip'],
    ['the form', 'vehicle-form-skip'],
  ])(
    '"Skip for now" on 2/4 (%s) → Dashboard, onboarding off the stack; step 1 kept, vehicle step cleared',
    async (_where, skipID) => {
      await renderFlow();
      // Step 1: DL photo + name, then Next / Skip into step 2.
      await fireEvent.press(screen.getByTestId('dl-upload-empty'));
      await pickImage('dl-photo-source', 'file:///dl.jpg');
      await fireEvent.changeText(await screen.findByTestId('full-name'), 'Ravi Kumar');
      await fireEvent.press(screen.getByTestId('profile-skip'));
      if (skipID === 'vehicle-form-skip') {
        await fireEvent.press(await screen.findByTestId('vehicle-manual'));
      }
      await fireEvent.changeText(await screen.findByTestId('vehicle-number'), 'TS09');
      expect(store().vehicle.vehicleNumber).toBe('TS09');

      await fireEvent.press(await screen.findByTestId(skipID));
      expect(await screen.findByTestId('dashboard')).toBeTruthy();
      expect(rootRouteNames()).toEqual(['Dashboard']);
      await waitFor(() => expect(screen.queryByTestId('onboarding-vehicle', HIDDEN)).toBeNull());

      expect(store().vehicle).toEqual(EMPTY_VEHICLE);
      expect(store().profile).toMatchObject({
        dlImageUri: 'file:///dl.jpg',
        fullName: 'Ravi Kumar',
      });
      expect(store().retainOnExit).toBe(false); // only that one exit keeps the data
    },
  );

  it('"Skip for now" on steps 3 and 4 moves on, then to the Dashboard', async () => {
    await renderFlow(['Step3Documents'], 'onboarding-documents');
    await fireEvent.press(screen.getByTestId('documents-skip'));
    await fireEvent.press(await screen.findByTestId('service-skip'));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(rootRouteNames()).toEqual(['Dashboard']);
  });

  it('service centre search shows mock suggestions narrowed by the chip; picking one fills the field', async () => {
    await renderFlow(['Step4Service'], 'onboarding-service');
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
