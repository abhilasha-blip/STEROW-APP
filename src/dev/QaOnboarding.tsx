/**
 * DEV ONLY: opens an onboarding step in a seeded state for repeatable simulator screenshots, with no
 * sign-in and no taps. Launch with iOS launch arguments (read from NSUserDefaults):
 *
 *   xcrun simctl launch booted com.sterow.app \
 *     -qaScenario step3-rc -qaFile "$PWD/design/onboarding/sample-rc.png"
 *
 * `qaFile` is a host path the simulator can read (QA sample content stays out of the app bundle).
 * App.tsx only requires this file under __DEV__.
 */
import React from 'react';
import { Platform, Settings } from 'react-native';
import { NavigationContainer, type InitialState } from '@react-navigation/native';
import OnboardingStack from '@/navigation/OnboardingStack';
import type { OnboardingStackParamList } from '@/navigation/types';
import { EMPTY_SERVICE, EMPTY_VEHICLE } from '@/screens/onboarding/schemas';
import { useOnboardingStore } from '@/store/onboarding.store';
import { createNavigationTheme, useTheme } from '@/theme';
import type { UploadedFile } from '@/utils/uploadFile';

type Scenario = {
  route: keyof OnboardingStackParamList;
  params?: object;
  seed?: (file: UploadedFile | null) => void;
};

const AUTOFILLED = {
  ...EMPTY_VEHICLE,
  vehicleNumber: 'TS09EV1234',
  make: 'mg-zs',
  model: 'essence',
  fuelType: 'electric' as const,
  transmission: 'automatic' as const,
  colour: 'White',
};

const store = () => useOnboardingStore.getState();

export const QA_SCENARIOS: Record<string, Scenario> = {
  'step2-empty': { route: 'Step2Vehicle' },
  'step2-rc': { route: 'Step2Vehicle', seed: f => store().setVehicle({ ...EMPTY_VEHICLE, rcFile: f }) },
  /** Entry with a number the lookup already found (check icon, Next enabled). */
  'step2-found': { route: 'Step2Vehicle', seed: () => store().setVehicle(AUTOFILLED) },
  /** The form prefilled by the lookup (2b). */
  'step2-form-prefilled': { route: 'Step2VehicleForm', seed: () => store().setVehicle(AUTOFILLED) },
  /** The empty form ("Add your vehicle details manually", 2c). */
  'step2-form-empty': { route: 'Step2VehicleForm', seed: () => store().startManualVehicle() },
  'step2-make-sheet': {
    route: 'Step2VehicleForm',
    params: { qaOpenMakeSheet: true },
    seed: () => store().setVehicle(AUTOFILLED),
  },
  'step3-empty': { route: 'Step3Documents' },
  'step3-rc': { route: 'Step3Documents', seed: f => store().setVehicle({ ...EMPTY_VEHICLE, rcFile: f }) },
  'step4-empty': { route: 'Step4Service' },
  'step4-filled': {
    route: 'Step4Service',
    seed: () =>
      store().setService({
        ...EMPTY_SERVICE,
        lastServiceDate: '2026-10-12',
        centreType: 'authorised',
        centreName: 'MG Hitech City',
        serviceType: 'general-service',
        odometer: '12450',
        amount: '123456',
      }),
  },
};

export function getQaScenarioName(): string | null {
  if (!__DEV__ || Platform.OS !== 'ios') {
    return null;
  }
  const name = Settings.get('qaScenario');
  return typeof name === 'string' && name in QA_SCENARIOS ? name : null;
}

function qaFile(): UploadedFile | null {
  const path = Settings.get('qaFile');
  if (typeof path !== 'string' || !path) {
    return null;
  }
  // iOS Image needs a percent-encoded file URL (the repo path contains a space).
  const uri = path.startsWith('file://') ? path : `file://${encodeURI(path)}`;
  return { uri, name: 'sample-rc.png', mimeType: 'image/png' };
}

export default function QaOnboarding({ name }: { name: string }) {
  const theme = useTheme();
  const [initialState] = React.useState<InitialState>(() => {
    const scenario = QA_SCENARIOS[name];
    store().reset();
    scenario.seed?.(qaFile());
    return { routes: [{ name: scenario.route, params: scenario.params }] };
  });
  return (
    <NavigationContainer theme={createNavigationTheme(theme)} initialState={initialState}>
      <OnboardingStack />
    </NavigationContainer>
  );
}
