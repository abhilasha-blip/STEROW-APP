import React from 'react';
import { StyleSheet } from 'react-native';
import CheckCircle from '@/assets/icons/check-circle.svg';
import BufferedTextField from '@/components/BufferedTextField';
import FileUploadCard from '@/components/FileUploadCard';
import LinkButton from '@/components/LinkButton';
import OnboardingLayout, { FIRST_LABEL_OFFSET, useRevealOnFocus } from '@/components/OnboardingLayout';
import OrDivider from '@/components/OrDivider';
import OutlineButton from '@/components/OutlineButton';
import PrimaryButton from '@/components/PrimaryButton';
import { useToast } from '@/components/Toast';
import { ONBOARDING_TOTAL_STEPS, VEHICLE_NUMBER_MAX_LENGTH } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { useTheme } from '@/theme';
import { normalizeVehicleNumber } from '@/utils/validation';
import { useVehicleEntry, type UseVehicleEntryOptions } from './useVehicleEntry';

const t = strings.onboarding;
const v = t.vehicle;

export type VehicleEntryScreenProps = UseVehicleEntryOptions & {
  /** "Add your vehicle details manually" → the empty form. */
  onManual: () => void;
  /** "Skip for now" → the Dashboard. */
  onSkip: () => void;
  onBack?: () => void;
};

/**
 * Onboarding step 2 entry (UI only; the lookup is mocked): Vehicle Number, "Or", Upload RC (optional),
 * and "Add your vehicle details manually". Next opens the vehicle form prefilled once the lookup found
 * the number or an RC is attached.
 */
export default function VehicleEntryScreen({ onManual, onSkip, onBack, ...options }: VehicleEntryScreenProps) {
  const toast = useToast();
  const entry = useVehicleEntry({ onLookupNotFound: () => toast.error(v.notFound), ...options });

  return (
    <OnboardingLayout
      testID="onboarding-vehicle"
      step={2}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={v.title}
      subtitle={v.subtitle}
      onBack={onBack}
      footer={
        <>
          <PrimaryButton
            testID="vehicle-next"
            label={t.next}
            labelVariant="buttonStrong"
            disabled={!entry.canProceed}
            onPress={entry.next}
          />
          <LinkButton testID="vehicle-skip" label={t.skip} onPress={onSkip} style={styles.skip} />
        </>
      }
    >
      <VehicleNumberField entry={entry} />
      <OrDivider style={styles.or} />
      <FileUploadCard
        testID="vehicle-rc"
        style={styles.upload}
        label={v.rcLabel}
        title={v.rcTitle}
        value={entry.rcFile}
        onChange={entry.setRcFile}
      />
      <OutlineButton testID="vehicle-manual" label={v.addManually} onPress={onManual} style={styles.manual} />
    </OnboardingLayout>
  );
}

/** Rendered inside the layout so it can use the keyboard "reveal" context. */
function VehicleNumberField({ entry }: { entry: ReturnType<typeof useVehicleEntry> }) {
  const reveal = useRevealOnFocus();
  const { colors } = useTheme();
  const { status } = entry;
  return (
    <BufferedTextField
      testID="vehicle-number"
      variant="light"
      style={styles.first}
      label={v.numberLabel}
      placeholder={v.numberPlaceholder}
      initialValue={entry.initialNumber}
      format={normalizeVehicleNumber}
      onValueChange={entry.onNumberChange}
      onBlur={entry.validateNumberOnBlur}
      onFocus={reveal}
      loading={status === 'loading'}
      accessibilityHint={status === 'loading' ? v.numberLookupA11y : status === 'found' ? v.numberFoundA11y : undefined}
      rightAccessory={
        status === 'found' ? (
          <CheckCircle
            testID="vehicle-number-found"
            width={16}
            height={16}
            color={colors.chip.selectedIcon}
            style={styles.found}
          />
        ) : null
      }
      autoCapitalize="characters"
      autoCorrect={false}
      autoComplete="off"
      spellCheck={false}
      maxLength={VEHICLE_NUMBER_MAX_LENGTH}
      returnKeyType="done"
      error={entry.numberError}
    />
  );
}

/* Vertical rhythm: as measured on step2-*.svg (number → "Or" → RC card). */
const styles = StyleSheet.create({
  first: { marginTop: FIRST_LABEL_OFFSET },
  or: { marginTop: 18.5 },
  upload: { marginTop: 23.8 },
  // No Figma frame for the outlined button: the 24pt gap used between blocks on the sheet.
  manual: { marginTop: 24 },
  found: { marginLeft: 8, marginRight: 6 },
  skip: { marginTop: 16 },
});
