import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller } from 'react-hook-form';
import Driver from '@/assets/icons/dashboard/driver.svg';
import type { MyDocument } from '@/api/services/myDocuments.service';
import AppText from '@/components/AppText';
import SavedDocumentCard from '@/components/documents/SavedDocumentCard';
import DateField from '@/components/DateField';
import LinkButton from '@/components/LinkButton';
import OnboardingLayout, { FIRST_LABEL_OFFSET, useRevealOnFocus } from '@/components/OnboardingLayout';
import OrDivider from '@/components/OrDivider';
import PhotoSourceSheet from '@/components/PhotoSourceSheet';
import PrimaryButton from '@/components/PrimaryButton';
import TextField from '@/components/TextField';
import UploadBox from '@/components/UploadBox';
import { DL_MAX_LENGTH, ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { getDocumentStatus } from '@/utils/documentStatus';
import { normalizeDlNumber } from '@/utils/validation';
import { showDlOr, type DrivingLicenceFormValues } from './schemas/drivingLicence.schema';
import { useDrivingLicenceForm, type DrivingLicenceForm } from './useDrivingLicenceForm';

const t = strings.onboarding;
const d = t.drivingLicence;

export type DrivingLicenceScreenProps = {
  initialValues?: Partial<DrivingLicenceFormValues>;
  onNext: (values: DrivingLicenceFormValues) => void;
  onSkip: () => void;
  onBack?: () => void;
  onValuesChange?: (values: DrivingLicenceFormValues) => void;
  /** Injectable clock (tests). */
  today?: () => Date;
  /** Next is saving: spinner on Next, Next and Skip disabled (no double submit). */
  saving?: boolean;
  /** OCR reads the number from the upload → show "Or" (phase 1: false, ocrService is unavailable). */
  ocrAvailable?: boolean;
  /**
   * The licence saved for this user (API). Until it expires the step shows it read-only (details,
   * status, View) and Next just continues; once expired the form is back for the new one.
   */
  savedLicence?: MyDocument | null;
  /** Next on a read-only (locked) licence: nothing to save. */
  onContinue?: () => void;
};

/** The saved licence blocks a new upload until it expires. */
export const isLicenceLocked = (saved: MyDocument | null | undefined) =>
  !!saved && getDocumentStatus(saved.expiry) !== 'expired';

/**
 * Onboarding 2/3 "Driving Licence": DL Number, the licence photo (both required), Issued on and
 * Valid up to (optional, as on the web).
 */
export default function DrivingLicenceScreen({
  initialValues,
  onNext,
  onSkip,
  onBack,
  onValuesChange,
  today,
  saving = false,
  ocrAvailable = false,
  savedLicence,
  onContinue,
}: DrivingLicenceScreenProps) {
  const dl = useDrivingLicenceForm({ initialValues, onNext, onSkip, onValuesChange, today });
  const locked = isLicenceLocked(savedLicence);

  return (
    <OnboardingLayout
      testID="onboarding-dl"
      step={ONBOARDING_STEP.drivingLicence}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={d.title}
      subtitle={d.subtitle}
      onBack={onBack}
      footer={
        <>
          <PrimaryButton
            testID="dl-next"
            label={t.next}
            labelVariant="buttonStrong"
            loading={saving}
            disabled={saving}
            onPress={locked ? onContinue ?? onSkip : dl.submit}
          />
          <LinkButton testID="dl-skip" label={t.skip} onPress={dl.skip} disabled={saving} style={styles.skip} />
        </>
      }
    >
      {savedLicence && (
        <SavedDocumentCard
          testID="dl-saved"
          doc={savedLicence}
          title={d.savedTitle}
          icon={Driver}
          style={styles.first}
        />
      )}
      {!locked && <DrivingLicenceFields dl={dl} showOr={showDlOr(ocrAvailable)} first={!savedLicence} />}
    </OnboardingLayout>
  );
}

export function DrivingLicenceFields({ dl, showOr, first = true }: { dl: DrivingLicenceForm; showOr: boolean; first?: boolean }) {
  const reveal = useRevealOnFocus();
  const [sourceSheet, setSourceSheet] = useState(false);
  const { control, errors } = dl;

  return (
    <>
      <Controller
        control={control}
        name="dlNumber"
        render={({ field }) => (
          <TextField
            ref={field.ref}
            testID="dl-number"
            variant="light"
            style={first ? styles.first : styles.field}
            label={d.dlNumberLabel}
            placeholder={d.dlNumberPlaceholder}
            value={field.value}
            onChangeText={v => field.onChange(normalizeDlNumber(v))}
            onBlur={field.onBlur}
            onFocus={reveal}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            maxLength={DL_MAX_LENGTH}
            returnKeyType="done"
            error={errors.dlNumber?.message}
          />
        )}
      />

      {showOr && <OrDivider style={styles.or} />}
      <Controller
        control={control}
        name="dlImageUri"
        render={({ field }) => (
          <View style={showOr ? styles.uploadAfterOr : styles.field}>
            <AppText variant="fieldLabel" color="text.onLight" style={styles.uploadLabel}>
              {d.uploadLabel}
            </AppText>
            <UploadBox
              testID="dl-upload"
              uri={field.value}
              onPress={() => setSourceSheet(true)}
              onRemove={dl.removeDlImage}
              error={errors.dlImageUri?.message}
            />
          </View>
        )}
      />

      <Controller
        control={control}
        name="issuedOn"
        render={({ field }) => (
          <DateField
            testID="dl-issued-on"
            style={styles.field}
            label={d.issuedOnLabel}
            placeholder={d.datePlaceholder}
            pickerA11yHint={d.issuedOnPickerA11y}
            value={field.value}
            onChange={field.onChange}
            onClose={dl.validateDatesOnClose}
            maximumDate={dl.maxIssuedOn}
            error={errors.issuedOn?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="validUpto"
        render={({ field }) => (
          <DateField
            testID="dl-valid-upto"
            style={styles.field}
            label={d.validUptoLabel}
            placeholder={d.datePlaceholder}
            pickerA11yHint={d.validUptoPickerA11y}
            value={field.value}
            onChange={field.onChange}
            onClose={dl.validateDatesOnClose}
            error={errors.validUpto?.message}
          />
        )}
      />

      <PhotoSourceSheet
        testID="dl-photo-source"
        visible={sourceSheet}
        onClose={() => setSourceSheet(false)}
        onPicked={photo => dl.setDlImage(photo.uri)}
      />
    </>
  );
}

/* Same rhythm as the other onboarding steps (25.3pt field → next label line box). */
const styles = StyleSheet.create({
  first: { marginTop: FIRST_LABEL_OFFSET },
  field: { marginTop: 25.3 },
  or: { marginTop: 18.5 },
  uploadAfterOr: { marginTop: 23.8 },
  uploadLabel: { marginBottom: 8 },
  skip: { marginTop: 16 },
});
