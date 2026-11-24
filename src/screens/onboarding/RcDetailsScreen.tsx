import React, { useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  API_FUEL_TYPES,
  API_TRANSMISSIONS,
  VEHICLE_DEFAULTS,
  type VehicleDetails,
} from '@/api/services/vehicle.service';
import { RC_BODY_TYPES, type RcDetails } from '@/api/services/vehicleDocuments.service';
import type { VehicleModelOption } from '@/api/services/vehicleMaster.service';
import DateField from '@/components/DateField';
import LightScreen from '@/components/LightScreen';
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
} from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { useVehicleCatalog } from '@/hooks/api/useDocumentsStep';
import { isValidVehicleNumber, normalizeVehicleNumber } from '@/utils/validation';

const t = strings.onboarding;
const v = t.vehicle;
const a = t.addVehicle;
const r = t.documents.rcFields;

const FUEL_OPTIONS = API_FUEL_TYPES.map(value => ({ value, label: v.fuel[value.toLowerCase() as FuelType] }));
const BODY_OPTIONS = RC_BODY_TYPES.map(value => ({ value, label: value }));
const RC_NUMBER_MAX_LENGTH = 20;
const CHASSIS_MAX_LENGTH = 25;
const ADDRESS_MAX_LENGTH = 250;

/** Seating capacity: an integer ≥ 1 (or empty). */
const seatingOk = (s: string) => !s.trim() || (/^\d+$/.test(s.trim()) && Number(s) >= 1);
/** Weights in kg: a number ≥ 0 (or empty). */
const weightOk = (s: string) => !s.trim() || (/^\d+(\.\d+)?$/.test(s.trim()) && Number(s) >= 0);
const decimalOnly = (s: string) => s.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');

export type RcDetailsResult = {
  vehicle: VehicleDetails;
  registrationNumber: string;
  rc: RcDetails;
};

export type RcDetailsScreenProps = {
  /** The selected vehicle's details (or the RC details entered before); empty without a vehicle. */
  initialValues?: Partial<VehicleDetails>;
  /** The RC's registration number entered before (defaults to the vehicle number). */
  initialRegistrationNumber?: string;
  /** The RC fields entered before. */
  initialRc?: RcDetails;
  saving?: boolean;
  onSave: (result: RcDetailsResult) => void;
  onBack?: () => void;
  /** 'onboarding' (3/3, default): the onboarding shell with "Next"; 'light': the app's light screen with "Save". */
  layout?: 'onboarding' | 'light';
};

/**
 * 3/3 → RC "Add Manually": "Your Vehicle details" with the web's RC form. The vehicle (Vehicle Number,
 * Make, Model, + Variant when the model has more than one: user_vehicles needs one), then the RC:
 * Registration number*, Registration date, Valid upto, Address, Body type, Fuel type, Chassis number,
 * Engine number, Colour, Seating capacity, Gross / Unladen weight (kg). Transmission isn't on the RC: it
 * comes from the vehicle / variant (else Manual).
 *
 * Not from the design: no number lookup spinner / "Not your vehicle?" link (the lookup isn't enabled,
 * O1), no "Skip for now" (Back returns to the documents), no CVT (the backend has Manual / Automatic).
 */
export default function RcDetailsScreen({
  initialValues,
  initialRegistrationNumber,
  initialRc,
  saving = false,
  onSave,
  onBack,
  layout = 'onboarding',
}: RcDetailsScreenProps) {
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
  const initialNumber = initialValues?.vehicleNumber ?? '';
  // The registration number follows the vehicle number until it's edited.
  const [regNumber, setRegNumber] = useState(initialRegistrationNumber ?? '');
  const [regEdited, setRegEdited] = useState(!!initialRegistrationNumber && initialRegistrationNumber !== initialNumber);
  const [regDate, setRegDate] = useState<string | null>(initialRc?.regDate ?? null);
  const [validUpto, setValidUpto] = useState<string | null>(initialRc?.validUpto ?? null);
  const [address, setAddress] = useState(initialRc?.address ?? '');
  const [bodyType, setBodyType] = useState<string | null>(initialRc?.bodyType ?? null);
  const [chassis, setChassis] = useState(initialRc?.chassisNumber ?? '');
  const [engine, setEngine] = useState(initialRc?.engineNumber ?? '');
  const [seating, setSeating] = useState(initialRc?.seatingCapacity ?? '');
  const [gross, setGross] = useState(initialRc?.grossWeight ?? '');
  const [unladen, setUnladen] = useState(initialRc?.unladenWeight ?? '');

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

  const regValue = regEdited ? regNumber : number;
  const validUptoError = regDate && validUpto && validUpto < regDate ? r.validUptoBeforeReg : undefined;
  const canSave =
    isValidVehicleNumber(number) &&
    !!variant &&
    !!fuel &&
    !!regValue.trim() &&
    !validUptoError &&
    seatingOk(seating) &&
    weightOk(gross) &&
    weightOk(unladen) &&
    !saving;

  const footer = (
        <PrimaryButton
          testID="rc-details-next"
          label={layout === 'light' ? t.documents.fields.save : t.next}
          labelVariant="buttonStrong"
          loading={saving}
          disabled={!canSave}
          onPress={() =>
            variant &&
            fuel &&
            onSave({
              vehicle: {
                vehicleNumber: normalizeVehicleNumber(number),
                makeId: variant.makeId,
                modelId: variant.modelId,
                variantId: variant.variantId,
                fuelType: fuel,
                transmissionType: transmission ?? VEHICLE_DEFAULTS.transmissionType,
                colour: colour.trim(),
              },
              registrationNumber: regValue.trim().toUpperCase().replace(/\s+/g, ''),
              rc: {
                regDate,
                validUpto,
                address: address.trim(),
                bodyType,
                chassisNumber: chassis.trim().toUpperCase(),
                engineNumber: engine.trim().toUpperCase(),
                seatingCapacity: seating.trim(),
                grossWeight: gross.trim(),
                unladenWeight: unladen.trim(),
              },
            })
          }
        />
  );
  const fields = (
    <>
      <TextField
        testID="rc-details-number"
        variant="light"
        style={layout === 'light' ? undefined : styles.first}
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
      <TextField
        testID="rc-details-registration"
        variant="light"
        style={styles.field}
        label={`${r.registrationNumber} *`}
        placeholder={r.registrationNumberPlaceholder}
        value={regValue}
        onChangeText={text => {
          setRegEdited(true);
          setRegNumber(text.toUpperCase());
        }}
        onFocus={reveal}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        maxLength={RC_NUMBER_MAX_LENGTH}
        returnKeyType="done"
      />
      <DateField
        testID="rc-details-reg-date"
        style={styles.field}
        label={r.regDate}
        value={regDate}
        onChange={setRegDate}
        maximumDate={new Date()}
      />
      <DateField
        testID="rc-details-valid-upto"
        style={styles.field}
        label={r.validUpto}
        value={validUpto}
        onChange={setValidUpto}
        error={validUptoError}
      />
      <TextField
        testID="rc-details-address"
        variant="light"
        style={styles.field}
        label={r.address}
        placeholder={r.addressPlaceholder}
        value={address}
        onChangeText={setAddress}
        onFocus={reveal}
        autoCapitalize="words"
        maxLength={ADDRESS_MAX_LENGTH}
        returnKeyType="done"
      />
      <SelectField
        testID="rc-details-body-type"
        style={styles.field}
        label={r.bodyType}
        options={BODY_OPTIONS}
        value={bodyType}
        onChange={setBodyType}
      />
      <SelectField
        testID="rc-details-fuel"
        style={styles.field}
        label={`${r.fuelType} *`}
        options={FUEL_OPTIONS}
        value={fuel}
        onChange={setFuel}
      />
      <TextField
        testID="rc-details-chassis"
        variant="light"
        style={styles.field}
        label={r.chassisNumber}
        placeholder={r.chassisPlaceholder}
        value={chassis}
        onChangeText={text => setChassis(text.toUpperCase())}
        onFocus={reveal}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        maxLength={CHASSIS_MAX_LENGTH}
        returnKeyType="done"
      />
      <TextField
        testID="rc-details-engine"
        variant="light"
        style={styles.field}
        label={r.engineNumber}
        placeholder={r.enginePlaceholder}
        value={engine}
        onChangeText={text => setEngine(text.toUpperCase())}
        onFocus={reveal}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        maxLength={CHASSIS_MAX_LENGTH}
        returnKeyType="done"
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
      <TextField
        testID="rc-details-seating"
        variant="light"
        style={styles.field}
        label={r.seatingCapacity}
        placeholder={r.seatingPlaceholder}
        value={seating}
        onChangeText={text => setSeating(text.replace(/\D/g, '').slice(0, 3))}
        onFocus={reveal}
        keyboardType="number-pad"
        maxLength={3}
        returnKeyType="done"
        error={seatingOk(seating) ? undefined : r.seatingInvalid}
      />
      <TextField
        testID="rc-details-gross-weight"
        variant="light"
        style={styles.field}
        label={r.grossWeight}
        placeholder={r.weightPlaceholder}
        value={gross}
        onChangeText={text => setGross(decimalOnly(text).slice(0, 8))}
        onFocus={reveal}
        keyboardType="decimal-pad"
        maxLength={8}
        returnKeyType="done"
        error={weightOk(gross) ? undefined : r.weightInvalid}
      />
      <TextField
        testID="rc-details-unladen-weight"
        variant="light"
        style={styles.field}
        label={r.unladenWeight}
        placeholder={r.weightPlaceholder}
        value={unladen}
        onChangeText={text => setUnladen(decimalOnly(text).slice(0, 8))}
        onFocus={reveal}
        keyboardType="decimal-pad"
        maxLength={8}
        returnKeyType="done"
        error={weightOk(unladen) ? undefined : r.weightInvalid}
      />
    </>
  );

  if (layout === 'light') {
    return (
      <LightScreen testID="rc-details" title={v.title} onBack={onBack} footer={footer} aboveTabs>
        {fields}
      </LightScreen>
    );
  }
  return (
    <OnboardingLayout
      testID="rc-details"
      step={ONBOARDING_STEP.documents}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={v.title}
      subtitle={v.subtitle}
      onBack={onBack}
      footer={footer}
    >
      {fields}
    </OnboardingLayout>
  );
}

/* User Onboarding - 2b: 25.3pt from a field to the next label. */
const styles = StyleSheet.create({
  first: { marginTop: FIRST_LABEL_OFFSET },
  field: { marginTop: 25.3 },
});
