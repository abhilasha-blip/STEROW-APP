import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { VEHICLE_LOOKUP_DEBOUNCE_MS, VEHICLE_LOOKUP_MOCK_DELAY_MS } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { Providers } from '../../../../test/render';
import VehicleDetailsScreen, { type VehicleDetailsScreenProps } from '../VehicleDetailsScreen';

const v = strings.onboarding.vehicle;
const HIDDEN = { includeHiddenElements: true };
const mockedLibrary = launchImageLibrary as jest.MockedFunction<typeof launchImageLibrary>;
const Stack = createNativeStackNavigator();

async function renderScreen(props: Partial<VehicleDetailsScreenProps> = {}) {
  const onNext = jest.fn();
  const onSkip = jest.fn();
  await render(
    <Providers>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Step2">
            {() => <VehicleDetailsScreen onNext={onNext} onSkip={onSkip} {...props} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </Providers>,
  );
  await screen.findByTestId('onboarding-vehicle');
  return { onNext, onSkip };
}

const next = () => screen.getByTestId('vehicle-next');
const nextDisabled = () => next().props.accessibilityState?.disabled === true;
const state = (name: string) => screen.getByTestId(`vehicle-state-${name}`);

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

describe('VehicleDetailsScreen – A (empty)', () => {
  it('shows 2/4, the number field, "Or" and the empty RC card; Next disabled', async () => {
    await renderScreen();
    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('2/4');
    expect(screen.getByTestId('onboarding-progress').props.accessibilityValue).toMatchObject({ now: 50 });
    expect(screen.getByText(v.title)).toBeTruthy();
    expect(screen.getByText(v.subtitle)).toBeTruthy();
    expect(screen.getByTestId('vehicle-number').props.placeholder).toBe(v.numberPlaceholder);
    expect(screen.getByText(strings.onboarding.profile.or)).toBeTruthy();
    expect(screen.getByTestId('vehicle-rc-box-empty')).toBeTruthy();
    expect(screen.getByText(v.rcTitle)).toBeTruthy();
    expect(state('empty')).toBeTruthy();
    expect(nextDisabled()).toBe(true);
  });

  it('a disabled Next ignores presses; Skip moves on', async () => {
    const { onNext, onSkip } = await renderScreen();
    await fireEvent.press(next());
    expect(onNext).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('vehicle-skip'));
    expect(onSkip).toHaveBeenCalled();
  });
});

describe('VehicleDetailsScreen – transitions', () => {
  it('A → B: uploading the RC shows the preview and enables Next', async () => {
    mockedLibrary.mockResolvedValueOnce({
      assets: [{ uri: 'file:///rc.jpg', type: 'image/jpeg', fileName: 'rc.jpg', fileSize: 4096 }],
    });
    const { onNext } = await renderScreen();
    await fireEvent.press(screen.getByTestId('vehicle-rc-box-empty'));
    await fireEvent.press(await screen.findByTestId('vehicle-rc-source-gallery'));

    expect(await screen.findByTestId('vehicle-rc-box-image')).toBeTruthy();
    expect(state('rcUploaded')).toBeTruthy();
    expect(nextDisabled()).toBe(false);

    await fireEvent.press(next());
    await waitFor(() => expect(onNext).toHaveBeenCalled());
    expect(onNext.mock.calls[0][0].rcFile).toMatchObject({ uri: 'file:///rc.jpg', mimeType: 'image/jpeg' });
    expect(onNext.mock.calls[0][1]).toBe('lookup');
  });

  it('A → C: a valid number hides the upload, spins for the lookup, then auto-fills; Next enabled', async () => {
    jest.useFakeTimers();
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'ts09 ev-1234');
    expect(screen.getByTestId('vehicle-number').props.value).toBe('TS09EV1234');
    expect(screen.queryByTestId('vehicle-rc-box-empty')).toBeNull(); // Or/Upload hidden
    expect(screen.queryByTestId('vehicle-number-loading', HIDDEN)).toBeNull(); // still debouncing
    expect(nextDisabled()).toBe(true);

    await runLookup();

    expect(screen.queryByTestId('vehicle-number-loading', HIDDEN)).toBeNull();
    expect(state('autofilled')).toBeTruthy();
    expect(screen.getByTestId('vehicle-make-input', HIDDEN).props.value).toBe('MG ZS');
    expect(screen.getByTestId('vehicle-model-input', HIDDEN).props.value).toBe('Essence');
    expect(screen.getByTestId('vehicle-fuel-electric').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('vehicle-transmission-automatic').props.accessibilityState).toMatchObject({
      checked: true,
    });
    expect(screen.getByTestId('vehicle-colour').props.value).toBe('White');
    expect(screen.getByText(v.enterManually)).toBeTruthy();
    expect(screen.queryByText(strings.onboarding.profile.or)).toBeNull();
    expect(nextDisabled()).toBe(false);
  });

  it('changing the number after the lookup clears the auto-filled details', async () => {
    jest.useFakeTimers();
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09EV1234');
    await runLookup();
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09EV123');
    expect(state('typing')).toBeTruthy();
    expect(screen.queryByTestId('vehicle-details')).toBeNull();
    expect(nextDisabled()).toBe(true);
  });

  it('C → D: "Enter details manually" keeps the number, clears the looked-up fields; Next waits for the rest', async () => {
    jest.useFakeTimers();
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09EV1234');
    await runLookup();
    await fireEvent.press(screen.getByTestId('vehicle-manual-link'));

    expect(state('manual')).toBeTruthy();
    expect(screen.getByTestId('vehicle-number').props.value).toBe('TS09EV1234');
    expect(screen.getByTestId('vehicle-make-input', HIDDEN).props.value).toBe('');
    expect(screen.getByTestId('vehicle-model-input', HIDDEN).props.value).toBe('');
    expect(screen.getByTestId('vehicle-colour').props.value).toBe('');
    expect(screen.getByTestId('vehicle-model').props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByTestId('vehicle-fuel-electric').props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByTestId('vehicle-colour').props.placeholder).toBe(v.colourPlaceholder);
    expect(screen.queryByTestId('vehicle-manual-link')).toBeNull();
    expect(screen.getByText(v.findByNumber)).toBeTruthy();
    expect(screen.queryByTestId('vehicle-rc-box-empty')).toBeNull();
    expect(nextDisabled()).toBe(true);

    // Manual mode never looks the number up.
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'KA01AB1234');
    await act(async () => {
      jest.advanceTimersByTime(VEHICLE_LOOKUP_DEBOUNCE_MS + VEHICLE_LOOKUP_MOCK_DELAY_MS);
    });
    expect(screen.queryByTestId('vehicle-number-loading', HIDDEN)).toBeNull();
    expect(screen.getByTestId('vehicle-make-input', HIDDEN).props.value).toBe('');

    jest.useRealTimers();
    await fireEvent.press(screen.getByTestId('vehicle-make'));
    await fireEvent.press(await screen.findByTestId('vehicle-make-option-tata'));
    expect(nextDisabled()).toBe(true);
    await waitFor(() => expect(screen.queryByTestId('vehicle-make-sheet')).toBeNull());
    await fireEvent.press(screen.getByTestId('vehicle-model'));
    await fireEvent.press(await screen.findByTestId('vehicle-model-option-nexon'));
    await waitFor(() => expect(screen.queryByTestId('vehicle-model-sheet')).toBeNull());
    await fireEvent.press(screen.getByTestId('vehicle-fuel-diesel'));
    expect(nextDisabled()).toBe(true);
    await fireEvent.press(screen.getByTestId('vehicle-transmission-manual'));
    expect(nextDisabled()).toBe(false); // Colour is optional
  });

  it('a number the lookup does not know: toast, manual entry, number kept', async () => {
    jest.useFakeTimers();
    await renderScreen();
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09EV0000');
    await runLookup();
    expect(state('manual')).toBeTruthy();
    expect(screen.getByTestId('vehicle-number').props.value).toBe('TS09EV0000');
    expect(screen.getByText(v.notFound)).toBeTruthy(); // toast
    await act(async () => {
      jest.runOnlyPendingTimers(); // let the toast timer finish
    });
  });

  it('D → lookup: "Find my vehicle by number" clears hand-typed details and looks the number up again', async () => {
    jest.useFakeTimers();
    await renderScreen({ initialMode: 'manual' });
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'UP32AB1234');
    await fireEvent.press(screen.getByTestId('vehicle-fuel-diesel'));
    await act(async () => {
      jest.advanceTimersByTime(VEHICLE_LOOKUP_DEBOUNCE_MS + VEHICLE_LOOKUP_MOCK_DELAY_MS);
    });
    expect(state('manual')).toBeTruthy(); // no lookup in manual mode

    await fireEvent.press(screen.getByTestId('vehicle-lookup-link'));
    expect(screen.queryByTestId('vehicle-lookup-link')).toBeNull();
    expect(screen.getByTestId('vehicle-number').props.value).toBe('UP32AB1234');
    expect(nextDisabled()).toBe(true);
    await runLookup();

    expect(state('autofilled')).toBeTruthy();
    expect(screen.getByTestId('vehicle-make-input', HIDDEN).props.value).toBe('Maruti Suzuki');
    expect(screen.getByTestId('vehicle-fuel-petrol').props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByTestId('vehicle-manual-link')).toBeTruthy();
  });

  it('D → lookup with an empty number goes back to state A', async () => {
    await renderScreen({ initialMode: 'manual' });
    await fireEvent.press(screen.getByTestId('vehicle-lookup-link'));
    expect(state('empty')).toBeTruthy();
    expect(screen.getByTestId('vehicle-rc-box-empty')).toBeTruthy();
  });

  it('flags an invalid number on blur and clears the error once it is valid', async () => {
    await renderScreen({ initialMode: 'manual' });
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09');
    await fireEvent(screen.getByTestId('vehicle-number'), 'blur');
    expect(screen.getByText(v.numberInvalid)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('vehicle-number'), 'TS09EV1234');
    expect(screen.queryByText(v.numberInvalid)).toBeNull();
  });
});

describe('VehicleDetailsScreen – SelectField make → model', () => {
  it('Model is disabled until a Make is chosen, and resets when the Make changes', async () => {
    await renderScreen({ initialMode: 'manual' });
    expect(screen.getByTestId('vehicle-model').props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByTestId('vehicle-model-input', HIDDEN).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    await fireEvent.press(screen.getByTestId('vehicle-model'));
    expect(screen.queryByTestId('vehicle-model-sheet')).toBeNull();

    await fireEvent.press(screen.getByTestId('vehicle-make'));
    // 12 makes > 8 → the sheet has a search box.
    expect(await screen.findByTestId('vehicle-make-search')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('vehicle-make-option-hyundai'));
    await waitFor(() => expect(screen.queryByTestId('vehicle-make-sheet')).toBeNull());
    expect(screen.getByTestId('vehicle-model').props.accessibilityState).toMatchObject({ disabled: false });

    await fireEvent.press(screen.getByTestId('vehicle-model'));
    await fireEvent.press(await screen.findByTestId('vehicle-model-option-creta'));
    await waitFor(() => expect(screen.queryByTestId('vehicle-model-sheet')).toBeNull());
    expect(screen.getByTestId('vehicle-model-input', HIDDEN).props.value).toBe('Creta');

    // Re-picking the same make keeps the model …
    await fireEvent.press(screen.getByTestId('vehicle-make'));
    await fireEvent.press(await screen.findByTestId('vehicle-make-option-hyundai'));
    await waitFor(() => expect(screen.queryByTestId('vehicle-make-sheet')).toBeNull());
    expect(screen.getByTestId('vehicle-model-input', HIDDEN).props.value).toBe('Creta');

    // … a different make resets it, and the model list follows the make.
    await fireEvent.press(screen.getByTestId('vehicle-make'));
    await fireEvent.press(await screen.findByTestId('vehicle-make-option-kia'));
    await waitFor(() => expect(screen.queryByTestId('vehicle-make-sheet')).toBeNull());
    expect(screen.getByTestId('vehicle-model-input', HIDDEN).props.value).toBe('');
    await fireEvent.press(screen.getByTestId('vehicle-model'));
    expect(await screen.findByTestId('vehicle-model-option-seltos')).toBeTruthy();
    expect(screen.queryByTestId('vehicle-model-option-creta')).toBeNull();
  });
});
