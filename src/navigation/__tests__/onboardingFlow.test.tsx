import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { pick } from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';
import { strings } from '@/constants/strings';
import OnboardingStack from '@/navigation/OnboardingStack';
import type { OnboardingStackParamList } from '@/navigation/types';
import { useOnboardingStore } from '@/store/onboarding.store';
import { Providers } from '../../../test/render';

/*
 * The 3-step stack on top of a Dashboard (as in AppStack), with no signed-in user: Next only navigates
 * (the API path is covered by profileStep.api.test.tsx). Each test starts at the step it covers.
 */

const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const mockedPick = pick as jest.MockedFunction<typeof pick>;
const store = () => useOnboardingStore.getState();

const AppLike = createNativeStackNavigator();
const DashboardStub = () => <Text testID="dashboard">Dashboard</Text>;
const navRef = createNavigationContainerRef();

async function renderFlow(routes: (keyof OnboardingStackParamList)[], firstTestID: string) {
  await render(
    <Providers>
      <NavigationContainer
        ref={navRef}
        initialState={
          {
            routes: [
              { name: 'Dashboard' },
              { name: 'Onboarding', state: { routes: routes.map(name => ({ name })), index: routes.length - 1 } },
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
const stepText = () => screen.getAllByTestId('onboarding-step').pop();
const disabled = (testID: string) => screen.getByTestId(testID).props.accessibilityState?.disabled === true;
const back = async () => {
  const buttons = screen.getAllByLabelText(strings.common.back);
  await fireEvent.press(buttons[buttons.length - 1]); // the top screen's
};

async function pickDate(testID: string, date: Date) {
  await fireEvent.press(screen.getByTestId(testID));
  const picker = await screen.findByTestId(`${testID}-picker`);
  await act(() => picker.props.onChange({ type: 'set' }, date));
  await fireEvent.press(screen.getByTestId(`${testID}-done`));
}

async function fillProfile() {
  await fireEvent.changeText(screen.getByTestId('full-name'), 'Ravi Kumar');
  await fireEvent.changeText(screen.getByTestId('email'), 'ravi@example.com');
}

async function fillDl() {
  await fireEvent.changeText(screen.getByTestId('dl-number'), 'TS0120110012345');
  mockedLibrary.mockResolvedValueOnce({ assets: [{ uri: 'file:///dl.jpg', type: 'image/jpeg', fileName: 'dl.jpg', fileSize: 1024 }] });
  await fireEvent.press(screen.getByTestId('dl-upload-empty'));
  await fireEvent.press(await screen.findByTestId('dl-photo-source-gallery'));
  await screen.findByTestId('dl-upload-image');
  await pickDate('dl-issued-on', new Date(2020, 0, 15));
}

beforeEach(() => {
  mockedLibrary.mockReset();
  mockedPick.mockReset();
});

describe('onboarding flow (Profile → Driving Licence → Documents)', () => {
  it('1/3 Next → 2/3; Back returns to 1/3 with the values kept', async () => {
    await renderFlow(['Step1Profile'], 'onboarding-profile');
    expect(stepText()).toHaveTextContent('1/3');
    await fillProfile();
    await fireEvent.press(screen.getByTestId('profile-next'));
    expect(await screen.findByTestId('onboarding-dl')).toBeTruthy();
    expect(stepText()).toHaveTextContent('2/3');
    expect(screen.getAllByTestId('onboarding-progress').pop()!.props.accessibilityValue).toMatchObject({ now: 67 });

    await back();
    await waitFor(() => expect(screen.queryByTestId('onboarding-dl')).toBeNull());
    expect(screen.getByTestId('full-name').props.value).toBe('Ravi Kumar');
  });

  it('1/3 Skip → 2/3', async () => {
    await renderFlow(['Step1Profile'], 'onboarding-profile');
    await fireEvent.press(screen.getByTestId('profile-skip'));
    expect(await screen.findByTestId('onboarding-dl')).toBeTruthy();
  });

  it('2/3 Next → 3/3 (RC, Insurance, Pollution; no DL card); Back keeps the licence', async () => {
    await renderFlow(['Step1Profile', 'Step2DrivingLicence'], 'onboarding-dl');
    await fillDl();
    await fireEvent.press(screen.getByTestId('dl-next'));
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    expect(stepText()).toHaveTextContent('3/3');
    expect(screen.getByTestId('document-rc-box-empty')).toBeTruthy();
    expect(screen.getByTestId('document-insurance-box-empty')).toBeTruthy();
    expect(screen.getByTestId('document-pollution')).toHaveTextContent(new RegExp(strings.onboarding.documents.pollutionLabel));
    expect(screen.queryByTestId('document-license')).toBeNull();

    await back();
    await waitFor(() => expect(screen.queryByTestId('onboarding-documents')).toBeNull());
    expect(screen.getByTestId('dl-number').props.value).toBe('TS0120110012345');
    expect(screen.getByTestId('dl-upload-image').props.source).toEqual({ uri: 'file:///dl.jpg' });
    expect(store().drivingLicence).toMatchObject({ issuedOn: '2020-01-15', validUpto: null });
  });

  it('2/3 Skip → 3/3', async () => {
    await renderFlow(['Step2DrivingLicence'], 'onboarding-dl');
    await fireEvent.press(screen.getByTestId('dl-skip'));
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
  });

  it('3/3: Vehicle Number + Model on top; four optional cards; number fields appear under an attached card', async () => {
    await renderFlow(['Step3Documents'], 'onboarding-documents');
    expect(screen.getByTestId('documents-vehicle-number')).toBeTruthy();
    expect(screen.getByTestId('documents-vehicle-model')).toBeTruthy();
    for (const key of ['rc', 'insurance', 'pollution', 'fastag']) {
      expect(screen.getByTestId(`document-${key}-box-empty`)).toBeTruthy();
    }
    expect(screen.queryByTestId('document-insurance-policy-no')).toBeNull();
    expect(disabled('documents-next')).toBe(true); // vehicle number + model needed

    mockedPick.mockResolvedValueOnce([{ uri: 'file:///ins.pdf', name: 'insurance.pdf', type: 'application/pdf', size: 2048 }] as never);
    await fireEvent.press(screen.getByTestId('document-insurance-box-empty'));
    await fireEvent.press(await screen.findByTestId('document-insurance-source-document'));
    expect(await screen.findByText('insurance.pdf')).toBeTruthy();
    expect(screen.getByTestId('document-insurance-policy-no')).toBeTruthy();
    expect(screen.getByTestId('document-insurance-insurer')).toBeTruthy();
    expect(screen.queryByTestId('document-rc-registration')).toBeNull(); // the RC uses the vehicle number

    await fireEvent.changeText(screen.getByTestId('documents-vehicle-number'), 'ts09 ev1234');
    expect(screen.getByTestId('documents-vehicle-number').props.value).toBe('TS09EV1234');
    expect(store().documents).toMatchObject({ vehicleNumber: 'TS09EV1234', insurance: { name: 'insurance.pdf' } });
  });

  it('3/3 Skip → Dashboard', async () => {
    await renderFlow(['Step3Documents'], 'onboarding-documents');
    await fireEvent.press(screen.getByTestId('documents-skip'));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(rootRouteNames()).toEqual(['Dashboard']);
  });

  it('leaving onboarding clears the store', async () => {
    await renderFlow(['Step1Profile'], 'onboarding-profile');
    await fireEvent.changeText(screen.getByTestId('full-name'), 'Ravi');
    expect(store().profile?.fullName).toBe('Ravi');
    await screen.unmount();
    expect(store().profile).toBeNull();
  });
});
