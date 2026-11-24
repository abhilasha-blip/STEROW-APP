import React, { useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { toUserError } from '@/api/errorMessages';
import { API_FUEL_TYPES, API_TRANSMISSIONS } from '@/api/services/vehicle.service';
import type { VehicleModelOption } from '@/api/services/vehicleMaster.service';
import AppText from '@/components/AppText';
import DateField from '@/components/DateField';
import LightScreen from '@/components/LightScreen';
import OutlineButton from '@/components/OutlineButton';
import PrimaryButton from '@/components/PrimaryButton';
import SelectField from '@/components/SelectField';
import TextField from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { VEHICLE_COLOUR_MAX_LENGTH, VEHICLE_NUMBER_MAX_LENGTH, type FuelType, type Transmission } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { useCreateVehicle, useVehicleCatalog } from '@/hooks/api/useDocumentsStep';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme';
import { digitsOnly, isValidVehicleNumber, normalizeVehicleNumber } from '@/utils/validation';

const t = strings.onboarding.addVehicle;
const v = strings.onboarding.vehicle;

const FUEL_OPTIONS = API_FUEL_TYPES.map(value => ({ value, label: v.fuel[value.toLowerCase() as FuelType] }));
const TRANSMISSION_OPTIONS = API_TRANSMISSIONS.map(value => ({
  value,
  label: v.transmission[value.toLowerCase() as Transmission],
}));
const MONTH_OPTIONS = t.months.map((label, i) => ({ value: String(i + 1), label }));
const ODOMETER_MAX_LENGTH = 7;
const CHASSIS_MAX_LENGTH = 25;
const RC_NUMBER_MAX_LENGTH = 20;

export type AddVehicleScreenProps = {
  onBack: () => void;
  /** The new vehicle's id (the caller selects it). */
  onSaved: (vehicleId: string) => void;
  /**
   * Show the "Active" switch (My Vehicles). Onboarding hides it: the new vehicle is selected right away
   * and only active vehicles are listed.
   */
  showActive?: boolean;
};

/**
 * "Add new vehicle" (as the web's Manual tab): Vehicle number*, Make*, Model*, Variant*, Fuel type*,
 * Transmission*, Colour, RC number*, Registration month & year, Chassis number, Current odometer*,
 * Last service date, Active. Variant is picked automatically when the model has only one; fuel /
 * transmission are prefilled from the variant. RC number follows the vehicle number until edited.
 *
 * Not from the design: no "Upload RC" tab (RC OCR isn't enabled, O1).
 */
export default function AddVehicleScreen({ onBack, onSaved, showActive = false }: AddVehicleScreenProps) {
  const toast = useToast();
  const { colors } = useTheme();
  const uid = useAuthStore(s => s.user?.id);
  const catalog = useVehicleCatalog(!!uid);
  const create = useCreateVehicle(uid ?? '');
  const [number, setNumber] = useState('');
  const [numberError, setNumberError] = useState<string | undefined>();
  const [makeId, setMakeId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [fuel, setFuel] = useState<string | null>(null);
  const [transmission, setTransmission] = useState<string | null>(null);
  const [colour, setColour] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [rcEdited, setRcEdited] = useState(false);
  const [regMonth, setRegMonth] = useState<string | null>(null);
  const [regYear, setRegYear] = useState('');
  const [chassis, setChassis] = useState('');
  const [odometer, setOdometer] = useState('');
  const [lastService, setLastService] = useState<string | null>(null);
  const [active, setActive] = useState(true);

  const models = useMemo(() => catalog.data?.models.filter(m => m.makeId === makeId) ?? [], [catalog.data, makeId]);
  const variants = useMemo(() => catalog.data?.variants.filter(x => x.modelId === modelId) ?? [], [catalog.data, modelId]);
  const model = variants.find(x => x.value === variantId);

  const applyVariant = (picked: VehicleModelOption | undefined) => {
    setVariantId(picked?.value ?? null);
    if (picked?.fuelType && (API_FUEL_TYPES as readonly string[]).includes(picked.fuelType)) {
      setFuel(picked.fuelType);
    }
    if (picked?.transmissionType && (API_TRANSMISSIONS as readonly string[]).includes(picked.transmissionType)) {
      setTransmission(picked.transmissionType);
    }
  };

  const thisYear = new Date().getFullYear();
  const yearNum = Number(regYear);
  const regDateValid =
    (!regMonth && !regYear) || (!!regMonth && regYear.length === 4 && yearNum >= 1900 && yearNum <= thisYear);
  const regDateError = regYear.length === 4 && !regDateValid ? t.regDateInvalid : undefined;
  const rcValue = rcEdited ? rcNumber : number;

  const canSave =
    isValidVehicleNumber(number) &&
    !!model &&
    !!fuel &&
    !!transmission &&
    !!rcValue.trim() &&
    odometer.length > 0 &&
    regDateValid &&
    !create.isPending;

  const save = () => {
    if (!model || !uid || !canSave) {
      return;
    }
    create.mutate(
      {
        vehicleNumber: number,
        model,
        extras: {
          fuelType: fuel ?? undefined,
          transmissionType: transmission ?? undefined,
          colour,
          rcNumber: rcValue,
          registrationMonth: regMonth ? Number(regMonth) : null,
          registrationYear: regMonth && regYear ? yearNum : null,
          chassisNumber: chassis,
          currentOdometer: Number(odometer),
          lastServiceDate: lastService,
          isActive: showActive ? active : true,
        },
      },
      {
        onSuccess: ({ id }) => {
          toast.success(t.saved);
          onSaved(id);
        },
        onError: e => toast.error(toUserError(e).userMessage),
      },
    );
  };

  return (
    <LightScreen
      testID="add-vehicle"
      title={t.title}
      onBack={onBack}
      footer={
        <View style={styles.footer}>
          <OutlineButton testID="add-vehicle-cancel" style={styles.footerButton} label={t.cancel} onPress={onBack} />
          <PrimaryButton
            testID="add-vehicle-save"
            style={styles.footerButton}
            label={t.save}
            labelVariant="buttonStrong"
            showArrow={false}
            loading={create.isPending}
            disabled={!canSave}
            onPress={save}
          />
        </View>
      }
    >
      <TextField
        testID="add-vehicle-number"
        variant="light"
        label={`${t.numberLabel} *`}
        placeholder={t.numberPlaceholder}
        value={number}
        onChangeText={text => {
          const next = normalizeVehicleNumber(text);
          setNumber(next);
          if (!next || isValidVehicleNumber(next)) {
            setNumberError(undefined);
          }
        }}
        onBlur={() => setNumberError(number && !isValidVehicleNumber(number) ? t.numberInvalid : undefined)}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={VEHICLE_NUMBER_MAX_LENGTH}
        returnKeyType="done"
        error={numberError}
      />
      <SelectField
        testID="add-vehicle-make"
        style={styles.field}
        label={`${t.makeLabel} *`}
        options={catalog.data?.makes ?? []}
        value={makeId}
        loading={catalog.isLoading}
        error={catalog.isError ? t.catalogFailed : undefined}
        onChange={next => {
          if (next !== makeId) {
            setMakeId(next);
            setModelId(null);
            setVariantId(null);
          }
        }}
      />
      <SelectField
        testID="add-vehicle-model"
        style={styles.field}
        label={`${t.modelLabel} *`}
        options={models}
        value={modelId}
        disabled={!makeId}
        onChange={next => {
          setModelId(next);
          const forModel = catalog.data?.variants.filter(x => x.modelId === next) ?? [];
          applyVariant(forModel.length === 1 ? forModel[0] : undefined);
        }}
      />
      <SelectField
        testID="add-vehicle-variant"
        style={styles.field}
        label={`${t.variantLabel} *`}
        options={variants.map(x => ({ value: x.value, label: x.label.split(' – ').pop() ?? x.label }))}
        value={variantId}
        disabled={!modelId}
        onChange={next => applyVariant(variants.find(x => x.value === next))}
      />
      <SelectField
        testID="add-vehicle-fuel"
        style={styles.field}
        label={`${t.fuelLabel} *`}
        options={FUEL_OPTIONS}
        value={fuel}
        onChange={setFuel}
      />
      <SelectField
        testID="add-vehicle-transmission"
        style={styles.field}
        label={`${t.transmissionLabel} *`}
        options={TRANSMISSION_OPTIONS}
        value={transmission}
        onChange={setTransmission}
      />
      <TextField
        testID="add-vehicle-colour"
        variant="light"
        style={styles.field}
        label={t.colourLabel}
        placeholder={t.colourPlaceholder}
        value={colour}
        onChangeText={setColour}
        autoCapitalize="words"
        maxLength={VEHICLE_COLOUR_MAX_LENGTH}
        returnKeyType="done"
      />
      <TextField
        testID="add-vehicle-rc-number"
        variant="light"
        style={styles.field}
        label={`${t.rcNumberLabel} *`}
        placeholder={t.rcNumberPlaceholder}
        value={rcValue}
        onChangeText={text => {
          setRcEdited(true);
          setRcNumber(text.toUpperCase());
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={RC_NUMBER_MAX_LENGTH}
        returnKeyType="done"
      />
      <AppText variant="fieldLabel" color="text.onLight" style={[styles.field, styles.groupLabel]}>
        {t.regDateLabel}
      </AppText>
      <View style={styles.row}>
        <SelectField
          testID="add-vehicle-reg-month"
          style={styles.half}
          label={t.regDateLabel}
          labelHidden
          placeholder={t.regMonthPlaceholder}
          options={MONTH_OPTIONS}
          value={regMonth}
          onChange={setRegMonth}
        />
        <TextField
          testID="add-vehicle-reg-year"
          variant="light"
          style={styles.half}
          label={t.regYearLabel}
          labelHidden
          placeholder={t.regYearPlaceholder}
          value={regYear}
          onChangeText={text => setRegYear(digitsOnly(text).slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          returnKeyType="done"
        />
      </View>
      {regDateError && (
        <AppText variant="hint" color="status.errorOnLight" style={styles.hint}>
          {regDateError}
        </AppText>
      )}
      <TextField
        testID="add-vehicle-chassis"
        variant="light"
        style={styles.field}
        label={t.chassisLabel}
        placeholder={t.chassisPlaceholder}
        value={chassis}
        onChangeText={text => setChassis(text.toUpperCase())}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        maxLength={CHASSIS_MAX_LENGTH}
        returnKeyType="done"
      />
      <TextField
        testID="add-vehicle-odometer"
        variant="light"
        style={styles.field}
        label={`${t.odometerLabel} *`}
        placeholder={t.odometerPlaceholder}
        value={odometer}
        onChangeText={text => setOdometer(digitsOnly(text).slice(0, ODOMETER_MAX_LENGTH))}
        keyboardType="number-pad"
        maxLength={ODOMETER_MAX_LENGTH}
        returnKeyType="done"
      />
      <DateField
        testID="add-vehicle-last-service"
        style={styles.field}
        label={t.lastServiceLabel}
        value={lastService}
        onChange={setLastService}
        maximumDate={new Date()}
      />
      {showActive && (
        <View style={[styles.field, styles.switchRow]}>
          <Switch
            testID="add-vehicle-active"
            value={active}
            onValueChange={setActive}
            trackColor={{ true: colors.primary.main, false: colors.primary.disabled }}
            thumbColor={colors.primary.contrastText}
            accessibilityLabel={t.activeLabel}
          />
          <AppText variant="body" color="text.onLight" style={styles.switchLabel} importantForAccessibility="no">
            {t.activeLabel}
          </AppText>
        </View>
      )}
      <View style={styles.note}>
        <AppText variant="hint" color="text.onLightMuted">
          {t.catalogNote}
        </AppText>
      </View>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: 20 },
  groupLabel: { marginLeft: 16, marginBottom: 6.5 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  hint: { marginTop: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { marginLeft: 12 },
  note: { marginTop: 16 },
  footer: { flexDirection: 'row', gap: 12 },
  footerButton: { flex: 1 },
});
