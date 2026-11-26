import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import DocumentsUploadList from '@/components/DocumentsUploadList';
import VehicleSelectCard, { type VehicleOption } from '@/components/documents/VehicleSelectCard';
import LinkButton from '@/components/LinkButton';
import OnboardingLayout from '@/components/OnboardingLayout';
import PrimaryButton from '@/components/PrimaryButton';
import { ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS, type DocumentKey } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import {
  canProceedDocuments,
  withoutLocked,
  type DocumentEntry,
  type DocumentsFormValues,
  type SavedDocuments,
} from './schemas/documents.schema';

const t = strings.onboarding;
const d = t.documents;

export type VehicleDocumentsScreenProps = {
  values: DocumentsFormValues;
  onChange: (values: DocumentsFormValues) => void;
  vehicles: readonly VehicleOption[];
  vehiclesLoading?: boolean;
  /** "Add new vehicle" (opens the minimal vehicle form). */
  onAddVehicle: () => void;
  /** RC "Add Manually" / "Edit details" → "Your Vehicle details". */
  onRcManual: () => void;
  saving?: boolean;
  /** The selected vehicle's saved documents (API): read-only cards until they expire. */
  saved?: SavedDocuments;
  onNext: (values: DocumentsFormValues) => void;
  onSkip: () => void;
  onBack?: () => void;
};

/**
 * Onboarding 3/3 "Your Vehicle Documents" (design/dashboard/vehicle-documents-step.jpeg): the vehicle
 * selector, then RC, Insurance, Pollution (PUC) and FASTag (last; not in this design). Each document is
 * optional: a file, typed details or both. Next (grey until one document is added) saves them.
 * The design's "3/4" is a design inconsistency: the flow has 3 steps.
 */
export default function VehicleDocumentsScreen({
  values,
  onChange,
  vehicles,
  vehiclesLoading,
  onAddVehicle,
  onRcManual,
  saving = false,
  saved,
  onNext,
  onSkip,
  onBack,
}: VehicleDocumentsScreenProps) {
  const setEntry = useCallback(
    (key: DocumentKey, entry: DocumentEntry) => onChange({ ...values, [key]: entry }),
    [onChange, values],
  );
  const selected = vehicles.find(v => v.id === values.vehicleId);
  // Locked cards show the saved document: their local entries are neither counted nor saved.
  const toSave = withoutLocked(values, saved);
  const canProceed = canProceedDocuments(toSave);

  return (
    <OnboardingLayout
      testID="onboarding-documents"
      step={ONBOARDING_STEP.documents}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={d.title}
      subtitle={d.subtitle}
      onBack={onBack}
      contentPaddingH={10}
      footerGap={40}
      footer={
        <>
          <PrimaryButton
            testID="documents-next"
            label={t.next}
            labelVariant="buttonStrong"
            loading={saving}
            disabled={!canProceed || saving}
            onPress={() => onNext(toSave)}
            style={styles.footerItem}
          />
          <LinkButton testID="documents-skip" label={t.skip} onPress={onSkip} disabled={saving} style={styles.skip} />
        </>
      }
    >
      <DocumentsUploadList
        values={values}
        onChange={setEntry}
        vehicleNumber={selected?.vehicleNumber}
        onManual={{ rc: onRcManual }}
        saved={saved}
        header={
          <VehicleSelectCard
            vehicles={vehicles}
            selectedId={values.vehicleId}
            loading={vehiclesLoading}
            onSelect={id => onChange({ ...values, vehicleId: id })}
            onAddVehicle={onAddVehicle}
          />
        }
      />
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  // The cards use 10pt side padding; Next keeps the 24pt margins of the other steps.
  footerItem: { marginHorizontal: 14 },
  skip: { marginTop: 16 },
});
