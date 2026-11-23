import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import DocumentsUploadList from '@/components/DocumentsUploadList';
import LinkButton from '@/components/LinkButton';
import OnboardingLayout, { FIRST_LABEL_OFFSET, useRevealOnFocus } from '@/components/OnboardingLayout';
import PrimaryButton from '@/components/PrimaryButton';
import SelectField, { type SelectOption } from '@/components/SelectField';
import TextField from '@/components/TextField';
import {
  DOCUMENT_NUMBER_MAX_LENGTH,
  INSURER_MAX_LENGTH,
  ONBOARDING_STEP,
  ONBOARDING_TOTAL_STEPS,
  VEHICLE_NUMBER_MAX_LENGTH,
  type DocumentKey,
} from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import type { UploadedFile } from '@/utils/uploadFile';
import { isValidVehicleNumber, normalizeVehicleNumber } from '@/utils/validation';
import {
  canProceedDocuments,
  DOCUMENT_NUMBER_FIELDS,
  EMPTY_DOCUMENTS,
  type DocumentNumberField,
  type DocumentsFormValues,
} from './schemas/documents.schema';

const t = strings.onboarding;
const d = t.documents;

const NUMBER_FIELDS: Record<
  DocumentNumberField,
  { label: string; placeholder: string; maxLength: number; testID: string; autoCapitalize: 'characters' | 'words' }
> = {
  insurancePolicyNo: {
    label: d.policyNoLabel,
    placeholder: d.policyNoPlaceholder,
    maxLength: DOCUMENT_NUMBER_MAX_LENGTH,
    testID: 'document-insurance-policy-no',
    autoCapitalize: 'characters',
  },
  insurer: {
    label: d.insurerLabel,
    placeholder: d.insurerPlaceholder,
    maxLength: INSURER_MAX_LENGTH,
    testID: 'document-insurance-insurer',
    autoCapitalize: 'words',
  },
  pucCertificateNo: {
    label: d.certificateNoLabel,
    placeholder: d.certificateNoPlaceholder,
    maxLength: DOCUMENT_NUMBER_MAX_LENGTH,
    testID: 'document-pollution-certificate-no',
    autoCapitalize: 'characters',
  },
  fastagId: {
    label: d.fastagIdLabel,
    placeholder: d.fastagIdPlaceholder,
    maxLength: DOCUMENT_NUMBER_MAX_LENGTH,
    testID: 'document-fastag-id',
    autoCapitalize: 'characters',
  },
};

export type VehicleDocumentsScreenProps = {
  /** What was entered before (Back / re-entry). */
  initialValues?: DocumentsFormValues;
  /** Vehicle models (make + model + variant) from the master data. */
  modelOptions: readonly SelectOption[];
  modelsLoading?: boolean;
  modelsError?: string;
  /** Next is saving: spinner on Next, Next and Skip disabled. */
  saving?: boolean;
  onValuesChange?: (values: DocumentsFormValues) => void;
  onNext: (values: DocumentsFormValues) => void;
  onSkip: () => void;
  onBack?: () => void;
};

/**
 * Onboarding 3/3 "Your Vehicle documents": Vehicle Number + Vehicle Model (the minimum the database
 * needs to create the vehicle), then RC, Insurance, Pollution and FASTag, each optional; an attached
 * document shows its required number field(s). Next saves the vehicle + the added documents.
 */
export default function VehicleDocumentsScreen({
  initialValues = EMPTY_DOCUMENTS,
  modelOptions,
  modelsLoading,
  modelsError,
  saving = false,
  onValuesChange,
  onNext,
  onSkip,
  onBack,
}: VehicleDocumentsScreenProps) {
  const [values, setValues] = useState(initialValues);
  const latest = useRef(onValuesChange);
  latest.current = onValuesChange;
  useEffect(() => latest.current?.(values), [values]);

  const set = useCallback(
    <K extends keyof DocumentsFormValues>(key: K, value: DocumentsFormValues[K]) =>
      setValues(prev => ({ ...prev, [key]: value })),
    [],
  );
  const onFileChange = useCallback((key: DocumentKey, file: UploadedFile | null) => set(key, file), [set]);
  const canProceed = canProceedDocuments(values);

  return (
    <OnboardingLayout
      testID="onboarding-documents"
      step={ONBOARDING_STEP.documents}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={d.title}
      subtitle={d.subtitle}
      onBack={onBack}
      // step3-documents: last card bottom → Next is 59pt.
      footerGap={59}
      footer={
        <>
          <PrimaryButton
            testID="documents-next"
            label={t.next}
            labelVariant="buttonStrong"
            loading={saving}
            disabled={!canProceed || saving}
            onPress={() => onNext(values)}
          />
          <LinkButton testID="documents-skip" label={t.skip} onPress={onSkip} disabled={saving} style={styles.skip} />
        </>
      }
    >
      <DocumentsUploadList
        style={styles.first}
        values={values}
        onChange={onFileChange}
        header={
          <VehicleFields
            values={values}
            set={set}
            modelOptions={modelOptions}
            modelsLoading={modelsLoading}
            modelsError={modelsError}
          />
        }
        renderBelow={key =>
          values[key] ? <NumberFields fields={DOCUMENT_NUMBER_FIELDS[key]} values={values} set={set} /> : null
        }
      />
    </OnboardingLayout>
  );
}

type SetField = <K extends keyof DocumentsFormValues>(key: K, value: DocumentsFormValues[K]) => void;

function VehicleFields({
  values,
  set,
  modelOptions,
  modelsLoading,
  modelsError,
}: {
  values: DocumentsFormValues;
  set: SetField;
  modelOptions: readonly SelectOption[];
  modelsLoading?: boolean;
  modelsError?: string;
}) {
  const reveal = useRevealOnFocus();
  const [numberError, setNumberError] = useState<string | undefined>();
  return (
    <View style={styles.vehicle}>
      <TextField
        testID="documents-vehicle-number"
        variant="light"
        label={d.vehicleNumberLabel}
        placeholder={d.vehicleNumberPlaceholder}
        value={values.vehicleNumber}
        onChangeText={text => {
          const next = normalizeVehicleNumber(text);
          set('vehicleNumber', next);
          if (!next || isValidVehicleNumber(next)) {
            setNumberError(undefined);
          }
        }}
        onBlur={() =>
          setNumberError(values.vehicleNumber && !isValidVehicleNumber(values.vehicleNumber) ? d.vehicleNumberInvalid : undefined)
        }
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
        testID="documents-vehicle-model"
        style={styles.field}
        label={d.vehicleModelLabel}
        placeholder={d.vehicleModelPlaceholder}
        options={modelOptions}
        value={values.variantId}
        onChange={v => set('variantId', v)}
        loading={modelsLoading}
        error={modelsError}
      />
    </View>
  );
}

function NumberFields({
  fields,
  values,
  set,
}: {
  fields: readonly DocumentNumberField[];
  values: DocumentsFormValues;
  set: SetField;
}) {
  const reveal = useRevealOnFocus();
  return (
    <>
      {fields.map(f => {
        const c = NUMBER_FIELDS[f];
        return (
          <TextField
            key={f}
            testID={c.testID}
            variant="light"
            style={styles.numberField}
            label={c.label}
            placeholder={c.placeholder}
            value={values[f]}
            onChangeText={text => set(f, c.autoCapitalize === 'characters' ? text.toUpperCase() : text)}
            onFocus={reveal}
            autoCapitalize={c.autoCapitalize}
            autoCorrect={false}
            maxLength={c.maxLength}
            returnKeyType="done"
          />
        );
      })}
    </>
  );
}

/* Same 25.3pt field rhythm as the other steps; the cards keep their own spacing. */
const styles = StyleSheet.create({
  first: { marginTop: FIRST_LABEL_OFFSET },
  vehicle: { marginBottom: 29 },
  field: { marginTop: 25.3 },
  numberField: { marginTop: 16 },
  skip: { marginTop: 16 },
});
