import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Controller } from 'react-hook-form';
import AppText from '@/components/AppText';
import ChipGroup from '@/components/ChipGroup';
import FileUploadCard from '@/components/FileUploadCard';
import LinkButton from '@/components/LinkButton';
import OnboardingLayout, { FIRST_LABEL_OFFSET, useRevealOnFocus } from '@/components/OnboardingLayout';
import OrDivider from '@/components/OrDivider';
import PrimaryButton from '@/components/PrimaryButton';
import SelectField from '@/components/SelectField';
import TextField from '@/components/TextField';
import { useToast } from '@/components/Toast';
import {
  FUEL_TYPES,
  ONBOARDING_TOTAL_STEPS,
  TRANSMISSIONS,
  VEHICLE_COLOUR_MAX_LENGTH,
  VEHICLE_NUMBER_MAX_LENGTH,
} from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { MOCK_VEHICLE_MAKES, mockModelsFor } from '@/constants/vehicleMock';
import {
  useVehicleDetailsForm,
  type UseVehicleDetailsFormOptions,
  type VehicleDetailsForm,
} from './useVehicleDetailsForm';

const t = strings.onboarding;
const v = t.vehicle;

const FUEL_OPTIONS = FUEL_TYPES.map(value => ({ value, label: v.fuel[value] }));
const TRANSMISSION_OPTIONS = TRANSMISSIONS.map(value => ({ value, label: v.transmission[value] }));

/** Figma: last block → Next is 49pt (default), 55pt under the "Not your vehicle?" line (2b), 59pt in 2c. */
const FOOTER_GAP = { autofilled: 55, manual: 59 } as const;

export type VehicleDetailsScreenProps = UseVehicleDetailsFormOptions & {
  onBack?: () => void;
  /** Dev QA screenshots: open the Make list on mount. */
  qaOpenMakeSheet?: boolean;
};

/** Onboarding step 2 "Your Vehicle details" (UI only; the lookup is mocked). */
export default function VehicleDetailsScreen({ onBack, qaOpenMakeSheet, ...options }: VehicleDetailsScreenProps) {
  const toast = useToast();
  const vehicle = useVehicleDetailsForm({
    onLookupNotFound: () => toast.error(v.notFound),
    ...options,
  });
  const footerGap =
    vehicle.state === 'autofilled' ? FOOTER_GAP.autofilled : vehicle.state === 'manual' ? FOOTER_GAP.manual : undefined;

  return (
    <OnboardingLayout
      testID="onboarding-vehicle"
      step={2}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={v.title}
      subtitle={v.subtitle}
      onBack={onBack}
      footerGap={footerGap}
      footer={
        <>
          <PrimaryButton
            testID="vehicle-next"
            label={t.next}
            labelVariant="buttonStrong"
            disabled={!vehicle.canProceed}
            onPress={vehicle.submit}
          />
          <LinkButton testID="vehicle-skip" label={t.skip} onPress={vehicle.skip} style={styles.skip} />
        </>
      }
    >
      <VehicleFields vehicle={vehicle} qaOpenMakeSheet={qaOpenMakeSheet} />
    </OnboardingLayout>
  );
}

function VehicleFields({ vehicle, qaOpenMakeSheet }: { vehicle: VehicleDetailsForm; qaOpenMakeSheet?: boolean }) {
  const reveal = useRevealOnFocus();
  const { control, values, visibility, state } = vehicle;

  return (
    <View testID={`vehicle-state-${state}`} style={styles.first}>
      <TextField
        testID="vehicle-number"
        variant="light"
        label={v.numberLabel}
        placeholder={v.numberPlaceholder}
        value={values.vehicleNumber}
        onChangeText={vehicle.setVehicleNumber}
        onBlur={vehicle.validateNumberOnBlur}
        onFocus={reveal}
        loading={state === 'lookingUp'}
        accessibilityHint={state === 'lookingUp' ? v.numberLookupA11y : undefined}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        maxLength={VEHICLE_NUMBER_MAX_LENGTH}
        returnKeyType="done"
        error={vehicle.numberError}
      />

      {visibility.showUpload && (
        <>
          <OrDivider style={styles.or} />
          <Controller
            control={control}
            name="rcFile"
            render={({ field }) => (
              <FileUploadCard
                testID="vehicle-rc"
                style={styles.upload}
                label={v.rcLabel}
                title={v.rcTitle}
                value={field.value}
                onChange={vehicle.setRcFile}
              />
            )}
          />
        </>
      )}

      {visibility.showDetails && (
        <View testID="vehicle-details">
          <SelectField
            testID="vehicle-make"
            style={styles.field}
            label={v.makeLabel}
            options={MOCK_VEHICLE_MAKES}
            value={values.make}
            onChange={vehicle.setMake}
            defaultOpen={qaOpenMakeSheet}
          />
          <Controller
            control={control}
            name="model"
            render={({ field }) => (
              <SelectField
                testID="vehicle-model"
                style={styles.field}
                label={v.modelLabel}
                options={mockModelsFor(values.make)}
                value={field.value}
                onChange={field.onChange}
                disabled={!values.make}
              />
            )}
          />
          <Controller
            control={control}
            name="fuelType"
            render={({ field }) => (
              <ChipGroup
                testID="vehicle-fuel"
                style={styles.field}
                label={v.fuelLabel}
                options={FUEL_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="transmission"
            render={({ field }) => (
              <ChipGroup
                testID="vehicle-transmission"
                style={styles.field}
                label={v.transmissionLabel}
                options={TRANSMISSION_OPTIONS}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="colour"
            render={({ field }) => (
              <TextField
                ref={field.ref}
                testID="vehicle-colour"
                variant="light"
                style={styles.field}
                label={v.colourLabel}
                placeholder={v.colourPlaceholder}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                onFocus={reveal}
                autoCapitalize="words"
                maxLength={VEHICLE_COLOUR_MAX_LENGTH}
                returnKeyType="done"
              />
            )}
          />
        </View>
      )}

      {visibility.showManualLink && (
        <Pressable
          testID="vehicle-manual-link"
          onPress={vehicle.switchToManual}
          accessibilityRole="button"
          accessibilityLabel={`${v.notYours} ${v.enterManually}`}
          hitSlop={8}
          style={({ pressed }) => [styles.manualLink, pressed && styles.pressed]}
        >
          <AppText variant="body" color="text.onLight" style={styles.center}>
            {`${v.notYours} `}
            <AppText variant="body" color="text.link">
              {v.enterManually}
            </AppText>
          </AppText>
        </Pressable>
      )}

      {visibility.showLookupLink && (
        <LinkButton
          testID="vehicle-lookup-link"
          label={v.findByNumber}
          variant="body"
          onPress={vehicle.switchToLookup}
          style={styles.lookupLink}
        />
      )}
    </View>
  );
}

/* Vertical rhythm: the same as step 1 (line boxes), measured again on step2-*.svg. */
const styles = StyleSheet.create({
  first: { marginTop: FIRST_LABEL_OFFSET },
  field: { marginTop: 25.3 },
  or: { marginTop: 18.5 },
  upload: { marginTop: 23.8 },
  // Colour field bottom (847) → "Not your vehicle?" cap top (881.6): 29.3pt in a 20pt line box.
  manualLink: { marginTop: 29.3, alignSelf: 'center' },
  // Not in Figma (2c ends at Colour): the same place as 2b's "Not your vehicle?" line; LinkButton's
  // 44pt touch target centres the 20pt text, so 12pt less margin.
  lookupLink: { marginTop: 29.3 - 12 },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.6 },
  skip: { marginTop: 16 },
});
