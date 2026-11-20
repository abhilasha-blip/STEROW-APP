import React, { memo, useCallback, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Controller, useWatch, type UseFormReturn } from 'react-hook-form';
import {
  FUEL_TYPES,
  TRANSMISSIONS,
  VEHICLE_COLOUR_MAX_LENGTH,
  VEHICLE_NUMBER_MAX_LENGTH,
} from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { MOCK_VEHICLE_MAKES, mockModelsFor } from '@/constants/vehicleMock';
import type { VehicleFormValues } from '@/screens/onboarding/schemas/vehicle.schema';
import { isValidVehicleNumber, normalizeVehicleNumber } from '@/utils/validation';
import ChipGroup from './ChipGroup';
import { useRevealOnFocus } from './OnboardingLayout';
import SelectField from './SelectField';
import TextField from './TextField';

const v = strings.onboarding.vehicle;

const FUEL_OPTIONS = FUEL_TYPES.map(value => ({ value, label: v.fuel[value] }));
const TRANSMISSION_OPTIONS = TRANSMISSIONS.map(value => ({ value, label: v.transmission[value] }));

export type VehicleFormProps = {
  /** From useVehicleForm(). */
  form: UseFormReturn<VehicleFormValues>;
  /** Dev QA screenshots: open the Make list on mount. */
  qaOpenMakeSheet?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * The vehicle fields (Figma 2b/2c): Number, Make, Model, Fuel Type, Transmission, Colour – no screen
 * header or footer. Onboarding step 2's form screen; reusable on the Dashboard.
 *
 * Typing re-renders only the field's own Controller; the form re-renders when the Make changes (the
 * Model list depends on it).
 */
function VehicleForm({ form, qaOpenMakeSheet, style }: VehicleFormProps) {
  const reveal = useRevealOnFocus();
  const { control, setValue, getValues } = form;
  const make = useWatch({ control, name: 'make' });
  const [numberError, setNumberError] = useState<string | undefined>();

  /** A different make invalidates the model. */
  const onMakeChange = useCallback(
    (next: string) => {
      if (next !== getValues('make')) {
        setValue('make', next, { shouldDirty: true });
        setValue('model', null, { shouldDirty: true });
      }
    },
    [getValues, setValue],
  );

  return (
    <View testID="vehicle-form" style={style}>
      <Controller
        control={control}
        name="vehicleNumber"
        render={({ field }) => (
          <TextField
            ref={field.ref}
            testID="vehicle-number"
            variant="light"
            label={v.numberLabel}
            placeholder={v.numberPlaceholder}
            value={field.value}
            onChangeText={text => {
              const next = normalizeVehicleNumber(text);
              field.onChange(next);
              if (!next || isValidVehicleNumber(next)) {
                setNumberError(undefined);
              }
            }}
            onBlur={() => {
              field.onBlur();
              const current = normalizeVehicleNumber(getValues('vehicleNumber'));
              setNumberError(current && !isValidVehicleNumber(current) ? v.numberInvalid : undefined);
            }}
            onFocus={reveal}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            maxLength={VEHICLE_NUMBER_MAX_LENGTH}
            returnKeyType="done"
            error={numberError}
          />
        )}
      />
      <SelectField
        testID="vehicle-make"
        style={styles.field}
        label={v.makeLabel}
        options={MOCK_VEHICLE_MAKES}
        value={make}
        onChange={onMakeChange}
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
            options={mockModelsFor(make)}
            value={field.value}
            onChange={field.onChange}
            disabled={!make}
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
  );
}

export default memo(VehicleForm);

/* Vertical rhythm measured on step2-*.svg: 25.3pt field → next label line box (as on step 1). */
const styles = StyleSheet.create({
  field: { marginTop: 25.3 },
});
