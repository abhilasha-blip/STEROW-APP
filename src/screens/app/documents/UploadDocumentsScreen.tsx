import React, { useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { toUserError } from '@/api/errorMessages';
import { vehicleDetailsOf } from '@/api/services/vehicle.service';
import DocumentsUploadList from '@/components/DocumentsUploadList';
import LightScreen from '@/components/LightScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { useToast } from '@/components/Toast';
import type { DocumentKey } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { useMyVehicles, useSaveDocumentsStep } from '@/hooks/api/useDocumentsStep';
import { useSavedVehicleDocuments } from '@/hooks/api/useMyDocuments';
import type { HomeStackScreenProps } from '@/navigation/types';
import RcDetailsScreen from '@/screens/onboarding/RcDetailsScreen';
import {
  canProceedDocuments,
  EMPTY_DOCUMENTS,
  withoutLocked,
  type DocumentEntry,
  type DocumentsFormValues,
} from '@/screens/onboarding/schemas/documents.schema';
import { useAuthStore } from '@/store/auth.store';

const t = strings.myDocuments;

/**
 * My Documents → "Upload documents": the reusable document cards for one vehicle; Save adds them.
 * RC "Add Manually" opens the full RC form ("Your Vehicle details", as on 3/3) over the cards.
 */
export default function UploadDocumentsScreen({ navigation, route }: HomeStackScreenProps<'UploadDocuments'>) {
  const toast = useToast();
  const uid = useAuthStore(s => s.user?.id);
  const vehicles = useMyVehicles(uid);
  const vehicle = vehicles.data?.find(v => v.id === route.params.vehicleId);
  const save = useSaveDocumentsStep(uid ?? '');
  const [values, setValues] = useState<DocumentsFormValues>({ ...EMPTY_DOCUMENTS, vehicleId: route.params.vehicleId });
  const { saved } = useSavedVehicleDocuments(uid, route.params.vehicleId);
  // Read-only (locked) cards are never saved.
  const toSave = withoutLocked(values, saved);
  const canSave = !!vehicle && canProceedDocuments(toSave) && !save.isPending;
  const [rcOpen, setRcOpen] = useState(false);

  // Android back closes the RC form first.
  useEffect(() => {
    if (!rcOpen) {
      return;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setRcOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [rcOpen]);

  if (rcOpen && vehicle) {
    const rcFields = values.rc.fields;
    return (
      <RcDetailsScreen
        layout="light"
        initialValues={rcFields?.vehicle ?? vehicleDetailsOf(vehicle)}
        initialRegistrationNumber={rcFields?.registrationNumber}
        initialRc={rcFields?.rc}
        onBack={() => setRcOpen(false)}
        onSave={({ vehicle: details, registrationNumber, rc }) => {
          // Changed vehicle details are saved with the documents (Save), as on 3/3.
          setValues(v => ({ ...v, rc: { file: v.rc.file, fields: { registrationNumber, vehicle: details, rc } } }));
          setRcOpen(false);
        }}
      />
    );
  }

  return (
    <LightScreen
      testID="upload-documents"
      title={t.uploadTitle}
      onBack={() => navigation.goBack()}
      aboveTabs
      footer={
        <PrimaryButton
          testID="upload-documents-save"
          label={t.save}
          labelVariant="buttonStrong"
          showArrow={false}
          loading={save.isPending}
          disabled={!canSave}
          onPress={() =>
            vehicle &&
            save.mutate(
              { values: toSave, vehicle },
              {
                onSuccess: () => {
                  toast.success(strings.onboarding.documents.saved);
                  navigation.goBack();
                },
                onError: e => toast.error(toUserError(e).userMessage),
              },
            )
          }
        />
      }
    >
      <DocumentsUploadList
        values={values}
        vehicleNumber={vehicle?.vehicleNumber}
        saved={saved}
        onManual={vehicle ? { rc: () => setRcOpen(true) } : undefined}
        onChange={(key: DocumentKey, entry: DocumentEntry) => setValues(v => ({ ...v, [key]: entry }))}
      />
    </LightScreen>
  );
}
