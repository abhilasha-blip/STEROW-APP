import React, { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import { API_FUEL_TYPES, API_TRANSMISSIONS, type VehicleDetails } from '@/api/services/vehicle.service';
import type { VehicleModelOption } from '@/api/services/vehicleMaster.service';
import ChipGroup from '@/components/ChipGroup';
import OnboardingLayout, { FIRST_LABEL_OFFSET, useRevealOnFocus } from '@/components/OnboardingLayout';
import PrimaryButton from '@/components/PrimaryButton';
import SelectField from '@/components/SelectField';
import TextField from '@/components/TextField';
import {
  ONBOARDING_STEP,
  ONBOARDING_TOTAL_STEPS,
  VEHICLE_COLOUR_MAX_LENGTH,
  VEHICLE_NUMBER_MAX_LENGTH,
  type FuelType,
  type Transmission,
} from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { useVehicleCatalog } from '@/hooks/api/useDocumentsStep';
import { isValidVehicleNumber, normalizeVehicleNumber } from '@/utils/validation';

const t = strings.onboarding;
const v = t.vehicle;
const a = t.addVehicle;

const FUEL_OPTIONS = API_FUEL_TYPES.map(value => ({ value, label: v.fuel[value.toLowerCase() as FuelType] }));
const TRANSMISSION_OPTIONS = API_TRANSMISSIONS.map(value => ({
  value,
  label: v.transmission[value.toLowerCase() as Transmission],
}));

export type RcDetailsScreenProps = {
  /** The selected vehicle's details (or the RC details entered before); empty without a vehicle. */
  initialValues?: Partial<VehicleDetails>;
  saving?: boolean;
  onSave: (details: VehicleDetails) => void;
  onBack?: () => void;
};

/**
 * 3/3 → RC "Add Manually": "Your Vehicle details" (design: User Onboarding - 2b). Vehicle Number, Make,
 * Model (+ Variant when the model has more than one: user_vehicles needs one), Fuel Type, Transmission,
 * Colour. Picking a model fills fuel / transmission from the master data (as the web).
 *
 * Not from the design: no number lookup spinner / "Not your vehicle?" link (the lookup isn't enabled,
 * O1), no "Skip for now" (Back returns to the documents), no CVT (the backend has Manual / Automatic).
 */
export default function RcDetailsScreen({ initialValues, saving = false, onSave, onBack }: RcDetailsScreenProps) {
  const catalog = useVehicleCatalog(true);
  const reveal = useRevealOnFocus();
  const [number, setNumber] = useState(initialValues?.vehicleNumber ?? '');
  const [numberError, setNumberError] = useState<string | undefined>();
  const [makeId, setMakeId] = useState<string | null>(initialValues?.makeId ?? null);
  const [modelId, setModelId] = useState<string | null>(initialValues?.modelId ?? null);
  const [variantId, setVariantId] = useState<string | null>(initialValues?.variantId ?? null);
  const [fuel, setFuel] = useState<string | null>(initialValues?.fuelType ?? null);
  const [transmission, setTransmission] = useState<string | null>(initialValues?.transmissionType ?? null);
  const [colour, setColour] = useState(initialValues?.colour ?? '');

  const models = useMemo(() => catalog.data?.models.filter(m => m.makeId === makeId) ?? [], [catalog.data, makeId]);
  const variants = useMemo(() => catalog.data?.variants.filter(x => x.modelId === modelId) ?? [], [catalog.data, modelId]);
  const variant = variants.length === 1 ? variants[0] : variants.find(x => x.value === variantId);

  /** The master data's fuel / transmission for the picked variant (when it has valid ones). */
  const applyVariant = (picked: VehicleModelOption | undefined) => {
    if (picked?.fuelType && (API_FUEL_TYPES as readonly string[]).includes(picked.fuelType)) {
      setFuel(picked.fuelType);
    }
    if (picked?.transmissionType && (API_TRANSMISSIONS as readonly string[]).includes(picked.transmissionType)) {
      setTransmission(picked.transmissionType);
    }
  };

  const canSave = isValidVehicleNumber(number) && !!variant && !!fuel && !!transmission && !saving;

  return (
    <OnboardingLayout
      testID="rc-details"
      step={ONBOARDING_STEP.documents}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={v.title}
      subtitle={v.subtitle}
      onBack={onBack}
      footer={
        <PrimaryButton
          testID="rc-details-next"
          label={t.next}
          labelVariant="buttonStrong"
          loading={saving}
          disabled={!canSave}
          onPress={() =>
            variant &&
            fuel &&
            transmission &&
            onSave({
              vehicleNumber: normalizeVehicleNumber(number),
              makeId: variant.makeId,
              modelId: variant.modelId,
              variantId: variant.variantId,
              fuelType: fuel,
              transmissionType: transmission,
              colour: colour.trim(),
            })
          }
        />
      }
    >
      <TextField
        testID="rc-details-number"
        variant="light"
        style={styles.first}
        label={v.numberLabel}
        placeholder={v.numberPlaceholder}
        value={number}
        onChangeText={text => {
          const next = normalizeVehicleNumber(text);
          setNumber(next);
          if (!next || isValidVehicleNumber(next)) {
            setNumberError(undefined);
          }
        }}
        onBlur={() => setNumberError(number && !isValidVehicleNumber(number) ? v.numberInvalid : undefined)}
        onFocus={reveal}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        maxLength={VEHICLE_NUMBER_MAX_LENGTH}
        returnKeyType="done"
        error={numberError}
      />
      <SelectField
        testID="rc-details-make"
        style={styles.field}
        label={v.makeLabel}
        options={catalog.data?.makes ?? []}
        value={makeId}
        loading={catalog.isLoading}
        error={catalog.isError ? a.catalogFailed : undefined}
        onChange={next => {
          if (next !== makeId) {
            setMakeId(next);
            setModelId(null);
            setVariantId(null);
          }
        }}
      />
      <SelectField
        testID="rc-details-model"
        style={styles.field}
        label={v.modelLabel}
        options={models}
        value={modelId}
        disabled={!makeId}
        onChange={next => {
          setModelId(next);
          setVariantId(null);
          const only = catalog.data?.variants.filter(x => x.modelId === next);
          if (only?.length === 1) {
            applyVariant(only[0]);
          }
        }}
      />
      {variants.length > 1 && (
        <SelectField
          testID="rc-details-variant"
          style={styles.field}
          label={a.variantLabel}
          options={variants.map(x => ({ value: x.value, label: x.label.split(' – ').pop() ?? x.label }))}
          value={variantId}
          onChange={next => {
            setVariantId(next);
            applyVariant(variants.find(x => x.value === next));
          }}
        />
      )}
      <ChipGroup
        testID="rc-details-fuel"
        style={styles.field}
        label={v.fuelLabel}
        options={FUEL_OPTIONS}
        value={fuel as (typeof API_FUEL_TYPES)[number] | null}
        onChange={setFuel}
      />
      <ChipGroup
        testID="rc-details-transmission"
        style={styles.field}
        label={v.transmissionLabel}
        options={TRANSMISSION_OPTIONS}
        value={transmission as (typeof API_TRANSMISSIONS)[number] | null}
        onChange={setTransmission}
      />
      <TextField
        testID="rc-details-colour"
        variant="light"
        style={styles.field}
        label={v.colourLabel}
        placeholder={v.colourPlaceholder}
        value={colour}
        onChangeText={setColour}
        onFocus={reveal}
        autoCapitalize="words"
        maxLength={VEHICLE_COLOUR_MAX_LENGTH}
        returnKeyType="done"
      />
    </OnboardingLayout>
  );
}

/* User Onboarding - 2b: 25.3pt from a field to the next label (as VehicleForm). */
const styles = StyleSheet.create({
  first: { marginTop: FIRST_LABEL_OFFSET },
  field: { marginTop: 25.3 },
});
