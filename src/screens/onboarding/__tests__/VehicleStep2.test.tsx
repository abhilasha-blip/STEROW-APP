import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { VEHICLE_LOOKUP_DEBOUNCE_MS, VEHICLE_LOOKUP_MOCK_DELAY_MS } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { Providers } from '../../../../test/render';
import { EMPTY_VEHICLE } from '../schemas';
import VehicleEntryScreen, { type VehicleEntryScreenProps } from '../VehicleEntryScreen';
import VehicleFormScreen, { type VehicleFormScreenProps } from '../VehicleFormScreen';

const v = strings.onboarding.vehicle;
const HIDDEN = { includeHiddenElements: true };
const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const LOOKUP = { make: 'mg-zs', model: 'essence', fuelType: 'electric', transmission: 'automatic', colour: 'White' };

const disabled = (testID: string) => screen.getByTestId(testID).props.accessibilityState?.disabled === true;

async function renderEntry(props: Partial<VehicleEntryScreenProps> = {}) {
  const handlers = { onNext: jest.fn(), onSkip: jest.fn(), onManual: jest.fn(), onChange: jest.fn() };
  await render(
    <Providers>
      <NavigationContainer>
        <VehicleEntryScreen {...handlers} {...props} />
      </NavigationContainer>
    </Providers>,
  );
  await screen.findByTestId('onboarding-vehicle');
  return handlers;
}

async function renderForm(props: Partial<VehicleFormScreenProps> = {}) {
  const handlers = { onNext: jest.fn(), onSkip: jest.fn() };
  await render(
    <Providers>
      <NavigationContainer>
        <VehicleFormScreen {...handlers} {...props} />
      </NavigationContainer>
    </Providers>,
  );
  await screen.findByTestId('onboarding-vehicle-form');
  return handlers;
}

/** Debounce, then the simulated lookup. */
async function runLookup() {
  await act(async () => {
    jest.advanceTimersByTime(VEHICLE_LOOKUP_DEBOUNCE_MS);
  });
  expect(screen.getByTestId('vehicle-number-loading', HIDDEN)).toBeTruthy();
  await act(async () => {
    jest.advanceTimersByTime(VEHICLE_LOOKUP_MOCK_DELAY_MS);
  });
}

beforeEach(() => mockedLibrary.mockReset());
afterEach(() => jest.useRealTimers());

describe('step 2 entry', () => {
  it('shows 2/4, Vehicle Number, "Or", the optional RC upload and the manual button; Next disabled', async () => {
    await renderEntry();
    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('2/4');
    expect(screen.getByTestId('onboarding-progress').props.accessibilityValue).toMatchObject({ now: 50 });
    expect(screen.getByTestId('vehicle-number').props.placeholder).toBe(v.numberPlaceholder);
    expect(screen.getByText(strings.onboarding.profile.or)).toBeTruthy();
    expect(screen.getByText(v.rcLabel)).toBeTruthy();
    expect(screen.getByTestId('vehicle-rc-box-empty')).toBeTruthy();
    expect(screen.getByRole('button', { name: v.addManually })).toBeTruthy();
    // The entry screen has no vehicle details.
    expect(screen.queryByTestId('vehicle-make')).toBeNull();
    expect(disabled('vehicle-next')).toBe(true);
  });

  it('lookup found → check icon, Next enabled, Next hands over the lookup', async () => {
    jest.useFakeTimers();
    const { onNext, onChange } = await renderEntry();
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'ts09 ev1234');
    expect(screen.getByTestId('vehicle-number').props.value).toBe('TS09EV1234');
    expect(onChange).toHaveBeenLastCalledWith({ vehicleNumber: 'TS09EV1234', rcFile: null });
    expect(disabled('vehicle-next')).toBe(true);
    await runLookup();
    expect(screen.getByTestId('vehicle-number-found')).toBeTruthy();
    expect(disabled('vehicle-next')).toBe(false);
    await fireEvent.press(screen.getByTestId('vehicle-next'));
    expect(onNext).toHaveBeenCalledWith({ vehicleNumber: 'TS09EV1234', rcFile: null }, LOOKUP);
  });

  it('changing the number after a lookup disables Next until the new number is found', async () => {
    jest.useFakeTimers();
    await renderEntry();
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09EV1234');
    await runLookup();
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09EV123');
    expect(screen.queryByTestId('vehicle-number-found')).toBeNull();
    expect(disabled('vehicle-next')).toBe(true);
  });

  it('not found → toast, stays on the entry screen, Next disabled', async () => {
    jest.useFakeTimers();
    const { onNext } = await renderEntry();
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09EV0000');
    await runLookup();
    expect(screen.getByText(v.notFound)).toBeTruthy();
    expect(screen.getByTestId('vehicle-number').props.value).toBe('TS09EV0000');
    expect(disabled('vehicle-next')).toBe(true);
    await fireEvent.press(screen.getByTestId('vehicle-next'));
    expect(onNext).not.toHaveBeenCalled();
    await act(async () => {
      jest.runOnlyPendingTimers(); // let the toast timer finish
    });
  });

  it('an invalid number shows an error on blur, cleared once valid', async () => {
    await renderEntry();
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09');
    await fireEvent(screen.getByTestId('vehicle-number'), 'blur');
    expect(screen.getByText(v.numberInvalid)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09EV1234');
    expect(screen.queryByText(v.numberInvalid)).toBeNull();
  });

  it('RC uploaded → Next enabled and hands over the RC (no lookup)', async () => {
    mockedLibrary.mockResolvedValueOnce({
      assets: [{ uri: 'file:///rc.jpg', type: 'image/jpeg', fileName: 'rc.jpg', fileSize: 4096 }],
    });
    const { onNext } = await renderEntry();
    await fireEvent.press(screen.getByTestId('vehicle-rc-box-empty'));
    await fireEvent.press(await screen.findByTestId('vehicle-rc-source-gallery'));
    expect(await screen.findByTestId('vehicle-rc-box-image')).toBeTruthy();
    expect(disabled('vehicle-next')).toBe(false);
    await fireEvent.press(screen.getByTestId('vehicle-next'));
    expect(onNext).toHaveBeenCalledWith(
      { vehicleNumber: '', rcFile: expect.objectContaining({ uri: 'file:///rc.jpg' }) },
      null,
    );
  });

  it('the manual button and Skip call their handlers', async () => {
    const { onManual, onSkip } = await renderEntry();
    await fireEvent.press(screen.getByTestId('vehicle-manual'));
    expect(onManual).toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('vehicle-skip'));
    expect(onSkip).toHaveBeenCalled();
  });

  it('a restored lookup (Back from the form) is shown as found without a new lookup', async () => {
    const lookupVehicle = jest.fn();
    await renderEntry({ initialNumber: 'TS09EV1234', initialLookup: LOOKUP as never, lookupVehicle });
    expect(screen.getByTestId('vehicle-number').props.value).toBe('TS09EV1234');
    expect(screen.getByTestId('vehicle-number-found')).toBeTruthy();
    expect(disabled('vehicle-next')).toBe(false);
    expect(lookupVehicle).not.toHaveBeenCalled();
  });
});

describe('step 2 form (2b/2c)', () => {
  it('prefilled: shows Number, Make, Model, Fuel, Transmission, Colour; Next enabled', async () => {
    const { onNext } = await renderForm({ initialValues: { ...EMPTY_VEHICLE, vehicleNumber: 'TS09EV1234', ...LOOKUP } as never });
    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('2/4');
    expect(screen.getByTestId('vehicle-number').props.value).toBe('TS09EV1234');
    expect(screen.getByTestId('vehicle-make-input', HIDDEN).props.value).toBe('MG ZS');
    expect(screen.getByTestId('vehicle-fuel-electric').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('vehicle-transmission-automatic').props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByTestId('vehicle-colour').props.value).toBe('White');
    expect(disabled('vehicle-form-next')).toBe(false);
    await fireEvent.changeText(screen.getByTestId('vehicle-colour'), '  Red ');
    await fireEvent.press(screen.getByTestId('vehicle-form-next'));
    await waitFor(() => expect(onNext).toHaveBeenCalledWith(expect.objectContaining({ colour: 'Red', make: 'mg-zs' })));
  });

  it('empty (manual): Next needs Number + Make + Model + Fuel + Transmission; a new Make clears the Model', async () => {
    await renderForm();
    expect(screen.getByTestId('vehicle-number').props.value).toBe('');
    expect(disabled('vehicle-form-next')).toBe(true);
    expect(screen.getByTestId('vehicle-model').props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'up32ab1234');
    await fireEvent.press(screen.getByTestId('vehicle-make'));
    await fireEvent.press(await screen.findByTestId('vehicle-make-option-tata'));
    await waitFor(() => expect(screen.queryByTestId('vehicle-make-sheet')).toBeNull());
    await fireEvent.press(screen.getByTestId('vehicle-model'));
    await fireEvent.press(await screen.findByTestId('vehicle-model-option-nexon'));
    await waitFor(() => expect(screen.queryByTestId('vehicle-model-sheet')).toBeNull());
    await fireEvent.press(screen.getByTestId('vehicle-fuel-diesel'));
    expect(disabled('vehicle-form-next')).toBe(true);
    await fireEvent.press(screen.getByTestId('vehicle-transmission-manual'));
    expect(disabled('vehicle-form-next')).toBe(false); // Colour is optional

    await fireEvent.press(screen.getByTestId('vehicle-make'));
    await fireEvent.press(await screen.findByTestId('vehicle-make-option-kia'));
    await waitFor(() => expect(screen.queryByTestId('vehicle-make-sheet')).toBeNull());
    expect(screen.getByTestId('vehicle-model-input', HIDDEN).props.value).toBe('');
    expect(disabled('vehicle-form-next')).toBe(true);
  });

  it('Skip calls onSkip', async () => {
    const { onSkip } = await renderForm();
    await fireEvent.press(screen.getByTestId('vehicle-form-skip'));
    expect(onSkip).toHaveBeenCalled();
  });
});
