import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
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

async function renderFlow() {
  await render(
    <Providers>
      <NavigationContainer>
        <OnboardingStack />
      </NavigationContainer>
    </Providers>,
  );
  await screen.findByTestId('onboarding-profile');
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

beforeEach(() => {
  mockedLibrary.mockReset();
  mockedPick.mockReset();
});

describe('onboarding flow (steps 1–4)', () => {
  it('Back keeps values; step 3 is prefilled from steps 1–2; finishing logs and shows the placeholder', async () => {
    const info = jest.spyOn(logger, 'info');
    await renderFlow();

    // Step 1: upload the DL photo, then skip.
    await fireEvent.press(screen.getByTestId('dl-upload-empty'));
    await pickImage('dl-photo-source', 'file:///dl.jpg');
    expect(await screen.findByTestId('dl-upload-image')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('profile-skip'));

    // Step 2: attach the RC (state B) and continue.
    expect(await screen.findByTestId('onboarding-vehicle')).toBeTruthy();
    expect(screen.getAllByTestId('onboarding-step').pop()).toHaveTextContent('2/4');
    await fireEvent.press(screen.getByTestId('vehicle-rc-box-empty'));
    await pickImage('vehicle-rc-source', 'file:///rc.jpg');
    expect(await screen.findByTestId('vehicle-rc-box-image')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('vehicle-next'));

    // Step 3: RC from step 2 and the licence from step 1 are attached; Next is enabled.
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    expect(screen.getAllByTestId('onboarding-step').pop()).toHaveTextContent('3/4');
    expect(screen.getByTestId('document-rc-box-image').props.source).toEqual({ uri: 'file:///rc.jpg' });
    expect(screen.getByTestId('document-license-box-image').props.source).toEqual({ uri: 'file:///dl.jpg' });
    expect(screen.getByTestId('document-insurance-box-empty')).toBeTruthy();
    expect(disabled('documents-next')).toBe(false);

    // Back to step 2: the RC is still there. Next again → a fresh step 3 restores from the store.
    await back();
    await waitFor(() => expect(screen.queryByTestId('onboarding-documents')).toBeNull());
    expect(screen.getByTestId('vehicle-rc-box-image')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('vehicle-next'));
    expect(await screen.findByTestId('document-rc-box-image')).toBeTruthy();

    // Removing both prefilled documents disables Next; a PDF insurance re-enables it.
    await fireEvent.press(screen.getByLabelText(strings.onboarding.upload.removeA11y(strings.onboarding.documents.rcLabel)));
    await fireEvent.press(
      screen.getByLabelText(strings.onboarding.upload.removeA11y(strings.onboarding.documents.licenseLabel)),
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

    // Step 4 → Back → step 3 keeps its choices (removal included) → Next.
    expect(await screen.findByTestId('onboarding-service')).toBeTruthy();
    await back();
    await waitFor(() => expect(screen.queryByTestId('onboarding-service')).toBeNull());
    expect(screen.getByText('insurance.pdf')).toBeTruthy();
    expect(screen.getByTestId('document-rc-box-empty')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('documents-next'));

    // Step 4: 4/4 with a full bar; Next needs the date and the service type.
    expect(await screen.findByTestId('onboarding-service')).toBeTruthy();
    expect(screen.getAllByTestId('onboarding-step').pop()).toHaveTextContent('4/4');
    expect(screen.getAllByTestId('onboarding-progress').pop()!.props.accessibilityValue).toMatchObject({ now: 100 });
    expect(disabled('service-next')).toBe(true);

    await fireEvent.press(screen.getByTestId('service-date'));
    await fireEvent.press(await screen.findByTestId('service-date-done'));
    expect(disabled('service-next')).toBe(true);
    await fireEvent.press(screen.getByTestId('service-type'));
    await fireEvent.press(await screen.findByTestId('service-type-option-general-service'));
    expect(disabled('service-next')).toBe(false);

    await fireEvent.press(screen.getByTestId('service-centre-type-authorised'));
    await fireEvent.changeText(screen.getByTestId('service-amount'), '123456');
    expect(screen.getByTestId('service-amount').props.value).toBe('1,23,456');
    await fireEvent.changeText(screen.getByTestId('service-mileage'), '12a450');
    expect(screen.getByTestId('service-mileage').props.value).toBe('12,450');
    expect(screen.getByText(strings.onboarding.service.mileageUnit)).toBeTruthy();

    await fireEvent.press(screen.getByTestId('service-next'));
    expect(await screen.findByTestId('onboarding-complete')).toBeTruthy();

    const done = info.mock.calls.find(([message]) => message === 'onboarding complete');
    expect(done?.[1]).toMatchObject({
      profile: { dlImage: true },
      vehicle: { entryMode: 'lookup', rc: 'image/jpeg', number: false },
      documents: { rc: null, license: null, insurance: 'application/pdf', pollution: null },
      service: { lastServiceDate: true, centreType: 'authorised', serviceType: 'general-service', amount: true },
    });
    // No PII in the log: no uris, numbers or names.
    expect(JSON.stringify(done)).not.toMatch(/file:\/\/|insurance\.pdf|123456/);
    expect(useOnboardingStore.getState().service.amount).toBe('123456');
  });

  it('"Skip for now" walks steps 2 → 3 → 4 and finishes', async () => {
    await renderFlow();
    await fireEvent.press(screen.getByTestId('profile-skip'));
    await fireEvent.press(await screen.findByTestId('vehicle-skip'));
    await fireEvent.press(await screen.findByTestId('documents-skip'));
    await fireEvent.press(await screen.findByTestId('service-skip'));
    expect(await screen.findByTestId('onboarding-complete')).toBeTruthy();
  });

  it('service centre search shows mock suggestions narrowed by the chip; picking one fills the field', async () => {
    await renderFlow();
    await fireEvent.press(screen.getByTestId('profile-skip'));
    await fireEvent.press(await screen.findByTestId('vehicle-skip'));
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
