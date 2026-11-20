import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingCompleteScreen from '@/screens/onboarding/OnboardingCompleteScreen';
import OnboardingProfileScreen from '@/screens/onboarding/OnboardingProfileScreen';
import ServiceDetailsScreen from '@/screens/onboarding/ServiceDetailsScreen';
import VehicleDetailsScreen from '@/screens/onboarding/VehicleDetailsScreen';
import VehicleDocumentsScreen from '@/screens/onboarding/VehicleDocumentsScreen';
import type { OnboardingValues, ProfileFormValues } from '@/screens/onboarding/schemas';
import {
  selectOnboardingValues,
  selectResolvedDocuments,
  useOnboardingStore,
} from '@/store/onboarding.store';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';
import type { OnboardingStackParamList, OnboardingStackScreenProps } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/** Which fields were provided – never the values themselves (PII). */
const summarizeProfile = (v: ProfileFormValues) => ({
  avatar: v.avatar?.type ?? 'none',
  dlNumber: !!v.dlNumber,
  dlImage: !!v.dlImageUri,
  fullName: !!v.fullName,
  dob: !!v.dob,
  email: !!v.email,
});

const summarizeAll = (v: OnboardingValues) => ({
  profile: v.profile ? summarizeProfile(v.profile) : null,
  vehicle: {
    entryMode: v.vehicle.entryMode,
    number: !!v.vehicle.vehicleNumber,
    rc: v.vehicle.rcFile?.mimeType ?? null,
    make: v.vehicle.make,
    model: v.vehicle.model,
    fuelType: v.vehicle.fuelType,
    transmission: v.vehicle.transmission,
    colour: !!v.vehicle.colour,
  },
  documents: Object.fromEntries(Object.entries(v.documents).map(([k, f]) => [k, f?.mimeType ?? null])),
  service: {
    lastServiceDate: !!v.service.lastServiceDate,
    centreType: v.service.centreType,
    centreName: !!v.service.centreName,
    serviceType: v.service.serviceType,
    mileage: !!v.service.mileage,
    amount: !!v.service.amount,
  },
});

/**
 * The end of onboarding. UI only: logs what was collected (dev) and shows the placeholder screen.
 * Tomorrow: submit `values` to the API.
 */
export function completeOnboarding(values: OnboardingValues) {
  logger.info('onboarding complete', summarizeAll(values));
}

/** Read once per mount: a re-entered step starts from the store, then mirrors its changes back. */
const useInitialSnapshot = () => useState(() => useOnboardingStore.getState())[0];

function Step1ProfileRoute({ navigation, route }: OnboardingStackScreenProps<'Step1Profile'>) {
  const setProfile = useOnboardingStore(s => s.setProfile);
  const snapshot = useInitialSnapshot();
  return (
    <OnboardingProfileScreen
      initialValues={{ ...snapshot.profile, ...route.params?.initialValues }}
      onBack={() => navigation.goBack()}
      onValuesChange={setProfile}
      onNext={values => {
        setProfile(values);
        logger.info('onboarding step 1: next', summarizeProfile(values));
        navigation.navigate('Step2Vehicle');
      }}
      onSkip={() => {
        logger.info('onboarding step 1: skip');
        navigation.navigate('Step2Vehicle');
      }}
    />
  );
}

function Step2VehicleRoute({ navigation, route }: OnboardingStackScreenProps<'Step2Vehicle'>) {
  const setVehicle = useOnboardingStore(s => s.setVehicle);
  const setVehicleMode = useOnboardingStore(s => s.setVehicleMode);
  const snapshot = useInitialSnapshot();
  return (
    <VehicleDetailsScreen
      initialValues={snapshot.vehicle}
      initialMode={snapshot.vehicleMode}
      qaOpenMakeSheet={__DEV__ && route.params?.qaOpenMakeSheet}
      onBack={() => navigation.goBack()}
      onValuesChange={setVehicle}
      onModeChange={setVehicleMode}
      onNext={(values, mode) => {
        setVehicle(values);
        setVehicleMode(mode);
        navigation.navigate('Step3Documents');
      }}
      onSkip={() => navigation.navigate('Step3Documents')}
    />
  );
}

function Step3DocumentsRoute({ navigation }: OnboardingStackScreenProps<'Step3Documents'>) {
  const setDocument = useOnboardingStore(s => s.setDocument);
  const [initialValues] = useState(() => selectResolvedDocuments(useOnboardingStore.getState()));
  return (
    <VehicleDocumentsScreen
      initialValues={initialValues}
      onBack={() => navigation.goBack()}
      onDocumentChange={setDocument}
      onNext={() => navigation.navigate('Step4Service')}
      onSkip={() => navigation.navigate('Step4Service')}
    />
  );
}

function Step4ServiceRoute({ navigation }: OnboardingStackScreenProps<'Step4Service'>) {
  const setService = useOnboardingStore(s => s.setService);
  const snapshot = useInitialSnapshot();
  const finish = () => {
    completeOnboarding(selectOnboardingValues(useOnboardingStore.getState()));
    navigation.navigate('OnboardingComplete');
  };
  return (
    <ServiceDetailsScreen
      initialValues={snapshot.service}
      onBack={() => navigation.goBack()}
      onValuesChange={setService}
      onNext={values => {
        setService(values);
        finish();
      }}
      onSkip={finish}
    />
  );
}

function OnboardingCompleteRoute({ navigation }: OnboardingStackScreenProps<'OnboardingComplete'>) {
  return <OnboardingCompleteScreen onDone={() => navigation.navigate('Dashboard')} />;
}

export default function OnboardingStack() {
  const { colors } = useTheme();
  // Leaving onboarding (finished, Back from step 1, sign-out) drops what was entered.
  useEffect(() => () => useOnboardingStore.getState().reset(), []);
  return (
    <Stack.Navigator
      initialRouteName="Step1Profile"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background.onboardingBase },
      }}
    >
      <Stack.Screen name="Step1Profile" component={Step1ProfileRoute} />
      <Stack.Screen name="Step2Vehicle" component={Step2VehicleRoute} />
      <Stack.Screen name="Step3Documents" component={Step3DocumentsRoute} />
      <Stack.Screen name="Step4Service" component={Step4ServiceRoute} />
      <Stack.Screen
        name="OnboardingComplete"
        component={OnboardingCompleteRoute}
        options={{ gestureEnabled: false, animation: 'fade' }}
      />
    </Stack.Navigator>
  );
}
