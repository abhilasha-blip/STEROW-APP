import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import CheckCircle from '@/assets/icons/check-circle.svg';
import AppText from '@/components/AppText';
import BottomSheet from '@/components/BottomSheet';
import DateField from '@/components/DateField';
import PrimaryButton from '@/components/PrimaryButton';
import TextField from '@/components/TextField';
import { DOCUMENT_NUMBER_MAX_LENGTH } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import {
  AUTOFILL_FIELDS,
  type AutofillDocType,
  type AutofillField,
  type AutofillValues,
} from '@/utils/documentAutofill';

const a = strings.autofill;

export type AutofillReviewSheetProps = {
  visible: boolean;
  docType: AutofillDocType;
  /** Pre-filled values (read from the document, merged into what was there). */
  values: AutofillValues;
  /** Fields read from the document: marked "Auto-filled – please check". */
  filled: readonly AutofillField[];
  onConfirm: (values: AutofillValues) => void;
  onClose: () => void;
  testID?: string;
};

/**
 * "Check the details": the document's fields pre-filled from the upload, each editable; the ones read
 * from the document are marked "Auto-filled – please check". Confirm hands them back (the card / form
 * saves them with the rest, as typed details).
 */
export default function AutofillReviewSheet({
  visible,
  docType,
  values: initial,
  filled,
  onConfirm,
  onClose,
  testID = `autofill-${docType}`,
}: AutofillReviewSheetProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [values, setValues] = useState<AutofillValues>(initial);
  useEffect(() => {
    if (visible) {
      setValues(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset each time the sheet opens
  }, [visible]);

  const set = (k: AutofillField, v: string) => setValues(prev => ({ ...prev, [k]: v }));

  return (
    <BottomSheet testID={testID} visible={visible} onClose={onClose} title={a.title} scrollableContent>
      <View style={styles.body}>
        <AppText variant="hint" color="text.onLightMuted">
          {a.subtitle}
        </AppText>
        {AUTOFILL_FIELDS[docType].map(({ key, kind, upper }) => {
          const auto = filled.includes(key);
          return (
            <View key={key} style={styles.field}>
              {kind === 'date' ? (
                <DateField
                  testID={`${testID}-${key}`}
                  label={a.fields[key]}
                  value={values[key] || null}
                  onChange={iso => set(key, iso)}
                />
              ) : (
                <TextField
                  testID={`${testID}-${key}`}
                  variant="light"
                  label={a.fields[key]}
                  value={values[key] ?? ''}
                  onChangeText={v => set(key, upper ? v.toUpperCase() : v)}
                  autoCapitalize={upper ? 'characters' : 'words'}
                  autoCorrect={false}
                  maxLength={DOCUMENT_NUMBER_MAX_LENGTH}
                  returnKeyType="done"
                />
              )}
              {auto && (
                <View testID={`${testID}-${key}-auto`} style={styles.autoChip} accessibilityLabel={`${a.fields[key]}: ${a.autoFilled}`}>
                  <CheckCircle width={12} height={12} color={colors.documents.autofillHint} />
                  <AppText variant="tinyStrong" color="documents.autofillHint">
                    {a.autoFilled}
                  </AppText>
                </View>
              )}
            </View>
          );
        })}
        <PrimaryButton
          testID={`${testID}-confirm`}
          style={styles.confirm}
          label={a.confirm}
          labelVariant="buttonStrong"
          showArrow={false}
          onPress={() =>
            onConfirm(Object.fromEntries(Object.entries(values).map(([k, v]) => [k, (v ?? '').trim()])) as AutofillValues)
          }
        />
      </View>
    </BottomSheet>
  );
}

const makeStyles = ({ colors, radius, spacing }: Theme) =>
  StyleSheet.create({
    body: { paddingTop: spacing.xs, paddingBottom: spacing.lg },
    field: { marginTop: 18 },
    autoChip: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginTop: 6,
      marginLeft: 12,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.documents.autofillHintBackground,
    },
    confirm: { marginTop: 28 },
  });
