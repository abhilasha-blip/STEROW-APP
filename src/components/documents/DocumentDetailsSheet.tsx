import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import BottomSheet from '@/components/BottomSheet';
import DateField from '@/components/DateField';
import PrimaryButton from '@/components/PrimaryButton';
import TextField from '@/components/TextField';
import { DOCUMENT_NUMBER_MAX_LENGTH, INSURER_MAX_LENGTH, type DocumentKey } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import {
  DOCUMENT_FORM_FIELDS,
  isFormComplete,
  type DocumentField,
  type DocumentFieldValues,
} from '@/screens/onboarding/schemas/documents.schema';

const d = strings.onboarding.documents;
const f = d.fields;

type TextFieldConfig = { label: string; placeholder: string; maxLength: number; upper: boolean };
const TEXT_FIELDS: Record<Exclude<DocumentField, 'expiry'>, TextFieldConfig> = {
  registrationNumber: { label: f.registrationNumber, placeholder: '', maxLength: 11, upper: true },
  policyNo: { label: f.policyNo, placeholder: f.policyNoPlaceholder, maxLength: DOCUMENT_NUMBER_MAX_LENGTH, upper: true },
  insurer: { label: f.insurer, placeholder: f.insurerPlaceholder, maxLength: INSURER_MAX_LENGTH, upper: false },
  certificateNo: { label: f.certificateNo, placeholder: f.certificateNoPlaceholder, maxLength: DOCUMENT_NUMBER_MAX_LENGTH, upper: true },
  fastagId: { label: f.fastagId, placeholder: f.fastagIdPlaceholder, maxLength: DOCUMENT_NUMBER_MAX_LENGTH, upper: true },
};
const EXPIRY_LABEL: Partial<Record<DocumentKey, string>> = { insurance: f.insuranceExpiry, pollution: f.pucExpiry };

export type DocumentDetailsSheetProps = {
  visible: boolean;
  documentKey: DocumentKey;
  initialValues: DocumentFieldValues;
  onSave: (fields: DocumentFieldValues) => void;
  onClose: () => void;
  testID?: string;
};

/** "Add Manually": the document's required fields only (web-documents-findings.md), all required. */
export default function DocumentDetailsSheet({
  visible,
  documentKey,
  initialValues,
  onSave,
  onClose,
  testID,
}: DocumentDetailsSheetProps) {
  const [values, setValues] = useState<DocumentFieldValues>(initialValues);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    if (visible) {
      setValues(initialValues);
      setSubmitted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset each time the sheet opens
  }, [visible]);

  const fields = DOCUMENT_FORM_FIELDS[documentKey];
  const missing = (k: DocumentField) => submitted && !(k === 'expiry' ? values.expiry : values[k]?.trim());

  return (
    <BottomSheet testID={testID} visible={visible} onClose={onClose} title={d.detailsTitle(d.cards[documentKey].title)}>
      <View style={styles.body}>
        {fields.map((k, i) =>
          k === 'expiry' ? (
            <DateField
              key={k}
              testID={`${testID}-expiry`}
              style={i > 0 ? styles.field : undefined}
              label={EXPIRY_LABEL[documentKey] ?? f.pucExpiry}
              value={values.expiry ?? null}
              onChange={iso => setValues(v => ({ ...v, expiry: iso }))}
              error={missing(k) ? f.required : undefined}
            />
          ) : (
            <TextField
              key={k}
              testID={`${testID}-${k}`}
              variant="light"
              style={i > 0 ? styles.field : undefined}
              label={TEXT_FIELDS[k].label}
              placeholder={TEXT_FIELDS[k].placeholder}
              value={values[k] ?? ''}
              onChangeText={text => setValues(v => ({ ...v, [k]: TEXT_FIELDS[k].upper ? text.toUpperCase() : text }))}
              autoCapitalize={TEXT_FIELDS[k].upper ? 'characters' : 'words'}
              autoCorrect={false}
              maxLength={TEXT_FIELDS[k].maxLength}
              returnKeyType="done"
              error={missing(k) ? f.required : undefined}
            />
          ),
        )}
        <PrimaryButton
          testID={`${testID}-save`}
          style={styles.save}
          label={f.save}
          labelVariant="buttonStrong"
          showArrow={false}
          onPress={() => {
            setSubmitted(true);
            if (isFormComplete(documentKey, values)) {
              const trimmed = Object.fromEntries(
                Object.entries(values).map(([key, v]) => [key, typeof v === 'string' ? v.trim() : v]),
              ) as DocumentFieldValues;
              onSave(trimmed);
            }
          }}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: 8, paddingBottom: 16 },
  field: { marginTop: 20 },
  save: { marginTop: 28 },
});
