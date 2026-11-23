import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { toUserError } from '@/api/errorMessages';
import AppText from '@/components/AppText';
import LightScreen from '@/components/LightScreen';
import PrimaryButton from '@/components/PrimaryButton';
import SelectField from '@/components/SelectField';
import TextField from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { VEHICLE_NUMBER_MAX_LENGTH } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { useCreateVehicle, useVehicleCatalog } from '@/hooks/api/useDocumentsStep';
import { useAuthStore } from '@/store/auth.store';
import { isValidVehicleNumber, normalizeVehicleNumber } from '@/utils/validation';

const t = strings.onboarding.addVehicle;

export type AddVehicleScreenProps = {
  onBack: () => void;
  /** The new vehicle's id (the caller selects it). */
  onSaved: (vehicleId: string) => void;
};

/**
 * "Add new vehicle": the minimal vehicle (Vehicle Number, Make, Model; Variant only when the model has
 * more than one: user_vehicles.variant_id is NOT NULL). Other columns get the documented defaults
 * (vehicle.service#VEHICLE_DEFAULTS).
 */
export default function AddVehicleScreen({ onBack, onSaved }: AddVehicleScreenProps) {
  const toast = useToast();
  const uid = useAuthStore(s => s.user?.id);
  const catalog = useVehicleCatalog(!!uid);
  const create = useCreateVehicle(uid ?? '');
  const [number, setNumber] = useState('');
  const [numberError, setNumberError] = useState<string | undefined>();
  const [makeId, setMakeId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<string | null>(null);

  const models = useMemo(() => catalog.data?.models.filter(m => m.makeId === makeId) ?? [], [catalog.data, makeId]);
  const variants = useMemo(() => catalog.data?.variants.filter(v => v.modelId === modelId) ?? [], [catalog.data, modelId]);
  const model = variants.length === 1 ? variants[0] : variants.find(v => v.value === variantId);
  const canSave = isValidVehicleNumber(number) && !!model && !create.isPending;

  return (
    <LightScreen
      testID="add-vehicle"
      title={t.title}
      onBack={onBack}
      footer={
        <PrimaryButton
          testID="add-vehicle-save"
          label={t.save}
          labelVariant="buttonStrong"
          showArrow={false}
          loading={create.isPending}
          disabled={!canSave}
          onPress={() =>
            model &&
            uid &&
            create.mutate(
              { vehicleNumber: number, model },
              {
                onSuccess: ({ id }) => {
                  toast.success(t.saved);
                  onSaved(id);
                },
                onError: e => toast.error(toUserError(e).userMessage),
              },
            )
          }
        />
      }
    >
      <TextField
        testID="add-vehicle-number"
        variant="light"
        label={t.numberLabel}
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
        label={t.makeLabel}
        options={catalog.data?.makes ?? []}
        value={makeId}
        loading={catalog.isLoading}
        error={catalog.isError ? t.catalogFailed : undefined}
        onChange={v => {
          if (v !== makeId) {
            setMakeId(v);
            setModelId(null);
            setVariantId(null);
          }
        }}
      />
      <SelectField
        testID="add-vehicle-model"
        style={styles.field}
        label={t.modelLabel}
        options={models}
        value={modelId}
        disabled={!makeId}
        onChange={v => {
          setModelId(v);
          setVariantId(null);
        }}
      />
      {variants.length > 1 && (
        <SelectField
          testID="add-vehicle-variant"
          style={styles.field}
          label={t.variantLabel}
          options={variants.map(v => ({ value: v.value, label: v.label.split(' – ').pop() ?? v.label }))}
          value={variantId}
          onChange={setVariantId}
        />
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
  note: { marginTop: 16 },
});
