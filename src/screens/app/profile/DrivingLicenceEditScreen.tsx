import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Driver from '@/assets/icons/dashboard/driver.svg';
import { toUserError } from '@/api/errorMessages';
import { ocrService } from '@/api/services/ocr.service';
import SavedDocumentCard from '@/components/documents/SavedDocumentCard';
import LightScreen from '@/components/LightScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { useToast } from '@/components/Toast';
import { strings } from '@/constants/strings';
import {
  savedLicenceDocument,
  useDrivingLicenceStepData,
  useSaveDrivingLicenceStep,
} from '@/hooks/api/useDrivingLicenceStep';
import type { HomeStackScreenProps } from '@/navigation/types';
import { DrivingLicenceFields, isLicenceLocked } from '@/screens/onboarding/DrivingLicenceScreen';
import { showDlOr } from '@/screens/onboarding/schemas/drivingLicence.schema';
import { useDrivingLicenceForm } from '@/screens/onboarding/useDrivingLicenceForm';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme';

const t = strings.myProfile;

/**
 * My Profile → Driving Licence: the saved licence (read-only until it expires) and, when there is none
 * or it has expired, the same form as onboarding 2/3 (number, file, dates) and the same save.
 */
export default function DrivingLicenceEditScreen({ navigation }: HomeStackScreenProps<'DrivingLicence'>) {
  const uid = useAuthStore(s => s.user?.id);
  const saved = useDrivingLicenceStepData(uid);
  const { colors } = useTheme();
  if (saved.isLoading) {
    return (
      <LightScreen testID="dl-edit" title={t.drivingLicence} onBack={() => navigation.goBack()} aboveTabs>
        <ActivityIndicator style={styles.loading} color={colors.input.lightSpinner} />
      </LightScreen>
    );
  }
  return <DrivingLicenceEditForm uid={uid} saved={saved.data} onDone={() => navigation.goBack()} />;
}

function DrivingLicenceEditForm({
  uid,
  saved,
  onDone,
}: {
  uid: string | undefined;
  saved: ReturnType<typeof useDrivingLicenceStepData>['data'];
  onDone: () => void;
}) {
  const toast = useToast();
  const doc = savedLicenceDocument(saved);
  const locked = isLicenceLocked(doc);
  // A new licence replaces the expired one: the form starts empty.
  const save = useSaveDrivingLicenceStep(uid ?? '', undefined);
  const dl = useDrivingLicenceForm({
    onSkip: onDone,
    onNext: values =>
      save.mutate(values, {
        onSuccess: () => {
          toast.success(strings.onboarding.saved.drivingLicence);
          onDone();
        },
        onError: error => toast.error(toUserError(error).userMessage),
      }),
  });

  return (
    <LightScreen
      testID="dl-edit"
      title={t.drivingLicence}
      onBack={onDone}
      aboveTabs
      footer={
        !locked && (
          <PrimaryButton
            testID="dl-edit-save"
            label={t.saveLicence}
            labelVariant="buttonStrong"
            showArrow={false}
            loading={save.isPending}
            disabled={save.isPending}
            onPress={dl.submit}
          />
        )
      }
    >
      {doc && <SavedDocumentCard testID="dl-saved" doc={doc} title={t.drivingLicence} icon={Driver} />}
      {!locked && <DrivingLicenceFields dl={dl} showOr={showDlOr(ocrService.isAvailable('dl'))} first={!doc} />}
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  loading: { marginVertical: 24 },
});
