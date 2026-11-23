import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { toUserError } from '@/api/errorMessages';
import type { ProfileStepData } from '@/api/services/profileStep.service';
import OnboardingLayout from '@/components/OnboardingLayout';
import { useToast } from '@/components/Toast';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { savedAvatar, useProfileStepData, useSaveProfileStep } from '@/hooks/api/useProfileStep';
import OnboardingProfileScreen from '@/screens/onboarding/OnboardingProfileScreen';
import ServiceDetailsScreen from '@/screens/onboarding/ServiceDetailsScreen';
import VehicleDocumentsScreen from '@/screens/onboarding/VehicleDocumentsScreen';
import VehicleEntryScreen from '@/screens/onboarding/VehicleEntryScreen';
import VehicleFormScreen from '@/screens/onboarding/VehicleFormScreen';
import {
  hasRequiredVehicleDetails,
  type OnboardingValues,
  type ProfileFormValues,
} from '@/screens/onboarding/schemas';
import {
  selectOnboardingValues,
  selectResolvedDocuments,
  useOnboardingStore,
} from '@/store/onboarding.store';
import { useOnboardingSkip } from '@/hooks/useOnboardingSkip';
import { useAuthStore } from '@/store/auth.store';
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
  documents: Object.fromEntries(
    Object.entries(v.documents).map(([k, f]) => [k, f?.mimeType ?? null]),
  ),
  service: {
    lastServiceDate: !!v.service.lastServiceDate,
    centreType: v.service.centreType,
    centreName: !!v.service.centreName,
    serviceType: v.service.serviceType,
    odometer: !!v.service.odometer,
    amount: !!v.service.amount,
  },
});

/** The end of onboarding: logs what was collected (no PII). */
export function completeOnboarding(values: OnboardingValues) {
  logger.info('onboarding complete', summarizeAll(values));
}

/** Read once per mount: a re-entered step starts from the store, then mirrors its changes back. */
const useInitialSnapshot = () => useState(() => useOnboardingStore.getState())[0];

function Step1ProfileRoute(props: OnboardingStackScreenProps<'Step1Profile'>) {
  const uid = useAuthStore(s => s.user?.id);
  const saved = useProfileStepData(uid);
  // Wait for the saved profile / DL so the form starts prefilled (it reads initial values once).
  if (saved.isLoading) {
    return <OnboardingLoading step={1} title={strings.onboarding.profile.title} />;
  }
  return <Step1ProfileForm {...props} uid={uid} saved={saved.data} loadFailed={saved.isError} />;
}

/** Saved data → the form's starting values (only what exists; the store's re-entry values win). */
const prefillFrom = (saved: ProfileStepData | undefined): Partial<ProfileFormValues> => ({
  ...(saved?.fullName ? { fullName: saved.fullName } : {}),
  ...(saved?.avatarUrl ? { avatar: savedAvatar(saved) } : {}),
  ...(saved?.dl ? { dlNumber: saved.dl.dlNumber, dlImageUri: saved.dl.previewUrl } : {}),
});

function Step1ProfileForm({
  navigation,
  route,
  uid,
  saved,
  loadFailed,
}: OnboardingStackScreenProps<'Step1Profile'> & {
  uid: string | undefined;
  saved: ProfileStepData | undefined;
  loadFailed: boolean;
}) {
  const toast = useToast();
  const setProfile = useOnboardingStore(s => s.setProfile);
  const markSkipped = useOnboardingSkip();
  const snapshot = useInitialSnapshot();
  const save = useSaveProfileStep(uid ?? '', saved);
  useEffect(() => {
    if (loadFailed) {
      toast.error(strings.errors.generic);
    }
  }, [loadFailed, toast]);

  const next = (values: ProfileFormValues) => {
    setProfile(values);
    logger.info('onboarding step 1: next', summarizeProfile(values));
    if (!uid) {
      navigation.navigate('Step2Vehicle'); // dev QA screens: no signed-in user, nothing to save
      return;
    }
    if (save.isPending) {
      return;
    }
    save.mutate(values, {
      onSuccess: ({ photoUpdated }) => {
        const s = strings.onboarding.saved;
        toast.success(photoUpdated ? `${s.photo}. ${s.drivingLicence}` : s.drivingLicence);
        navigation.navigate('Step2Vehicle');
      },
      onError: error => toast.error(toUserError(error).userMessage),
    });
  };

  return (
    <OnboardingProfileScreen
      initialValues={{ ...prefillFrom(saved), ...snapshot.profile, ...route.params?.initialValues }}
      onBack={backIfPossible(navigation)}
      onValuesChange={setProfile}
      saving={save.isPending}
      onNext={next}
      onSkip={() => {
        logger.info('onboarding step 1: skip');
        markSkipped('dl');
        navigation.navigate('Step2Vehicle');
      }}
    />
  );
}

/** Placeholder while a step's saved data loads (header + spinner, no fields). */
function OnboardingLoading({ step, title }: { step: number; title: string }) {
  const { colors } = useTheme();
  return (
    <OnboardingLayout testID="onboarding-loading" step={step} totalSteps={ONBOARDING_TOTAL_STEPS} title={title}>
      <ActivityIndicator
        style={loadingStyles.spinner}
        color={colors.text.onLightMuted}
        accessibilityLabel={strings.onboarding.loadingA11y}
      />
    </OnboardingLayout>
  );
}

const loadingStyles = StyleSheet.create({ spinner: { marginTop: 48 } });

type AnyOnboardingNavigation = OnboardingStackScreenProps<
  keyof OnboardingStackParamList
>['navigation'];

/**
 * To the Dashboard with onboarding removed from history (Back can't return to it): resets the app
 * stack to the Dashboard alone, unmounting the onboarding stack.
 */
export const exitToDashboard = (navigation: AnyOnboardingNavigation) =>
  navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Dashboard' }] });

/** The back arrow only when there is a screen to return to (none when onboarding is the start route). */
const backIfPossible = (navigation: AnyOnboardingNavigation) =>
  navigation.canGoBack() ? () => navigation.goBack() : undefined;

/**
 * "Skip for now" on step 2 → the Dashboard. The vehicle step is cleared; step 1 (profile / DL) is kept;
 * the skip is remembered so the next launch opens the Dashboard.
 */
function useSkipToDashboard(navigation: AnyOnboardingNavigation) {
  const markSkipped = useOnboardingSkip();
  return () => {
    logger.info('onboarding step 2: skip to dashboard');
    markSkipped('vehicle');
    useOnboardingStore.getState().skipVehicleStep();
    exitToDashboard(navigation);
  };
}

function Step2VehicleRoute({ navigation }: OnboardingStackScreenProps<'Step2Vehicle'>) {
  const setVehicleEntry = useOnboardingStore(s => s.setVehicleEntry);
  const prefillVehicleFromEntry = useOnboardingStore(s => s.prefillVehicleFromEntry);
  const startManualVehicle = useOnboardingStore(s => s.startManualVehicle);
  const skipToDashboard = useSkipToDashboard(navigation);
  const { vehicle, vehicleMode } = useInitialSnapshot();
  // Back from step 3 / the form to a number that was looked up: show it as found, no new lookup.
  const restoredLookup =
    vehicleMode === 'lookup' && hasRequiredVehicleDetails(vehicle)
      ? {
          make: vehicle.make!,
          model: vehicle.model!,
          fuelType: vehicle.fuelType!,
          transmission: vehicle.transmission!,
          colour: vehicle.colour,
        }
      : null;
  return (
    <VehicleEntryScreen
      initialNumber={vehicle.vehicleNumber}
      initialRcFile={vehicle.rcFile}
      initialLookup={restoredLookup}
      onBack={backIfPossible(navigation)}
      onChange={setVehicleEntry}
      onNext={(entry, lookup) => {
        prefillVehicleFromEntry(entry, lookup);
        navigation.navigate('Step2VehicleForm');
      }}
      onManual={() => {
        startManualVehicle();
        navigation.navigate('Step2VehicleForm');
      }}
      onSkip={skipToDashboard}
    />
  );
}

function Step2VehicleFormRoute({
  navigation,
  route,
}: OnboardingStackScreenProps<'Step2VehicleForm'>) {
  const setVehicle = useOnboardingStore(s => s.setVehicle);
  const skipToDashboard = useSkipToDashboard(navigation);
  const snapshot = useInitialSnapshot();
  return (
    <VehicleFormScreen
      initialValues={snapshot.vehicle}
      qaOpenMakeSheet={__DEV__ && route.params?.qaOpenMakeSheet}
      onBack={() => navigation.goBack()}
      onValuesChange={setVehicle}
      onNext={values => {
        setVehicle(values);
        navigation.navigate('Step3Documents');
      }}
      onSkip={skipToDashboard}
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
    exitToDashboard(navigation);
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

export default function OnboardingStack() {
  const { colors } = useTheme();
  // Leaving onboarding (finished, step 3/4 skipped, Back from step 1) drops what was entered – except a step 2 skip,
  // which keeps step 1's data (see skipVehicleStep). Sign-out clears it in AppStack.
  useEffect(() => () => useOnboardingStore.getState().exitOnboarding(), []);
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
      <Stack.Screen name="Step2VehicleForm" component={Step2VehicleFormRoute} />
      <Stack.Screen name="Step3Documents" component={Step3DocumentsRoute} />
      <Stack.Screen name="Step4Service" component={Step4ServiceRoute} />
    </Stack.Navigator>
  );
}
