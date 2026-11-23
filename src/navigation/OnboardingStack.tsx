import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { toUserError } from '@/api/errorMessages';
import type { DrivingLicenceStepData } from '@/api/services/drivingLicenceStep.service';
import { ocrService } from '@/api/services/ocr.service';
import type { ProfileStepData } from '@/api/services/profileStep.service';
import OnboardingLayout from '@/components/OnboardingLayout';
import { useToast } from '@/components/Toast';
import { DOCUMENT_KEYS, ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import {
  drivingLicencePrefill,
  useDrivingLicenceStepData,
  useSaveDrivingLicenceStep,
} from '@/hooks/api/useDrivingLicenceStep';
import { useMyVehicles, useSaveDocumentsStep } from '@/hooks/api/useDocumentsStep';
import { savedAvatar, useProfileStepData, useSaveProfileStep } from '@/hooks/api/useProfileStep';
import { useOnboardingSkip } from '@/hooks/useOnboardingSkip';
import DrivingLicenceScreen from '@/screens/onboarding/DrivingLicenceScreen';
import OnboardingProfileScreen from '@/screens/onboarding/OnboardingProfileScreen';
import VehicleDocumentsScreen from '@/screens/onboarding/VehicleDocumentsScreen';
import AddVehicleScreen from '@/screens/vehicles/AddVehicleScreen';
import type {
  DocumentsFormValues,
  DrivingLicenceFormValues,
  OnboardingValues,
  ProfileFormValues,
} from '@/screens/onboarding/schemas';
import { useAuthStore } from '@/store/auth.store';
import { selectOnboardingValues, useOnboardingStore } from '@/store/onboarding.store';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';
import type { OnboardingStackParamList, OnboardingStackScreenProps } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/** Which fields were provided – never the values themselves (PII). */
const summarizeProfile = (v: ProfileFormValues) => ({
  avatar: v.avatar?.type ?? 'none',
  fullName: !!v.fullName,
  email: !!v.email,
});
const summarizeDl = (v: DrivingLicenceFormValues) => ({
  dlNumber: !!v.dlNumber,
  dlImage: !!v.dlImageUri,
  issuedOn: !!v.issuedOn,
  validUpto: !!v.validUpto,
});
const summarizeAll = (v: OnboardingValues) => ({
  profile: v.profile ? summarizeProfile(v.profile) : null,
  drivingLicence: v.drivingLicence ? summarizeDl(v.drivingLicence) : null,
  vehicle: !!v.documents.vehicleId,
  documents: Object.fromEntries(
    DOCUMENT_KEYS.map(k => [k, { file: v.documents[k].file?.mimeType ?? null, details: !!v.documents[k].fields }]),
  ),
});

/** Read once per mount: a re-entered step starts from the store, then mirrors its changes back. */
const useInitialSnapshot = () => useState(() => useOnboardingStore.getState())[0];

type AnyOnboardingNavigation = OnboardingStackScreenProps<keyof OnboardingStackParamList>['navigation'];

/**
 * To the Dashboard with onboarding removed from history (Back can't return to it): resets the app
 * stack to the Dashboard alone, unmounting the onboarding stack.
 */
export const exitToDashboard = (navigation: AnyOnboardingNavigation) =>
  navigation.getParent()?.reset({ index: 0, routes: [{ name: 'Dashboard' }] });

/** The back arrow only when there is a screen to return to (none when the step is the start route). */
const backIfPossible = (navigation: AnyOnboardingNavigation) =>
  navigation.canGoBack() ? () => navigation.goBack() : undefined;

/** Placeholder while a step's saved data loads (header + spinner, no fields). */
function OnboardingLoading({ step, title }: { step: number; title: string }) {
  const { colors } = useTheme();
  return (
    <OnboardingLayout testID="onboarding-loading" step={step} totalSteps={ONBOARDING_TOTAL_STEPS} title={title}>
      <ActivityIndicator
        style={styles.spinner}
        color={colors.text.onLightMuted}
        accessibilityLabel={strings.onboarding.loadingA11y}
      />
    </OnboardingLayout>
  );
}

/** A failed load still shows the step (empty), with one toast. */
function useLoadFailedToast(failed: boolean) {
  const toast = useToast();
  useEffect(() => {
    if (failed) {
      toast.error(strings.errors.generic);
    }
  }, [failed, toast]);
}

/* ---------------------------------- 1/3 My Profile ---------------------------------- */

function Step1ProfileRoute(props: OnboardingStackScreenProps<'Step1Profile'>) {
  const uid = useAuthStore(s => s.user?.id);
  const saved = useProfileStepData(uid);
  // Wait for the saved profile so the form starts prefilled (it reads initial values once).
  if (saved.isLoading) {
    return <OnboardingLoading step={ONBOARDING_STEP.profile} title={strings.onboarding.profile.title} />;
  }
  return <Step1ProfileForm {...props} uid={uid} saved={saved.data} loadFailed={saved.isError} />;
}

const profilePrefill = (saved: ProfileStepData | undefined): Partial<ProfileFormValues> => ({
  ...(saved?.fullName ? { fullName: saved.fullName } : {}),
  ...(saved?.email ? { email: saved.email } : {}),
  ...(saved?.avatarUrl ? { avatar: savedAvatar(saved) } : {}),
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
  const markDone = useOnboardingSkip();
  const snapshot = useInitialSnapshot();
  const save = useSaveProfileStep(uid ?? '', saved);
  useLoadFailedToast(loadFailed);

  const toNext = () => {
    markDone('profile');
    navigation.navigate('Step2DrivingLicence');
  };

  const next = (values: ProfileFormValues) => {
    setProfile(values);
    logger.info('onboarding 1/3: next', summarizeProfile(values));
    if (!uid) {
      navigation.navigate('Step2DrivingLicence'); // dev QA screens: no signed-in user, nothing to save
      return;
    }
    if (save.isPending) {
      return;
    }
    save.mutate(values, {
      onSuccess: ({ photoUpdated, profileUpdated }) => {
        const s = strings.onboarding.saved;
        if (profileUpdated) {
          toast.success(photoUpdated ? s.photo : s.profile);
        }
        toNext();
      },
      onError: error => toast.error(toUserError(error).userMessage),
    });
  };

  return (
    <OnboardingProfileScreen
      initialValues={{ ...profilePrefill(saved), ...snapshot.profile, ...route.params?.initialValues }}
      onBack={backIfPossible(navigation)}
      onValuesChange={setProfile}
      saving={save.isPending}
      onNext={next}
      onSkip={() => {
        logger.info('onboarding 1/3: skip');
        toNext();
      }}
    />
  );
}

/* -------------------------------- 2/3 Driving Licence -------------------------------- */

function Step2DrivingLicenceRoute(props: OnboardingStackScreenProps<'Step2DrivingLicence'>) {
  const uid = useAuthStore(s => s.user?.id);
  const saved = useDrivingLicenceStepData(uid);
  if (saved.isLoading) {
    return (
      <OnboardingLoading step={ONBOARDING_STEP.drivingLicence} title={strings.onboarding.drivingLicence.title} />
    );
  }
  return <Step2DrivingLicenceForm {...props} uid={uid} saved={saved.data} loadFailed={saved.isError} />;
}

function Step2DrivingLicenceForm({
  navigation,
  uid,
  saved,
  loadFailed,
}: OnboardingStackScreenProps<'Step2DrivingLicence'> & {
  uid: string | undefined;
  saved: DrivingLicenceStepData | undefined;
  loadFailed: boolean;
}) {
  const toast = useToast();
  const setDrivingLicence = useOnboardingStore(s => s.setDrivingLicence);
  const markSkipped = useOnboardingSkip();
  const snapshot = useInitialSnapshot();
  const save = useSaveDrivingLicenceStep(uid ?? '', saved);
  useLoadFailedToast(loadFailed);

  const next = (values: DrivingLicenceFormValues) => {
    setDrivingLicence(values);
    logger.info('onboarding 2/3: next', summarizeDl(values));
    if (!uid) {
      navigation.navigate('Step3Documents');
      return;
    }
    if (save.isPending) {
      return;
    }
    save.mutate(values, {
      onSuccess: () => {
        toast.success(strings.onboarding.saved.drivingLicence);
        navigation.navigate('Step3Documents');
      },
      onError: error => toast.error(toUserError(error).userMessage),
    });
  };

  return (
    <DrivingLicenceScreen
      initialValues={{ ...drivingLicencePrefill(saved), ...snapshot.drivingLicence }}
      onBack={backIfPossible(navigation)}
      onValuesChange={setDrivingLicence}
      saving={save.isPending}
      ocrAvailable={ocrService.isAvailable('dl')}
      onNext={next}
      onSkip={() => {
        logger.info('onboarding 2/3: skip');
        markSkipped('dl');
        navigation.navigate('Step3Documents');
      }}
    />
  );
}

/* ----------------------------------- 3/3 Documents ----------------------------------- */

function Step3DocumentsRoute({ navigation, route }: OnboardingStackScreenProps<'Step3Documents'>) {
  const toast = useToast();
  const uid = useAuthStore(st => st.user?.id);
  const setDocuments = useOnboardingStore(st => st.setDocuments);
  const markSkipped = useOnboardingSkip();
  const [values, setValues] = useState<DocumentsFormValues>(() => useOnboardingStore.getState().documents);
  const vehicles = useMyVehicles(uid);
  const save = useSaveDocumentsStep(uid ?? '');

  const update = useCallback(
    (next: DocumentsFormValues) => {
      setValues(next);
      setDocuments(next);
    },
    [setDocuments],
  );

  // Preselect: the vehicle just added (back from "Add new vehicle"), else the first one.
  const addedId = route.params?.vehicleId;
  const firstId = vehicles.data?.[0]?.id;
  useEffect(() => {
    const next = addedId ?? (values.vehicleId ? undefined : firstId);
    if (next && next !== values.vehicleId) {
      update({ ...values, vehicleId: next });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the list / the added id changes
  }, [addedId, firstId]);

  const options = useMemo(
    () =>
      (vehicles.data ?? []).map(v => ({
        id: v.id,
        vehicleNumber: v.vehicleNumber,
        name: [v.makeName, v.modelName].filter(Boolean).join(' '),
      })),
    [vehicles.data],
  );

  const next = (current: DocumentsFormValues) => {
    const vehicle = vehicles.data?.find(v => v.id === current.vehicleId);
    const summary = summarizeAll(selectOnboardingValues(useOnboardingStore.getState()));
    if (!uid || !vehicle) {
      logger.info('onboarding complete (no signed-in user: nothing saved)', summary);
      exitToDashboard(navigation); // dev QA screens
      return;
    }
    if (save.isPending) {
      return;
    }
    save.mutate(
      { values: current, vehicle },
      {
        onSuccess: () => {
          logger.info('onboarding complete', summary);
          toast.success(strings.onboarding.documents.saved);
          exitToDashboard(navigation);
        },
        onError: error => toast.error(toUserError(error).userMessage),
      },
    );
  };

  return (
    <VehicleDocumentsScreen
      values={values}
      onChange={update}
      vehicles={options}
      vehiclesLoading={vehicles.isLoading}
      onAddVehicle={() => navigation.navigate('Step3AddVehicle')}
      saving={save.isPending}
      onBack={backIfPossible(navigation)}
      onNext={next}
      onSkip={() => {
        logger.info('onboarding 3/3: skip');
        markSkipped('documents');
        exitToDashboard(navigation);
      }}
    />
  );
}

function Step3AddVehicleRoute({ navigation }: OnboardingStackScreenProps<'Step3AddVehicle'>) {
  return (
    <AddVehicleScreen
      onBack={() => navigation.goBack()}
      onSaved={vehicleId => navigation.popTo('Step3Documents', { vehicleId })}
    />
  );
}

export default function OnboardingStack() {
  const { colors } = useTheme();
  // Leaving onboarding (finished, skipped to the Dashboard) drops what was entered; 1/3 and 2/3 are saved.
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
      <Stack.Screen name="Step2DrivingLicence" component={Step2DrivingLicenceRoute} />
      <Stack.Screen name="Step3Documents" component={Step3DocumentsRoute} />
      <Stack.Screen name="Step3AddVehicle" component={Step3AddVehicleRoute} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({ spinner: { marginTop: 48 } });
