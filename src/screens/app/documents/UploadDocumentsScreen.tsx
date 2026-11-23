import React, { useState } from 'react';
import { toUserError } from '@/api/errorMessages';
import DocumentsUploadList from '@/components/DocumentsUploadList';
import LightScreen from '@/components/LightScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { useToast } from '@/components/Toast';
import type { DocumentKey } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { useMyVehicles, useSaveDocumentsStep } from '@/hooks/api/useDocumentsStep';
import type { HomeStackScreenProps } from '@/navigation/types';
import {
  canProceedDocuments,
  EMPTY_DOCUMENTS,
  type DocumentEntry,
  type DocumentsFormValues,
} from '@/screens/onboarding/schemas/documents.schema';
import { useAuthStore } from '@/store/auth.store';

const t = strings.myDocuments;

/** My Documents → "Upload documents": the reusable document cards for one vehicle; Save adds them. */
export default function UploadDocumentsScreen({ navigation, route }: HomeStackScreenProps<'UploadDocuments'>) {
  const toast = useToast();
  const uid = useAuthStore(s => s.user?.id);
  const vehicles = useMyVehicles(uid);
  const vehicle = vehicles.data?.find(v => v.id === route.params.vehicleId);
  const save = useSaveDocumentsStep(uid ?? '');
  const [values, setValues] = useState<DocumentsFormValues>({ ...EMPTY_DOCUMENTS, vehicleId: route.params.vehicleId });
  const canSave = !!vehicle && canProceedDocuments(values) && !save.isPending;

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
              { values, vehicle },
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
        onChange={(key: DocumentKey, entry: DocumentEntry) => setValues(v => ({ ...v, [key]: entry }))}
      />
    </LightScreen>
  );
}
