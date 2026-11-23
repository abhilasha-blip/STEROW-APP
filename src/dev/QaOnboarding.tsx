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
import { useOnboardingStore } from '@/store/onboarding.store';
import { createNavigationTheme, useTheme } from '@/theme';
import type { UploadedFile } from '@/utils/uploadFile';

type Scenario = {
  route: keyof OnboardingStackParamList;
  params?: object;
  seed?: (file: UploadedFile | null) => void;
};

const store = () => useOnboardingStore.getState();

export const QA_SCENARIOS: Record<string, Scenario> = {
  'step1-profile': { route: 'Step1Profile' },
  'step1-filled': {
    route: 'Step1Profile',
    seed: () => store().setProfile({ avatar: { type: 'preset', id: 'avatar-07' }, fullName: 'Ravi Kumar', email: 'ravi@example.com' }),
  },
  'step2-dl-empty': { route: 'Step2DrivingLicence' },
  /** The licence filled in: number, photo (`qaFile`), Issued on, Valid up to. */
  'step2-dl-filled': {
    route: 'Step2DrivingLicence',
    seed: f =>
      store().setDrivingLicence({
        dlNumber: 'DL0000000000000',
        dlImageUri: f?.uri ?? null,
        issuedOn: '2020-01-15',
        validUpto: '2040-01-14',
      }),
  },
  'step3-empty': { route: 'Step3Documents' },
  /** RC uploaded (✓ Added), Insurance file without details (needs details), PUC details typed. */
  'step3-filled': {
    route: 'Step3Documents',
    seed: f =>
      store().setDocuments({
        ...store().documents,
        rc: { file: f, fields: null },
        insurance: { file: f, fields: null },
        pollution: { file: null, fields: { certificateNo: 'PUC123456', expiry: '2027-01-15' } },
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
